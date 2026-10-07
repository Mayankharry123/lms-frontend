import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import PageBackHeader from '../../components/ui/PageBackHeader';
import SelectDropdown from '../../components/ui/SelectDropdown';
import { ROUTES } from '../../constants';
import { getBrand, listBrands } from '../../services/BrandMaster';
import type { BrandItem } from '../../services/BrandMaster';
import { createMockProformaInvoice } from '../../services/ProformaInvoices';
import SweetAlert from '../../utils/SweetAlert';
import { extractErrorMessage } from '../../utils/extractErrorMessage';

type OrderLine = {
  key: string;
  order: string;
  hsnSac: string;
  city: string;
  qty: string;
  rate: string;
  amount: string;
};

type TaxDetails = {
  sgst: string;
  cgst: string;
  igst: string;
};

type BrandDetails = {
  gstNumber: string;
  address: string;
};

const inputClass =
  'h-10 w-full min-w-[88px] rounded-md border border-[#DDE1E7] bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#f26222] focus:ring-2 focus:ring-orange-100';
const readOnlyClass =
  'min-h-10 w-full rounded-md border border-[#DDE1E7] bg-gray-50 px-3 py-2 text-sm text-gray-700';

const blankLine = (): OrderLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  order: '',
  hsnSac: '',
  city: '',
  qty: '',
  rate: '',
  amount: '',
});

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({
  children,
  required,
}) => (
  <label className="mb-1.5 block text-sm font-medium text-gray-700">
    {children}
    {required ? <span className="text-[#FF0000]"> *</span> : null}
  </label>
);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asText = (value: unknown): string => {
  const record = asRecord(value);
  if (record) {
    return String(record.name ?? record.address ?? record.value ?? '').trim();
  }
  return value == null ? '' : String(value).trim();
};

const firstValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key];
    }
  }
  return undefined;
};

const readBrandDetails = (brand: BrandItem): BrandDetails => {
  const raw = brand as Record<string, unknown>;
  const rawAddress = firstValue(raw, [
    'address',
    'registered_address',
    'registeredAddress',
    'address_line',
    'addressLine',
    'address1',
  ]);
  const addressRecord = asRecord(rawAddress);
  const addressParts = addressRecord
    ? [
        addressRecord.address_line ?? addressRecord.address_line_1 ?? addressRecord.address,
        addressRecord.address_line_2 ?? addressRecord.street,
        addressRecord.city,
        addressRecord.state,
        addressRecord.country,
        addressRecord.pin_code ?? addressRecord.postal_code,
      ].map(asText)
    : [
        asText(rawAddress),
        asText(raw.city),
        asText(raw.state),
        asText(raw.country),
        asText(raw.pin_code ?? raw.postal_code ?? raw.postalCode ?? brand.pinCode),
      ];

  const gstNumbers = firstValue(raw, [
    'gst_numbers',
    'gstNumbers',
    'gst_number',
    'gst_no',
    'gstNumber',
    'gstNo',
  ]);
  const gstNumber = Array.isArray(gstNumbers)
    ? gstNumbers.map(asText).filter(Boolean).join(', ')
    : asText(gstNumbers);

  return {
    gstNumber,
    address: Array.from(new Set(addressParts)).join(', '),
  };
};

const toNumber = (value: string) => Number(value.replace(/,/g, '').trim());
const CreateProformaInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [brandDetails, setBrandDetails] = useState<BrandDetails | null>(null);
  const [brandDetailsLoading, setBrandDetailsLoading] = useState(false);
  const [brandDetailsError, setBrandDetailsError] = useState<string | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([blankLine()]);
  const [taxDetails, setTaxDetails] = useState<TaxDetails>({
    sgst: '',
    cgst: '',
    igst: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loadedBrands: BrandItem[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await listBrands(page, 1000);
        loadedBrands.push(...response.data);
        lastPage = Number(response.meta?.pagination?.last_page) || 1;
        page += 1;
      } while (page <= lastPage);
      return loadedBrands;
    })()
      .then((loadedBrands) => {
        if (!mounted) return;
        setBrands(loadedBrands);
        setBrandsError(loadedBrands.length ? null : 'No brands found.');
      })
      .catch((error: unknown) => {
        console.error('Failed to load brands for Proforma Invoice', error);
        if (mounted) {
          setBrands([]);
          setBrandsError('Failed to load brands.');
        }
      })
      .finally(() => {
        if (mounted) setBrandsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setBrandDetails(null);
    setBrandDetailsError(null);
    if (!selectedBrandId) {
      setBrandDetailsLoading(false);
      return;
    }

    let mounted = true;
    setBrandDetailsLoading(true);
    getBrand(selectedBrandId)
      .then((brand) => {
        if (mounted) setBrandDetails(readBrandDetails(brand));
      })
      .catch((error: unknown) => {
        console.error(`Failed to load brand details for ${selectedBrandId}`, error);
        if (mounted) setBrandDetailsError('Failed to load selected brand details.');
      })
      .finally(() => {
        if (mounted) setBrandDetailsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedBrandId]);

  const updateLine = (key: string, field: keyof Omit<OrderLine, 'key'>, value: string) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, [field]: value } : line))
    );
  };

  const removeLine = (key: string) => {
    setLines((current) =>
      current.length <= 1 ? current : current.filter((line) => line.key !== key)
    );
  };

  const updateTaxDetail = (field: keyof TaxDetails, value: string) => {
    if (value.startsWith('-')) return;
    setTaxDetails((current) => ({ ...current, [field]: value }));
  };

  const subtotal = useMemo(
    () =>
      lines.reduce((total, line) => {
        const amount = toNumber(line.amount);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [lines]
  );
  const taxAmounts = useMemo(
    () => ({
      sgst: (subtotal * Number(taxDetails.sgst || 0)) / 100,
      cgst: (subtotal * Number(taxDetails.cgst || 0)) / 100,
      igst: (subtotal * Number(taxDetails.igst || 0)) / 100,
    }),
    [subtotal, taxDetails]
  );
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null;

  const validate = (): string | null => {
    if (!selectedBrand) return 'Please select a brand.';
    if (!brandDetails) return 'Please wait for the selected brand details to load.';

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const rowLabel = `Row ${i + 1}`;
      for (const [label, value] of [
        ['Slot', line.qty],
        ['Rate', line.rate],
      ] as const) {
        if (!value.trim()) continue;
        const number = toNumber(value);
        if (!Number.isFinite(number) || number < 0) {
          return `${rowLabel}: ${label} must be a non-negative number.`;
        }
      }
      const amount = toNumber(line.amount);
      if (!line.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
        return `${rowLabel}: Amount must be a number greater than 0.`;
      }
    }

    const labelMap: Record<keyof TaxDetails, string> = {
      sgst: 'SGST (%)',
      cgst: 'CGST (%)',
      igst: 'IGST (%)',
    };
    for (const [field, rawValue] of Object.entries(taxDetails) as Array<
      [keyof TaxDetails, string]
    >) {
      if (!rawValue.trim()) continue;
      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
        return `${labelMap[field]} must be between 0 and 100.`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;
    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      createMockProformaInvoice({
        brandId: selectedBrand!.id,
        brandName: selectedBrand!.name,
        gstNumber: brandDetails!.gstNumber,
        address: brandDetails!.address,
        orderDetails: lines.map((line) => ({
          order: line.order.trim(),
          hsnSac: line.hsnSac.trim(),
          city: line.city.trim(),
          qty: line.qty.trim() ? toNumber(line.qty) : 0,
          rate: line.rate.trim() ? toNumber(line.rate) : 0,
          amount: toNumber(line.amount),
        })),
        subTotalAmount: subtotal,
        ...taxAmounts,
      });
      await SweetAlert.showSubmitSuccess({
        text: 'Proforma Invoice created successfully',
      });
      navigate(ROUTES.PROFORMA_INVOICES);
    } catch (error) {
      const message = extractErrorMessage(error) || 'Failed to create Proforma Invoice.';
      setSubmitError(message);
      SweetAlert.showError(message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <PageBackHeader
        onBack={() => navigate(ROUTES.PROFORMA_INVOICES)}
      />

      <div className="space-y-5">
        <section className="relative z-20 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Create Proforma Invoice</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Create a Proforma Invoice for the selected brand
            </p>
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900">Brand Details</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Brand Name</FieldLabel>
                <SelectDropdown
                  name="brand"
                  value={selectedBrandId}
                  placeholder={brandsLoading ? 'Loading brands...' : 'Select Brand'}
                  options={brands.map((brand) => ({
                    value: brand.id,
                    label: brand.name,
                  }))}
                  disabled={brandsLoading || brands.length === 0}
                  menuMaxHeight={280}
                  onChange={(value) => setSelectedBrandId(String(value))}
                />
                {brandsError ? (
                  <p className="mt-2 text-sm text-red-600">{brandsError}</p>
                ) : null}
              </div>
              <div>
                <FieldLabel>GST No.</FieldLabel>
                <input
                  className={readOnlyClass}
                  value={
                    brandDetailsLoading
                      ? 'Loading...'
                      : brandDetails?.gstNumber || ''
                  }
                  readOnly
                  placeholder="Filled after brand selection"
                  aria-readonly="true"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Address</FieldLabel>
                <textarea
                  className={`${readOnlyClass} min-h-10 resize-y`}
                  rows={2}
                  value={
                    brandDetailsLoading
                      ? 'Loading...'
                      : brandDetails?.address || ''
                  }
                  readOnly
                  placeholder="Filled after brand selection"
                  aria-readonly="true"
                />
                {brandDetailsError ? (
                  <p className="mt-2 text-sm text-red-600">{brandDetailsError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="btn-primary !text-white"
              onClick={() => setLines((current) => [...current, blankLine()])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Row
            </Button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Order', 'HSN/SAC', 'City', 'Slot', 'Rate (Rs.)', 'Amount (Rs.)', 'Action'].map(
                      (header) => (
                        <th
                          key={header}
                          className={`border-b border-gray-200 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#007b83] ${
                            header === 'Action' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.key}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={`${inputClass} min-w-[240px]`}
                          placeholder="Towards the Cost of Media Display Charges"
                          value={line.order}
                          onChange={(event) => updateLine(line.key, 'order', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={inputClass}
                          placeholder="HSN/SAC"
                          value={line.hsnSac}
                          onChange={(event) => updateLine(line.key, 'hsnSac', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={inputClass}
                          placeholder="City"
                          value={line.city}
                          onChange={(event) => updateLine(line.key, 'city', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={`${inputClass} min-w-[72px]`}
                          placeholder="0"
                          inputMode="decimal"
                          value={line.qty}
                          onChange={(event) => updateLine(line.key, 'qty', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={`${inputClass} min-w-[96px]`}
                          placeholder="0.00"
                          inputMode="decimal"
                          value={line.rate}
                          onChange={(event) => updateLine(line.key, 'rate', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={`${inputClass} min-w-[110px]`}
                          placeholder="0.00"
                          inputMode="decimal"
                          value={line.amount}
                          onChange={(event) => updateLine(line.key, 'amount', event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 text-center align-middle">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length <= 1}
                          title={lines.length <= 1 ? 'At least one order row is required' : 'Delete row'}
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Tax Details</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { key: 'sgst', label: 'SGST (%)', placeholder: 'Enter SGST %' },
                { key: 'cgst', label: 'CGST (%)', placeholder: 'Enter CGST %' },
                { key: 'igst', label: 'IGST (%)', placeholder: 'Enter IGST %' },
              ].map((field) => (
                <div key={field.key}>
                  <FieldLabel>{field.label}</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={inputClass}
                    placeholder={field.placeholder}
                    value={taxDetails[field.key as keyof TaxDetails]}
                    onChange={(event) =>
                      updateTaxDetail(field.key as keyof TaxDetails, event.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-col items-end gap-2 border-t border-gray-200 pt-4">
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          <div className="flex w-full justify-end gap-3 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="min-w-[120px]"
              onClick={() => navigate(ROUTES.PROFORMA_INVOICES)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="btn-primary min-w-[190px] !text-white"
              onClick={handleSubmit}
              disabled={submitting || brandsLoading || brandDetailsLoading}
              loading={submitting}
            >
              {submitting ? 'Creating...' : 'Create Proforma Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProformaInvoice;

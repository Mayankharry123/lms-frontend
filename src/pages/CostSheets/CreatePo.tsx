/**
 * @file CreatePo.tsx
 * @description Create a purchase order from a selected cost sheet.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import MasterHeader from '../../components/ui/MasterHeader';
import SelectDropdown from '../../components/ui/SelectDropdown';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../constants';
import { getPublisherById, listPublishers, type PublisherDetail, type PublisherOption } from '../../services/Publishers';
import { createPurchaseOrder } from '../../services/PurchaseOrders';
import { downloadFileFromUrl, fileBaseName } from '../../utils/downloadFile';
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

const inputClass =
  'h-10 w-full min-w-[88px] rounded-md border border-[#DDE1E7] bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#f26222] focus:ring-2 focus:ring-orange-100';
const readOnlyClass =
  'h-11 w-full rounded-lg border border-[#DDE1E7] bg-gray-50 px-3 text-sm font-medium text-gray-800';

const blankLine = (): OrderLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  order: '',
  hsnSac: '',
  city: '',
  qty: '',
  rate: '',
  amount: '',
});

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="mb-1.5 block text-sm font-medium text-gray-700">
    {children}
    {required ? <span className="text-[#FF0000]"> *</span> : null}
  </label>
);

const InfoTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
    <div className="min-w-[132px] text-sm font-semibold text-gray-900">{label}</div>
    <div className="text-sm text-gray-600">{value || '-'}</div>
  </div>
);

const toNumber = (value: string) => Number(value.replace(/,/g, '').trim());

const CreatePo: React.FC = () => {
  const navigate = useNavigate();
  const { costSheetId = '' } = useParams<{ costSheetId: string }>();
  const displayId = decodeURIComponent(costSheetId);

  const [publishers, setPublishers] = useState<PublisherOption[]>([]);
  const [publisherSearch, setPublisherSearch] = useState('');
  const [publishersLoading, setPublishersLoading] = useState(true);
  const [publishersError, setPublishersError] = useState<string | null>(null);
  const [selectedPublisherId, setSelectedPublisherId] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [publisher, setPublisher] = useState<PublisherDetail | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([blankLine()]);
  const [taxDetails, setTaxDetails] = useState<TaxDetails>({ sgst: '', cgst: '', igst: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(async () => {
      setPublishersLoading(true);
      try {
        const data = await listPublishers(publisherSearch);
        if (!mounted) return;
        setPublishers(data);
        setPublishersError(data.length ? null : 'No publishers found.');
      } catch (err) {
        console.error('Failed to load publishers', err);
        if (mounted) setPublishersError('Failed to load publishers.');
      } finally {
        if (mounted) setPublishersLoading(false);
      }
    }, 300);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [publisherSearch]);

  useEffect(() => {
    setSelectedAddressId('');
    if (!selectedPublisherId) {
      setPublisher(null);
      setDetailError(null);
      return;
    }

    let mounted = true;
    setDetailLoading(true);
    setDetailError(null);
    getPublisherById(selectedPublisherId)
      .then((detail) => {
        if (!mounted) return;
        setPublisher(detail);
        setSelectedAddressId(detail.addresses[0]?.id ?? '');
      })
      .catch((err) => {
        console.error('Failed to load publisher details', err);
        if (!mounted) return;
        setPublisher(null);
        setDetailError('Failed to load publisher details.');
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedPublisherId]);

  const updateLine = (key: string, field: keyof Omit<OrderLine, 'key'>, value: string) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  };

  const removeLine = (key: string) => {
    setLines((current) => (current.length <= 1 ? current : current.filter((line) => line.key !== key)));
  };

  const updateTaxDetail = (field: keyof TaxDetails, value: string) => {
    if (value.startsWith('-')) return;
    setTaxDetails((current) => ({ ...current, [field]: value }));
  };

  const addresses = publisher?.addresses ?? [];
  const selectedAddress = addresses.find((item) => item.id === selectedAddressId) ?? null;

  const validate = (): string | null => {
    if (!displayId) return 'Cost Sheet ID is missing.';
    if (!publisher?.id) return 'Please select a publisher.';
    if (addresses.length > 0 && !selectedAddress) return 'Please select an address.';
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

    for (const [field, rawValue] of Object.entries(taxDetails) as Array<[keyof TaxDetails, string]>) {
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

    const parsedTax = {
      sgst: Number(taxDetails.sgst || 0),
      cgst: Number(taxDetails.cgst || 0),
      igst: Number(taxDetails.igst || 0),
    };

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createPurchaseOrder({
        financeRecordId: displayId,
        publisherId: publisher!.id,
        ...(selectedAddress && !selectedAddress.id.startsWith('address-')
          ? { publisherAddressId: selectedAddress.id }
          : {}),
        ...parsedTax,
        orders: lines.map((line) => ({
          description: line.order.trim(),
          hsnSac: line.hsnSac.trim(),
          city: line.city.trim(),
          qty: line.qty.trim() ? toNumber(line.qty) : 0,
          rate: line.rate.trim() ? toNumber(line.rate) : 0,
          amount: toNumber(line.amount),
        })),
      });
      if (result.pdf_url) {
        try {
          await downloadFileFromUrl(result.pdf_url, fileBaseName(result.pdf_url));
        } catch (downloadError) {
          console.error('Failed to download purchase order PDF', downloadError);
          SweetAlert.showError('Purchase order was created, but the PDF could not be downloaded.');
        }
      }
      await SweetAlert.showSubmitSuccess({ text: 'Purchase order created successfully' });
      navigate(ROUTES.COST_SHEETS);
    } catch (err) {
      const message = extractErrorMessage(err) || 'Failed to create purchase order.';
      setSubmitError(message);
      SweetAlert.showError(message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const publisherFields = publisher
    ? [
        { label: 'Publisher Name', value: publisher.name },
        { label: 'Company Name', value: publisher.companyName },
        { label: 'Primary Email', value: publisher.primaryEmail },
        { label: 'GST Number', value: publisher.bank.gstNumber },
        { label: 'PAN Number', value: publisher.bank.panNumber },
        { label: 'Account Holder', value: publisher.bank.accountHolderName },
        { label: 'Account Number', value: publisher.bank.accountNumber },
        { label: 'IFSC Code', value: publisher.bank.ifscCode },
        { label: 'Bank Name', value: publisher.bank.bankName },
      ]
    : [];

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterHeader
        onCreateClick={() => undefined}
        showBreadcrumb
        showCreateButton={false}
      />

      <div className="space-y-5">
        <section className="relative z-20 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Create PO</h2>
              <p className="mt-0.5 text-sm text-gray-500">Purchase order for the selected cost sheet</p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Cost Sheet ID</span>
              <span className="text-sm font-semibold text-[#f26222]">{displayId || '-'}</span>
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-900">Publisher Details</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Publisher Name</FieldLabel>
                <SelectDropdown
                  name="publisher"
                  value={selectedPublisherId}
                  placeholder={publishersLoading ? 'Loading publishers...' : 'Select Publisher'}
                  options={publishers.map((item) => ({ value: item.id, label: item.name }))}
                  disabled={publishersLoading && publishers.length === 0}
                  onSearch={setPublisherSearch}
                  menuMaxHeight={280}
                  onChange={(value) => setSelectedPublisherId(String(value))}
                />
              </div>
              <div>
                <FieldLabel>Publisher ID</FieldLabel>
                <input
                  className={readOnlyClass}
                  value={detailLoading ? 'Loading...' : publisher?.id || ''}
                  readOnly
                  placeholder="Filled after publisher selection"
                  aria-readonly="true"
                />
              </div>
            </div>

            {publishersError ? <p className="mt-3 text-sm text-red-600">{publishersError}</p> : null}
            {detailError ? <p className="mt-3 text-sm text-red-600">{detailError}</p> : null}

            {publisher ? (
              <div className="mt-5 space-y-5 border-t border-gray-100 pt-5">
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">Publisher Information</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {publisherFields.map((field) => (
                      <InfoTile key={field.label} label={field.label} value={field.value || '-'} />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">Address</h4>
                  {addresses.length > 0 ? (
                    <>
                      <div className="mb-3 md:w-1/2 md:pr-1.5">
                        <FieldLabel>Select Address</FieldLabel>
                        <SelectDropdown
                          name="publisher_address"
                          value={selectedAddressId}
                          placeholder="Select Address"
                          options={addresses.map((item) => ({
                            value: item.id,
                            label: item.address || [item.city, item.state].filter(Boolean).join(', ') || `Address ${item.id}`,
                          }))}
                          menuMaxHeight={240}
                          onChange={(value) => setSelectedAddressId(String(value))}
                        />
                      </div>
                      {selectedAddress ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <InfoTile label="Address" value={selectedAddress.address} />
                          <InfoTile label="City" value={selectedAddress.city} />
                          <InfoTile label="State" value={selectedAddress.state} />
                          <InfoTile label="Country" value={selectedAddress.country} />
                          <InfoTile label="Pincode" value={selectedAddress.pincode} />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      No address available for this publisher.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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
                    {['Order', 'HSN/SAC', 'City', 'Slot', 'Rate (Rs.)', 'Amount (Rs.)', 'Action'].map((header) => (
                      <th
                        key={header}
                        className={`border-b border-gray-200 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#007b83] ${
                          header === 'Action' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b border-gray-100 last:border-b-0 hover:bg-slate-50/70">
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
                    onChange={(event) => updateTaxDetail(field.key as keyof TaxDetails, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-col items-end gap-2 border-t border-gray-200 pt-4">
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          <Button
            type="button"
            variant="primary"
            size="md"
            className="btn-primary min-w-[140px] !text-white"
            onClick={handleSubmit}
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePo;

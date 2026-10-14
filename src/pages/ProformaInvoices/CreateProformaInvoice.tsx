import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Building2,
  Calculator,
  ChevronDown,
  FileText,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import type { RootState } from '../../redux/store';
import Button from '../../components/ui/Button';
import PageBackHeader from '../../components/ui/PageBackHeader';
import SelectDropdown from '../../components/ui/SelectDropdown';
import { ROUTES } from '../../constants';
import { getBrand, listBrands } from '../../services/BrandMaster';
import type { BrandItem } from '../../services/BrandMaster';
import {
  getClientPurchaseOrderLookups,
  getFinanceUsersForBrief,
  type BriefOptionItem,
  type PlanOption,
} from '../../services/ClientPurchaseOrders';
import { createProformaInvoice } from '../../services/ProformaInvoices';
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
const readOnlyInputClass =
  'h-10 w-full rounded-md border border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-700 outline-none cursor-not-allowed select-none';

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className="relative">
    <select {...props} className={`${inputClass} appearance-none pr-10 ${className}`}>
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      aria-hidden
    />
  </div>
);

const blankLine = (): OrderLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  order: '',
  hsnSac: '',
  city: '',
  qty: '',
  rate: '',
  amount: '',
});

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean; htmlFor?: string }> = ({
  children,
  required,
  htmlFor,
}) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
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

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const loggedInUserName =
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.username ||
    'Mayank Sharma';

  const [briefOptions, setBriefOptions] = useState<BriefOptionItem[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Basic Details State
  const [selectedBriefId, setSelectedBriefId] = useState('');
  const [briefName, setBriefName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plannerName, setPlannerName] = useState('');
  const [assignBy, setAssignBy] = useState(String(loggedInUserName));
  const [financeUser, setFinanceUser] = useState('');
  const [financeUserOptions, setFinanceUserOptions] = useState<string[]>([]);

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

  // 1. Initial lookups load (Briefs and Brands)
  useEffect(() => {
    let mounted = true;
    getClientPurchaseOrderLookups()
      .then((briefs) => {
        if (!mounted) return;
        setBriefOptions(briefs);
        setLoadingLookups(false);
      })
      .catch((err) => {
        console.error('Failed to load Brief lookups for Proforma Invoice:', err);
        if (mounted) {
          setBriefOptions([]);
          setLoadingLookups(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Update assignBy when user loads
  useEffect(() => {
    if (loggedInUserName) {
      setAssignBy(String(loggedInUserName));
    }
  }, [loggedInUserName]);

  // When Brief is selected
  useEffect(() => {
    if (!selectedBriefId) {
      setBriefName('');
      setSelectedPlanId('');
      setPlannerName('');
      setFinanceUserOptions([]);
      return;
    }

    const matchedBrief = briefOptions.find(
      (b) => b.briefId.toLowerCase() === selectedBriefId.toLowerCase()
    );

    if (matchedBrief) {
      setBriefName(matchedBrief.briefName);
      setSelectedPlanId('');
      setPlannerName('');

      getFinanceUsersForBrief(matchedBrief.briefId).then((users) => {
        setFinanceUserOptions(users);
      });
    }
  }, [selectedBriefId, briefOptions]);

  // When Plan is selected
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) {
      setPlannerName('');
      return;
    }

    const matchedBrief = briefOptions.find((b) => b.briefId === selectedBriefId);
    const matchedPlan = matchedBrief?.plans.find((p) => p.planId === planId);
    if (matchedPlan) {
      setPlannerName(matchedPlan.plannerName);
    } else {
      setPlannerName('');
    }
  };

  const currentBrief = briefOptions.find((b) => b.briefId === selectedBriefId);
  const currentPlans: PlanOption[] = currentBrief?.plans || [];

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
      current.map((line) => {
        if (line.key !== key) return line;
        const updated = { ...line, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const rawQty = field === 'qty' ? value : line.qty;
          const rawRate = field === 'rate' ? value : line.rate;
          const q = toNumber(rawQty);
          const r = toNumber(rawRate);
          if (rawQty.trim() !== '' && rawRate.trim() !== '' && Number.isFinite(q) && Number.isFinite(r)) {
            updated.amount = (q * r).toFixed(2);
          }
        }
        return updated;
      })
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

  const totalSlots = lines.reduce((sum, line) => {
    const val = toNumber(line.qty);
    return sum + (Number.isFinite(val) && val > 0 ? val : 0);
  }, 0);

  const sgstPercent = Number(taxDetails.sgst) || 0;
  const cgstPercent = Number(taxDetails.cgst) || 0;
  const igstPercent = Number(taxDetails.igst) || 0;

  const sgstAmount = (subtotal * sgstPercent) / 100;
  const cgstAmount = (subtotal * cgstPercent) / 100;
  const igstAmount = (subtotal * igstPercent) / 100;
  const totalTax = sgstAmount + cgstAmount + igstAmount;
  const grandTotal = subtotal + totalTax;
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null;

  const validate = (): string | null => {
    if (!selectedBriefId) return 'Please select a Brief Id.';
    if (!selectedPlanId) return 'Please select a Plan Id.';
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
      await createProformaInvoice({
        brandId: selectedBrand!.id,
        brandName: selectedBrand!.name,
        gstNumber: brandDetails!.gstNumber,
        address: brandDetails!.address,
        briefId: selectedBriefId,
        briefName: briefName,
        planId: selectedPlanId,
        plannerName: plannerName,
        assignBy: assignBy,
        financeUser: financeUser,
        orderDetails: lines.map((line) => ({
          order: line.order.trim(),
          hsnSac: line.hsnSac.trim(),
          city: line.city.trim(),
          qty: line.qty.trim() ? toNumber(line.qty) : 0,
          rate: line.rate.trim() ? toNumber(line.rate) : 0,
          amount: toNumber(line.amount),
        })),
        subTotalAmount: subtotal,
        igstRate: Number(taxDetails.igst || 0),
        cgstRate: Number(taxDetails.cgst || 0),
        sgstRate: Number(taxDetails.sgst || 0),
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
        title="Create Proforma Invoice"
        backLabel="Go Back"
      />

      <div className="space-y-5">
        {/* Section: Basic Details */}
        <section className="relative z-30 overflow-visible rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#f26222] ring-1 ring-orange-200/60">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
                <p className="text-xs text-gray-500">
                  Select Brief and Plan to link the Proforma Invoice to planning workflows
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Brief Id (Searchable Dropdown) */}
              <div>
                <FieldLabel htmlFor="brief-id" required>Brief Id</FieldLabel>
                <FormSelect
                  id="brief-id"
                  value={selectedBriefId}
                  onChange={(e) => setSelectedBriefId(e.target.value)}
                  required
                  disabled={loadingLookups}
                >
                  <option value="">
                    {loadingLookups ? 'Loading briefs...' : 'Select Brief Id'}
                  </option>
                  {briefOptions.map((brief) => (
                    <option key={brief.briefId} value={brief.briefId}>
                      #{brief.briefId} - {brief.briefName}
                    </option>
                  ))}
                </FormSelect>
              </div>

              {/* Brief Name (Auto-populated, Read-Only) */}
              <div>
                <FieldLabel htmlFor="brief-name">
                  Brief Name
                  <span className="ml-1.5 text-xs font-normal text-gray-500">(Auto Populated)</span>
                </FieldLabel>
                <input
                  id="brief-name"
                  value={briefName}
                  readOnly
                  placeholder="Auto-populated from selected Brief"
                  className={readOnlyInputClass}
                />
              </div>

              {/* Plan Id (Filtered by selected brief) */}
              <div>
                <FieldLabel htmlFor="plan-id" required>Plan Id</FieldLabel>
                <FormSelect
                  id="plan-id"
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  required
                  disabled={!selectedBriefId || currentPlans.length === 0}
                >
                  <option value="">
                    {!selectedBriefId
                      ? 'Select a Brief first'
                      : currentPlans.length === 0
                      ? 'No plans available for this brief'
                      : 'Select Plan Id'}
                  </option>
                  {currentPlans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      #{plan.planId} ({plan.plannerName})
                    </option>
                  ))}
                </FormSelect>
              </div>

              {/* Planner Name (Auto-populated from selected plan, Read-Only) */}
              <div>
                <FieldLabel htmlFor="planner-name">
                  Planner Name
                  <span className="ml-1.5 text-xs font-normal text-gray-500">(Auto Populated)</span>
                </FieldLabel>
                <input
                  id="planner-name"
                  value={plannerName}
                  readOnly
                  placeholder="Auto-populated from selected Plan"
                  className={readOnlyInputClass}
                />
              </div>

              {/* Assign By (Populated according to existing assignment workflow) */}
              <div>
                <FieldLabel htmlFor="assign-by">
                  Assign By
                  <span className="ml-1.5 text-xs font-normal text-gray-500">(System User)</span>
                </FieldLabel>
                <input
                  id="assign-by"
                  value={assignBy}
                  readOnly
                  className={readOnlyInputClass}
                  title="Current authenticated user"
                />
              </div>

              {/* Finance User (Selectable from available finance team) */}
              <div>
                <FieldLabel htmlFor="finance-user">Finance User</FieldLabel>
                <FormSelect
                  id="finance-user"
                  value={financeUser}
                  onChange={(e) => setFinanceUser(e.target.value)}
                >
                  <option value="">Select Finance User (or leave unassigned)</option>
                  {financeUserOptions.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                  {financeUser && !financeUserOptions.includes(financeUser) ? (
                    <option value={financeUser}>{financeUser}</option>
                  ) : null}
                </FormSelect>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Brand Details */}
        <section className="relative z-20 overflow-visible rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#f26222] ring-1 ring-orange-200/60">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Brand Details</h2>
                <p className="text-xs text-gray-500">
                  Select a brand to automatically load registered GST and billing address
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        {/* Section: Order Details */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#f26222] ring-1 ring-orange-200/60">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">Order Details</h2>
                  <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#f26222] ring-1 ring-orange-200/60">
                    {lines.length} {lines.length === 1 ? 'Row' : 'Rows'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Itemized breakdown of services, media display charges, slots, and rates
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              className="btn-primary !text-white w-full sm:w-auto"
              onClick={() => setLines((current) => [...current, blankLine()])}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add Row
            </Button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Order Description
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 w-36">
                      HSN/SAC
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 w-36">
                      City
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 w-28">
                      Slot
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 w-36">
                      Rate (Rs.)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 w-40">
                      Amount (Rs.)
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-700 w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={line.key}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          className={`${inputClass} min-w-[240px]`}
                          placeholder="Towards the Cost of Media Display Charges"
                          value={line.order}
                          onChange={(e) => updateLine(line.key, 'order', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          className={inputClass}
                          placeholder="HSN/SAC"
                          value={line.hsnSac}
                          onChange={(e) => updateLine(line.key, 'hsnSac', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          className={inputClass}
                          placeholder="City"
                          value={line.city}
                          onChange={(e) => updateLine(line.key, 'city', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          className={`${inputClass} min-w-[72px]`}
                          placeholder="0"
                          inputMode="decimal"
                          value={line.qty}
                          onChange={(e) => updateLine(line.key, 'qty', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          className={`${inputClass} min-w-[96px]`}
                          placeholder="0.00"
                          inputMode="decimal"
                          value={line.rate}
                          onChange={(e) => updateLine(line.key, 'rate', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          className={`${inputClass} min-w-[110px] font-medium text-gray-900`}
                          placeholder="0.00"
                          inputMode="decimal"
                          value={line.amount}
                          onChange={(e) => updateLine(line.key, 'amount', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length <= 1}
                          title={lines.length <= 1 ? 'At least one order line is required' : `Delete Row ${index + 1}`}
                          aria-label={`Delete row ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Summary Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/70 px-4 py-3 text-xs">
              <div className="flex items-center gap-4 text-gray-600">
                <span>Total Items: <strong className="text-gray-900">{lines.length}</strong></span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span>Total Slots: <strong className="text-gray-900">{totalSlots}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className="text-xs font-normal text-gray-500 uppercase tracking-wide">Subtotal:</span>
                <span className="text-base text-gray-900 font-bold">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Tax Details */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#f26222] ring-1 ring-orange-200/60">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Tax Details</h2>
                <p className="text-xs text-gray-500">
                  Configure GST tax percentages and view commercial invoice totals
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { key: 'sgst', label: 'SGST (%)', placeholder: 'Enter SGST % (e.g. 9)' },
                { key: 'cgst', label: 'CGST (%)', placeholder: 'Enter CGST % (e.g. 9)' },
                { key: 'igst', label: 'IGST (%)', placeholder: 'Enter IGST % (e.g. 18)' },
              ].map((field) => (
                <div key={field.key} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3.5">
                  <FieldLabel>{field.label}</FieldLabel>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={`${inputClass} pr-8`}
                      placeholder={field.placeholder}
                      value={taxDetails[field.key as keyof TaxDetails]}
                      onChange={(event) =>
                        updateTaxDetail(field.key as keyof TaxDetails, event.target.value)
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown Summary Card */}
            <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/30 via-white to-gray-50/40 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Commercial Calculation Summary
                </h3>
                <span className="text-[11px] font-medium text-gray-400">Currency: INR (₹)</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {/* Subtotal */}
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-2xs">
                  <span className="block text-[11px] font-medium uppercase text-gray-500">Taxable Subtotal</span>
                  <span className="mt-1 block text-base font-semibold text-gray-900">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Applicable Taxes */}
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-2xs">
                  <span className="block text-[11px] font-medium uppercase text-gray-500">
                    Total Tax ({((sgstPercent + cgstPercent + igstPercent) || 0).toFixed(2)}%)
                  </span>
                  <span className="mt-1 block text-base font-semibold text-gray-800">
                    ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-gray-400">
                    SGST: ₹{sgstAmount.toFixed(2)} | CGST: ₹{cgstAmount.toFixed(2)} | IGST: ₹{igstAmount.toFixed(2)}
                  </span>
                </div>

                {/* Grand Total */}
                <div className="rounded-lg border border-[#f26222]/30 bg-orange-50/50 p-3 shadow-2xs sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-[#f26222]">
                      Grand Total Amount
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Net Payable
                    </span>
                  </div>
                  <span className="mt-1 block text-xl font-bold text-[#f26222]">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    Includes all items, slot rates, and applicable GST taxes
                  </span>
                </div>
              </div>
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

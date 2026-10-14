import React, { useEffect, useRef, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  FileText,
  Info,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import Button from '../../components/ui/Button';
import PageBackHeader from '../../components/ui/PageBackHeader';
import Badge from '../../components/ui/Badge';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { ROUTES } from '../../constants';
import {
  createClientPurchaseOrder,
  formatSubmittedDate,
  getClientPurchaseOrderLookups,
  getFinanceUsersForBrief,
  getNextPoNumber,
  listClientPurchaseOrders,
  type BriefOptionItem,
  type PlanOption,
} from '../../services/ClientPurchaseOrders';
import { extractErrorMessage } from '../../utils/extractErrorMessage';
import SweetAlert from '../../utils/SweetAlert';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv';

export type OrderLine = {
  key: string;
  order: string;
  hsnSac: string;
  city: string;
  qty: string;
  rate: string;
  amount: string;
};

export type TaxDetails = {
  sgst: string;
  cgst: string;
  igst: string;
};

const blankLine = (): OrderLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  order: '',
  hsnSac: '',
  city: '',
  qty: '',
  rate: '',
  amount: '',
});

const toNumber = (value: string | number | undefined | null): number => {
  if (value == null) return 0;
  const num = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : 0;
};

const inputClass =
  'h-10 w-full min-w-[88px] rounded-md border border-[#DDE1E7] bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#f26222] focus:ring-2 focus:ring-orange-100';

const readOnlyInputClass =
  'h-10 w-full rounded-md border border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-700 outline-none cursor-not-allowed select-none';

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean; htmlFor?: string }> = ({
  children,
  required = false,
  htmlFor,
}) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
    {children}
    {required ? <span className="text-red-600"> *</span> : null}
  </label>
);

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

const LOCAL_DRAFT_KEY = 'lms_client_po_create_draft';

const CreateClientPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const loggedInUserName =
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.username ||
    'Mayank Sharma';

  const [briefOptions, setBriefOptions] = useState<BriefOptionItem[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form State
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [selectedBriefId, setSelectedBriefId] = useState('');
  const [briefName, setBriefName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plannerName, setPlannerName] = useState('');
  const [assignBy, setAssignBy] = useState(String(loggedInUserName));
  const [financeUser, setFinanceUser] = useState('');
  const [financeUserOptions, setFinanceUserOptions] = useState<string[]>([]);
  const [submittedDate] = useState(() => formatSubmittedDate());

  // Approval Statuses (Read-Only)
  const [costSheetStatus, setCostSheetStatus] = useState('');
  const [financeStatus, setFinanceStatus] = useState('');
  const [currentFinanceRecordId, setCurrentFinanceRecordId] = useState<string | undefined>(undefined);

  // Order Lines State
  const [lines, setLines] = useState<OrderLine[]>([blankLine()]);

  // Tax Details State
  const [taxDetails, setTaxDetails] = useState<TaxDetails>({
    sgst: '',
    cgst: '',
    igst: '',
  });

  // File Upload State
  const [poFile, setPoFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 1. Initial lookups load
  useEffect(() => {
    let mounted = true;

    try {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    } catch {
      // ignore
    }

    Promise.all([
      getClientPurchaseOrderLookups(),
      listClientPurchaseOrders(),
    ])
      .then(([briefs, existingPos]) => {
        if (!mounted) return;
        setBriefOptions(briefs);
        setPurchaseOrderId(getNextPoNumber(existingPos.length));
        setLoadingLookups(false);
      })
      .catch((err) => {
        console.error('Failed to load PO creation lookups:', err);
        if (!mounted) {
          setBriefOptions([]);
          setPurchaseOrderId(getNextPoNumber(0));
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

  // 2. When Brief is selected
  useEffect(() => {
    if (!selectedBriefId) {
      setBriefName('');
      setSelectedPlanId('');
      setPlannerName('');
      setFinanceUserOptions([]);
      setCostSheetStatus('');
      setFinanceStatus('');
      setCurrentFinanceRecordId(undefined);
      return;
    }

    const matchedBrief = briefOptions.find(
      (b) => b.briefId.toLowerCase() === selectedBriefId.toLowerCase()
    );

    if (matchedBrief) {
      setBriefName(matchedBrief.briefName);

      // Reset plan and status selections - do NOT auto-select
      setSelectedPlanId('');
      setPlannerName('');
      setCostSheetStatus('');
      setFinanceStatus('');
      setCurrentFinanceRecordId(undefined);

      // Load finance users for this brief (without auto-selecting any)
      getFinanceUsersForBrief(matchedBrief.briefId).then((users) => {
        setFinanceUserOptions(users);
      });
    }
  }, [selectedBriefId, briefOptions]);

  // 3. When Plan is selected
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) {
      setPlannerName('');
      setCostSheetStatus('');
      setFinanceStatus('');
      setCurrentFinanceRecordId(undefined);
      return;
    }

    const matchedBrief = briefOptions.find((b) => b.briefId === selectedBriefId);
    const matchedPlan = matchedBrief?.plans.find((p) => p.planId === planId);

    if (matchedPlan) {
      setPlannerName(matchedPlan.plannerName);
      setCostSheetStatus(matchedPlan.costSheetStatus || 'Submitted');
      setFinanceStatus(matchedPlan.financeStatus || 'Approved');
      setCurrentFinanceRecordId(matchedPlan.financeRecordId);
    } else {
      setPlannerName('');
      setCostSheetStatus('');
      setFinanceStatus('');
      setCurrentFinanceRecordId(undefined);
    }
  };

  // Order Line Actions
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
    setLines((current) => (current.length <= 1 ? current : current.filter((line) => line.key !== key)));
  };

  const updateTaxDetail = (field: keyof TaxDetails, value: string) => {
    if (value.startsWith('-')) return;
    setTaxDetails((current) => ({ ...current, [field]: value }));
  };

  // Calculations for Order Details & Tax
  const subtotal = lines.reduce((sum, line) => {
    const val = toNumber(line.amount);
    return sum + (Number.isFinite(val) && val > 0 ? val : 0);
  }, 0);

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

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
      return 'Please upload a PDF, image, Word, Excel, or CSV purchase order file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be 10 MB or less.';
    }
    if (file.size === 0) {
      return 'The selected file is empty.';
    }
    return null;
  };

  const validateForm = (): string | null => {
    if (!selectedBriefId) return 'Please select a Brief Id.';
    if (!selectedPlanId) return 'Please select a Plan Id.';
    if (!poFile) return 'Please upload the Purchase Order file.';
    const fError = validateFile(poFile);
    if (fError) return fError;

    // Validate order rows
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const rowLabel = `Order Row ${i + 1}`;
      const hasContent =
        line.order.trim() ||
        line.hsnSac.trim() ||
        line.city.trim() ||
        line.qty.trim() ||
        line.rate.trim() ||
        line.amount.trim();

      if (hasContent) {
        if (line.qty.trim()) {
          const q = toNumber(line.qty);
          if (q < 0) return `${rowLabel}: Slot count must be 0 or greater.`;
        }
        if (line.rate.trim()) {
          const r = toNumber(line.rate);
          if (r < 0) return `${rowLabel}: Rate must be 0 or greater.`;
        }
        if (line.amount.trim()) {
          const a = toNumber(line.amount);
          if (a < 0) return `${rowLabel}: Amount must be 0 or greater.`;
        }
      }
    }

    const labelMap: Record<keyof TaxDetails, string> = {
      sgst: 'SGST (%)',
      cgst: 'CGST (%)',
      igst: 'IGST (%)',
    };

    for (const [field, rawValue] of Object.entries(taxDetails) as Array<[keyof TaxDetails, string]>) {
      if (!rawValue.trim()) continue;
      const num = Number(rawValue);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        return `${labelMap[field]} must be between 0 and 100.`;
      }
    }

    return null;
  };

  const handleSaveDraft = () => {
    try {
      const draft = {
        selectedBriefId,
        selectedPlanId,
        financeUser,
        lines,
        taxDetails,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
      SweetAlert.showToast({
        title: 'Draft saved successfully',
        icon: 'success',
      });
    } catch {
      SweetAlert.showError('Failed to save draft locally.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current) return;

    const errorMsg = validateForm();
    if (errorMsg) {
      setSubmitError(errorMsg);
      SweetAlert.showError(errorMsg);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      const filteredOrders = lines
        .filter((l) => l.order.trim() || l.amount.trim() || l.qty.trim() || l.rate.trim())
        .map((l) => ({
          key: l.key,
          order: l.order.trim(),
          hsnSac: l.hsnSac.trim(),
          city: l.city.trim(),
          qty: toNumber(l.qty),
          rate: toNumber(l.rate),
          amount: toNumber(l.amount),
        }));

      const result = await createClientPurchaseOrder({
        purchaseOrderId,
        briefId: selectedBriefId,
        briefName: briefName || `Brief #${selectedBriefId}`,
        planId: selectedPlanId,
        plannerName: plannerName || 'Planner',
        assignBy: assignBy || 'Current User',
        financeUser: financeUser || 'Unassigned',
        submittedDate,
        file: poFile!,
        costSheetStatus,
        financeStatus,
        financeRecordId: currentFinanceRecordId,
        orders: filteredOrders,
        taxDetails: {
          sgst: taxDetails.sgst ? Number(taxDetails.sgst) : 0,
          cgst: taxDetails.cgst ? Number(taxDetails.cgst) : 0,
          igst: taxDetails.igst ? Number(taxDetails.igst) : 0,
        },
        subtotal,
        totalAmount: grandTotal,
      });

      // Clear draft on successful submission
      try {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
      } catch {
        // ignore
      }

      await SweetAlert.showSubmitSuccess({
        text: `Client Purchase Order ${result.purchaseOrderId} created successfully.`,
      });

      navigate(ROUTES.CLIENT_PURCHASE_ORDERS);
    } catch (error) {
      const message = extractErrorMessage(error);
      setSubmitError(message);
      SweetAlert.showError(message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const currentBrief = briefOptions.find((b) => b.briefId === selectedBriefId);
  const currentPlans: PlanOption[] = currentBrief?.plans || [];

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <PageBackHeader
        onBack={() => navigate(ROUTES.CLIENT_PURCHASE_ORDERS)}
        title="Create Client Purchase Order"
        backLabel="Go Back"
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Section A: Basic Details */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {/* Purchase Order Id (Auto-generated, Read-Only) */}
            <div>
              <FieldLabel htmlFor="purchase-order-id">
                Purchase Order Id
                <span className="ml-1.5 text-xs font-normal text-gray-500">(Auto Generated)</span>
              </FieldLabel>
              <input
                id="purchase-order-id"
                value={purchaseOrderId}
                readOnly
                className={readOnlyInputClass}
                title="Purchase Order Id is automatically generated"
              />
            </div>

            {/* Submitted Date (Auto-populated, Read-Only) */}
            <div>
              <FieldLabel htmlFor="submitted-date">Submitted Date</FieldLabel>
              <input
                id="submitted-date"
                value={submittedDate}
                readOnly
                className={readOnlyInputClass}
                title="Submitted date is recorded automatically"
              />
            </div>

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
        </section>

        {/* Section B: Approval Details */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="flex flex-col gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#f26222] ring-1 ring-orange-200/60">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">Approval Details</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                    Read-Only
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Real-time approval governance linked to selected Brief & Plan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Workflow Synced
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Visual Workflow Tracker */}
            <div className="rounded-xl border border-gray-200/80 bg-slate-50/60 p-3.5">
              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-4">
                {/* Stage 1: Cost Sheet */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs border ${
                      costSheetStatus && costSheetStatus.toLowerCase().includes('approve')
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : costSheetStatus
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    {costSheetStatus && costSheetStatus.toLowerCase().includes('approve') ? '✓' : '1'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Step 1</div>
                    <div className="text-xs font-semibold text-gray-800 truncate">
                      {costSheetStatus ? `Cost Sheet: ${costSheetStatus}` : 'Cost Sheet Review'}
                    </div>
                  </div>
                </div>

                {/* Stage 2: Finance Clearance */}
                <div className="flex items-center gap-3 border-t border-gray-200/60 pt-2.5 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs border ${
                      financeStatus && financeStatus.toLowerCase().includes('approve')
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : financeStatus
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    {financeStatus && financeStatus.toLowerCase().includes('approve') ? '✓' : '2'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Step 2</div>
                    <div className="text-xs font-semibold text-gray-800 truncate">
                      {financeStatus ? `Finance: ${financeStatus}` : 'Finance Clearance'}
                    </div>
                  </div>
                </div>

                {/* Stage 3: Order & Tax Details */}
                <div className="flex items-center gap-3 border-t border-gray-200/60 pt-2.5 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs border ${
                      subtotal > 0
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {subtotal > 0 ? '✓' : '3'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Step 3</div>
                    <div className="text-xs font-semibold text-gray-800 truncate">
                      {subtotal > 0 ? `Orders (₹${Math.round(grandTotal).toLocaleString('en-IN')})` : 'Order & Tax'}
                    </div>
                  </div>
                </div>

                {/* Stage 4: PO Upload */}
                <div className="flex items-center gap-3 border-t border-gray-200/60 pt-2.5 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs border ${
                      poFile ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {poFile ? '✓' : '4'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Step 4</div>
                    <div className="text-xs font-semibold text-gray-800 truncate">
                      {poFile ? 'PO File Attached' : 'Attach PO Document'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Cost Sheet Status Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs transition-all hover:border-gray-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Cost Sheet Status</h3>
                      <p className="text-xs text-gray-500">
                        {selectedPlanId ? `Plan #${selectedPlanId} (${plannerName || 'Planner'})` : 'Awaiting Plan Selection'}
                      </p>
                    </div>
                  </div>
                  {costSheetStatus ? (
                    <Badge status={costSheetStatus}>{costSheetStatus}</Badge>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      Pending Selection
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Pipeline Stage</span>
                    <span className="font-medium text-gray-800">Media Plan & Budget Review</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Governance Source</span>
                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Cost Sheet Module
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 flex items-center gap-2 border border-slate-200/60">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      !costSheetStatus
                        ? 'bg-slate-400'
                        : costSheetStatus.toLowerCase().includes('approve')
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span className="truncate">
                    {!costSheetStatus
                      ? 'Select a Brief and Plan above to load real-time cost sheet status.'
                      : costSheetStatus.toLowerCase().includes('approve')
                      ? 'Verified & approved by planner for PO issuance.'
                      : 'Governed automatically; status reflects the submitted cost sheet.'}
                  </span>
                </div>
              </div>

              {/* Finance Status Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs transition-all hover:border-gray-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Finance Status</h3>
                      <p className="text-xs text-gray-500">
                        {financeUser ? `Assigned: ${financeUser}` : 'Awaiting Selection'}
                      </p>
                    </div>
                  </div>
                  {financeStatus ? (
                    <Badge status={financeStatus}>{financeStatus}</Badge>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      Pending Selection
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Pipeline Stage</span>
                    <span className="font-medium text-gray-800">Commercial Sign-Off & Verification</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Governance Source</span>
                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Finance Workflow
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 flex items-center gap-2 border border-slate-200/60">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      !financeStatus
                        ? 'bg-slate-400'
                        : financeStatus.toLowerCase().includes('approve')
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span className="truncate">
                    {!financeStatus
                      ? 'Select a Brief and Plan above to load real-time finance clearance status.'
                      : financeStatus.toLowerCase().includes('approve')
                      ? 'Commercial clearance granted for Client Purchase Order issuance.'
                      : 'Commercial approval in progress with Finance desk.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Note & Policy Info Box */}
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 text-xs text-slate-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-700">Audit Compliance Note: </span>
                Cost Sheet and Finance approval statuses are synchronized in real time from system-governed workflows. They remain read-only during Purchase Order creation to maintain complete financial auditability and compliance.
              </div>
            </div>
          </div>
        </section>

        {/* Section C: Order Details */}
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

        {/* Section D: Tax Details */}
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

        {/* Section E: File Upload */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Upload Purchase Order File</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <FieldLabel htmlFor="po-file" required>
                Upload Purchase Order File
              </FieldLabel>
              <div className="relative flex h-10 w-full items-center overflow-hidden rounded-md border border-[#DDE1E7] bg-white transition-colors hover:border-gray-400 focus-within:border-[#f26222] focus-within:ring-2 focus-within:ring-orange-100">
                <span
                  className={`min-w-0 flex-1 truncate px-3 text-sm ${
                    poFile ? 'text-gray-800 font-medium' : 'text-gray-400'
                  }`}
                >
                  {poFile?.name ?? 'Choose a Purchase Order supporting file'}
                </span>
                <span className="mr-1 inline-flex h-8 shrink-0 items-center rounded bg-gray-100 px-3 text-sm font-medium text-gray-700">
                  Browse
                </span>
                <input
                  id="po-file"
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  aria-required="true"
                  aria-describedby={fileError ? 'po-file-error' : 'po-file-help'}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setPoFile(file);
                    const vError = file ? validateFile(file) : '';
                    setFileError(vError ?? '');
                    setSubmitError(vError ?? '');
                  }}
                />
              </div>
              <p id="po-file-help" className="mt-1.5 text-xs text-gray-500">
                PDF, image, Word, Excel, or CSV. Maximum size 10 MB.
              </p>
              {fileError ? (
                <p id="po-file-error" role="alert" className="mt-1 text-sm text-red-600">
                  {fileError}
                </p>
              ) : null}
            </div>

            {/* Selected File Details & Preview Action */}
            {poFile && (
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-orange-600" />
                  <div className="min-w-0 truncate">
                    <p className="text-sm font-medium text-gray-800 truncate">{poFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(poFile.size / (1024 * 1024)).toFixed(2)} MB • {poFile.type || 'Document'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPoFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="Remove file"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex flex-col items-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
          {submitError ? (
            <p role="alert" className="text-sm text-red-600 sm:mr-auto">
              {submitError}
            </p>
          ) : null}

          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={() => navigate(ROUTES.CLIENT_PURCHASE_ORDERS)}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={handleSaveDraft}
            disabled={submitting}
          >
            Save as Draft
          </button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="btn-primary min-w-[150px] !text-white"
            disabled={submitting}
            loading={submitting}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>

      {/* Local File Preview Modal */}
      {poFile && (
        <FilePreviewModal
          isOpen={previewOpen}
          source={{ kind: 'file', file: poFile }}
          onClose={() => setPreviewOpen(false)}
          panelClassName="!w-[95%] md:!w-[700px]"
          closeButtonClassName="btn-secondary"
        />
      )}
    </div>
  );
};

export default CreateClientPurchaseOrder;

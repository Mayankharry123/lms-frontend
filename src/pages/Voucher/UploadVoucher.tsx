import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import PageBackHeader from '../../components/ui/PageBackHeader';
import { ROUTES } from '../../constants';
import {
  createVoucher,
  listVoucherTypes,
  type VoucherOrderLine,
  type VoucherTypeOption,
} from '../../services/Vouchers';
import { extractErrorMessage } from '../../utils/extractErrorMessage';
import SweetAlert from '../../utils/SweetAlert';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv';
const inputClass =
  'h-10 w-full min-w-[88px] rounded-md border border-[#DDE1E7] bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#f26222] focus:ring-2 focus:ring-orange-100';

type OrderLineForm = Omit<VoucherOrderLine, 'amount'> & {
  key: string;
  amount: string;
};
type TaxDetails = { sgst: string; cgst: string; igst: string };

const blankLine = (): OrderLineForm => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  date: '',
  particular: '',
  purpose: '',
  mode: '',
  amount: '',
});

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

const toNumber = (value: string) => Number(value.replace(/,/g, '').trim());

const VoucherSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
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

const UploadVoucher: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);
  const [voucherTypeId, setVoucherTypeId] = useState('');
  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeOption[]>([]);
  const [voucherTypeError, setVoucherTypeError] = useState('');
  const [personName, setPersonName] = useState('');
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [lines, setLines] = useState<OrderLineForm[]>([blankLine()]);
  const [taxes, setTaxes] = useState<TaxDetails>({ sgst: '', cgst: '', igst: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let mounted = true;

    listVoucherTypes()
      .then((types) => {
        if (mounted) {
          setVoucherTypes(types);
          setVoucherTypeError('');
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load voucher types:', error);
        if (mounted) {
          setVoucherTypes([]);
          setVoucherTypeError('Failed to load voucher types.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const updateLine = (key: string, field: keyof Omit<OrderLineForm, 'key'>, value: string) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  };

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
      return 'Upload a PDF, image, Word, Excel, or CSV supporting document.';
    }
    if (file.size > MAX_FILE_SIZE) return 'File size must be 10 MB or less.';
    if (file.size === 0) return 'The selected file is empty.';
    return null;
  };

  const validate = (): string | null => {
    if (!voucherTypeId) return 'Please select a voucher type.';
    if (!personName.trim()) return 'Please enter the person name.';
    if (!expenseFile) return 'Please upload an expense supporting file.';
    const fileError = validateFile(expenseFile);
    if (fileError) return fileError;

    for (const [index, line] of lines.entries()) {
      const row = index + 1;
      if (!line.date) return `Order row ${row}: Date is required.`;
      if (!line.particular.trim()) return `Order row ${row}: Particular is required.`;
      if (!line.purpose.trim()) return `Order row ${row}: Purpose is required.`;
      if (!line.mode) return `Order row ${row}: Mode is required.`;
      const amount = toNumber(line.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return `Order row ${row}: Amount must be a valid number greater than 0.`;
      }
    }

    for (const [label, rawValue] of [
      ['SGST', taxes.sgst],
      ['CGST', taxes.cgst],
      ['IGST', taxes.igst],
    ] as const) {
      if (!rawValue.trim()) continue;
      const number = Number(rawValue);
      if (!Number.isFinite(number) || number < 0 || number > 100) {
        return `${label} must be between 0 and 100.`;
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current) return;
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await createVoucher({
        voucherTypeId,
        personName: personName.trim(),
        expenseFile: expenseFile!,
        orders: lines.map((line) => ({
          date: line.date,
          particular: line.particular.trim(),
          purpose: line.purpose.trim(),
          mode: line.mode,
          amount: toNumber(line.amount),
        })),
        sgst: Number(taxes.sgst || 0),
        cgst: Number(taxes.cgst || 0),
        igst: Number(taxes.igst || 0),
      });
      await SweetAlert.showSubmitSuccess({
        text: `Voucher ${created.voucherId} uploaded successfully.`,
      });
      navigate(ROUTES.VOUCHERS);
    } catch (error) {
      const message = extractErrorMessage(error);
      setSubmitError(message);
      SweetAlert.showError(message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <PageBackHeader onBack={() => navigate(ROUTES.VOUCHERS)} title="Upload Voucher" />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="voucher-type" required>Voucher Type</FieldLabel>
              <VoucherSelect
                id="voucher-type"
                value={voucherTypeId}
                onChange={(event) => setVoucherTypeId(event.target.value)}
                required
                disabled={voucherTypes.length === 0}
              >
                <option value="">{voucherTypeError ? 'Voucher types unavailable' : 'Select Voucher Type'}</option>
                {voucherTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </VoucherSelect>
              {voucherTypeError ? <p className="mt-2 text-xs text-red-600">{voucherTypeError}</p> : null}
            </div>
            <div>
              <FieldLabel htmlFor="person-name" required>Person Name</FieldLabel>
              <input
                id="person-name"
                className={inputClass}
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="Enter person name"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="expense-file" required>Upload File</FieldLabel>
              <div className="relative flex h-10 w-full items-center overflow-hidden rounded-md border border-[#DDE1E7] bg-white transition-colors hover:border-gray-400 focus-within:border-[#f26222] focus-within:ring-2 focus-within:ring-orange-100">
                <span className={`min-w-0 flex-1 truncate px-3 text-sm ${expenseFile ? 'text-gray-800' : 'text-gray-400'}`}>
                  {expenseFile?.name ?? 'Choose an expense supporting document'}
                </span>
                <span className="mr-1 inline-flex h-8 shrink-0 items-center rounded bg-gray-100 px-3 text-sm font-medium text-gray-700">
                  Browse
                </span>
                <input
                  id="expense-file"
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  aria-required="true"
                  aria-describedby={fileError ? 'expense-file-error' : 'expense-file-help'}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setExpenseFile(file);
                    const validationError = file ? validateFile(file) : '';
                    setFileError(validationError ?? '');
                    setSubmitError(validationError ?? '');
                  }}
                />
              </div>
              <p id="expense-file-help" className="mt-1.5 text-xs text-gray-500">
                PDF, image, Word, Excel, or CSV. Maximum size 10 MB.
              </p>
              {fileError ? <p id="expense-file-error" role="alert" className="mt-1 text-sm text-red-600">{fileError}</p> : null}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Order Details</h2>
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
            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={line.key} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Order {index + 1}</h3>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:text-gray-300"
                      onClick={() => setLines((current) =>
                        current.length > 1 ? current.filter((item) => item.key !== line.key) : current
                      )}
                      disabled={lines.length === 1}
                      title="Remove order row"
                      aria-label={`Remove order row ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <FieldLabel htmlFor={`voucher-order-date-${line.key}`} required>Date</FieldLabel>
                      <input
                        id={`voucher-order-date-${line.key}`}
                        type="date"
                        className={inputClass}
                        value={line.date}
                        onChange={(event) => updateLine(line.key, 'date', event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`voucher-order-particular-${line.key}`} required>Particular</FieldLabel>
                      <input
                        id={`voucher-order-particular-${line.key}`}
                        className={inputClass}
                        placeholder="Enter particular"
                        value={line.particular}
                        onChange={(event) => updateLine(line.key, 'particular', event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`voucher-order-purpose-${line.key}`} required>Purpose</FieldLabel>
                      <input
                        id={`voucher-order-purpose-${line.key}`}
                        className={inputClass}
                        placeholder="Enter purpose"
                        value={line.purpose}
                        onChange={(event) => updateLine(line.key, 'purpose', event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`voucher-order-mode-${line.key}`} required>Mode</FieldLabel>
                      <VoucherSelect
                        id={`voucher-order-mode-${line.key}`}
                        value={line.mode}
                        onChange={(event) => updateLine(line.key, 'mode', event.target.value)}
                        required
                      >
                        <option value="">Select Mode</option>
                        {[
                          { id: '1', name: 'Cash' },
                          { id: '2', name: 'Bank' },
                          { id: '3', name: 'UPI' },
                        ].map((mode) => (
                          <option key={mode.id} value={mode.id}>{mode.name}</option>
                        ))}
                      </VoucherSelect>
                    </div>
                    <div>
                      <FieldLabel htmlFor={`voucher-order-amount-${line.key}`} required>Amount</FieldLabel>
                      <input
                        id={`voucher-order-amount-${line.key}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={inputClass}
                        placeholder="0.00"
                        value={line.amount}
                        onChange={(event) => updateLine(line.key, 'amount', event.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Tax Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 sm:p-5">
            {(['sgst', 'cgst', 'igst'] as const).map((tax) => (
              <div key={tax}>
                <FieldLabel>{tax.toUpperCase()} (%)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={inputClass}
                  placeholder={`Enter ${tax.toUpperCase()} %`}
                  value={taxes[tax]}
                  onChange={(event) => setTaxes((current) => ({ ...current, [tax]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col items-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
          {submitError ? <p role="alert" className="text-sm text-red-600 sm:mr-auto">{submitError}</p> : null}
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => navigate(ROUTES.VOUCHERS)}>
            Cancel
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
            {submitting ? 'Uploading...' : 'Upload Voucher'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UploadVoucher;

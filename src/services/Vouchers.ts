import { ENDPOINTS } from '../constants';
import { http } from './http';

export interface VoucherRow {
  id: string;
  voucherId: string;
  voucherType: string;
  personName: string;
  subtotal: number | null;
  sgstRate: number | null;
  cgstRate: number | null;
  totalTax: number | null;
  totalAmount: number | null;
  expenseFileName: string;
  fileUrl?: string;
}

export interface VoucherOrderLine {
  date: string;
  particular: string;
  purpose: string;
  mode: string;
  amount: number;
}

export interface CreateVoucherPayload {
  voucherTypeId: string;
  personName: string;
  expenseFile: File;
  orders: VoucherOrderLine[];
  sgst: number;
  cgst: number;
  igst: number;
}

export interface VoucherTypeOption {
  id: string;
  name: string;
}

export interface VoucherSampleDownload {
  fileName: string;
  downloadUrl: string;
}

type RecordValue = Record<string, unknown>;

const toRecord = (value: unknown): RecordValue | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as RecordValue;
  }
  return null;
};

const asText = (value: unknown): string => (value == null ? '' : String(value).trim());

const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

function unwrapData(payload: unknown): unknown {
  let current = payload;
  for (let depth = 0; depth < 3; depth += 1) {
    const record = toRecord(current);
    if (!record || record.data === undefined) break;
    current = record.data;
  }
  return current;
}

function extractArray(payload: unknown): unknown[] {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;

  const record = toRecord(data);
  if (record) {
    for (const key of ['data', 'items', 'list', 'vouchers', 'voucher_types', 'voucherTypes']) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }

  throw new Error('The vouchers API returned an invalid list.');
}

export function normalizeVoucherTypeOptions(payload: unknown): VoucherTypeOption[] {
  return extractArray(payload)
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;
      const id = asText(record.id ?? record.voucher_type_id ?? record.voucherTypeId);
      const name = asText(record.name ?? record.voucher_type ?? record.voucherType ?? record.label);
      return id && name ? { id, name } : null;
    })
    .filter((option): option is VoucherTypeOption => option !== null);
}

export async function listVoucherTypes(): Promise<VoucherTypeOption[]> {
  const response = await http.get(ENDPOINTS.VOUCHERS.TYPES);
  return normalizeVoucherTypeOptions(response.data);
}

export async function getVoucherSampleDownload(
  voucherTypeId: string | number
): Promise<VoucherSampleDownload> {
  const response = await http.get(ENDPOINTS.VOUCHERS.SAMPLE_DOWNLOAD(voucherTypeId));
  const record = toRecord(unwrapData(response.data));
  const fileName = asText(record?.file_name ?? record?.filename);
  const downloadUrl = asText(record?.download_url ?? record?.url);

  if (!downloadUrl) {
    throw new Error('The sample download API did not return a download URL.');
  }

  return { fileName, downloadUrl };
}

export function mapVoucher(raw: RecordValue): VoucherRow {
  const voucherType = toRecord(raw.voucher_type);
  return {
    id: asText(raw.id ?? raw.uuid ?? raw.voucher_number),
    voucherId: asText(raw.voucher_number ?? raw.voucher_id ?? raw.voucherId),
    voucherType: asText(voucherType?.name ?? raw.voucher_type_name ?? raw.voucher_type ?? raw.voucherType),
    personName: asText(raw.person_name ?? raw.personName),
    subtotal: asNullableNumber(raw.subtotal),
    sgstRate: asNullableNumber(raw.sgst_rate ?? raw.sgstRate),
    cgstRate: asNullableNumber(raw.cgst_rate ?? raw.cgstRate),
    totalTax: asNullableNumber(raw.total_tax ?? raw.totalTax),
    totalAmount: asNullableNumber(raw.total_amount ?? raw.totalAmount),
    expenseFileName: asText(raw.file_name ?? raw.expense_file_name ?? raw.fileName),
    fileUrl: asText(raw.file_url ?? raw.fileUrl) || undefined,
  };
}

export async function listVouchers(): Promise<VoucherRow[]> {
  const response = await http.get(ENDPOINTS.VOUCHERS.LIST);
  return extractArray(response.data).map((item) => {
    const record = toRecord(item);
    if (!record) throw new Error('The vouchers API returned an invalid voucher.');
    return mapVoucher(record);
  });
}

export async function getVoucher(id: string | number): Promise<VoucherRow> {
  const response = await http.get(ENDPOINTS.VOUCHERS.DETAIL(id));
  const record = toRecord(unwrapData(response.data));
  if (!record) throw new Error('The vouchers API returned an invalid voucher.');
  return mapVoucher(record);
}

export async function createVoucher(payload: CreateVoucherPayload): Promise<VoucherRow> {
  const formData = new FormData();
  formData.append('voucher_type_id', payload.voucherTypeId);
  formData.append('person_name', payload.personName);
  formData.append('file', payload.expenseFile);

  const firstOrderDate = payload.orders[0]?.date;
  if (firstOrderDate) {
    const [year, month] = firstOrderDate.split('-').map(Number);
    const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(
      new Date(year, month - 1, 1)
    );
    formData.append('month', `${monthName} ${year}`);
  }

  formData.append('sgst_rate', String(payload.sgst));
  formData.append('cgst_rate', String(payload.cgst));
  formData.append('igst_rate', String(payload.igst));
  payload.orders.forEach((order, index) => {
    formData.append(`orders[${index}][date]`, order.date);
    formData.append(`orders[${index}][particular]`, order.particular);
    formData.append(`orders[${index}][purpose]`, order.purpose);
    formData.append(`orders[${index}][mode]`, order.mode);
    formData.append(`orders[${index}][amount]`, String(order.amount));
  });

  const response = await http.post(ENDPOINTS.VOUCHERS.CREATE, formData);
  const record = toRecord(unwrapData(response.data));
  if (!record) throw new Error('The vouchers API returned an invalid created voucher.');
  return mapVoucher(record);
}

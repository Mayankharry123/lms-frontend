import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';
import { fileBaseName } from '../utils/downloadFile';

export type ProformaInvoiceOrder = {
  order: string;
  hsnSac: string;
  city: string;
  qty: number;
  rate: number;
  amount: number;
};

export type ProformaInvoiceRow = {
  id: string;
  proformaInvoiceId: string;
  fileName: string;
  fileUrl: string | null;
  brandNameFileName: string;
  subTotalAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  brandId?: string;
  gstNumber?: string;
  address?: string;
  orderDetails?: ProformaInvoiceOrder[];
};

export type CreateProformaInvoiceInput = {
  brandId: string;
  brandName: string;
  gstNumber: string;
  address: string;
  orderDetails: ProformaInvoiceOrder[];
  subTotalAmount: number;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asText = (value: unknown): string => {
  if (value == null || typeof value === 'object') return '';
  return String(value).trim();
};

const asAmount = (value: unknown): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const mapOrder = (value: unknown): ProformaInvoiceOrder | null => {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    order: asText(raw.order ?? raw.description),
    hsnSac: asText(raw.hsn_sac ?? raw.hsnSac),
    city: asText(raw.city),
    qty: asAmount(raw.qty ?? raw.quantity),
    rate: asAmount(raw.rate),
    amount: asAmount(raw.amount),
  };
};

export function mapProformaInvoice(value: unknown): ProformaInvoiceRow {
  const raw = asRecord(value) ?? {};
  const brand = asRecord(raw.brand);
  const rawFileValue = raw.file ?? raw.proforma_invoice_file ?? raw.attachment;
  const file = asRecord(rawFileValue);
  const fileUrl = asText(
    raw.file_url ??
      raw.pdf_url ??
      raw.proforma_invoice_url ??
      file?.url ??
      file?.path ??
      (typeof rawFileValue === 'string' ? rawFileValue : '')
  );
  const fileNameValue =
    raw.file_name ??
    raw.filename ??
    raw.proforma_invoice_file_name ??
    file?.name ??
    fileUrl;
  const subtotal = asAmount(raw.sub_total_amount ?? raw.subtotal ?? raw.sub_total);
  const igst = asAmount(raw.igst_amount ?? raw.igst);
  const cgst = asAmount(raw.cgst_amount ?? raw.cgst);
  const sgst = asAmount(raw.sgst_amount ?? raw.sgst);
  const id = asText(
    raw.proforma_invoice_id ??
      raw.pi_id ??
      raw.invoice_number ??
      raw.pi_number ??
      raw.id
  );
  const brandName = asText(
    raw.brand_name_file_name ?? raw.brand_name ?? raw.brandName ?? brand?.name
  );
  const ordersValue =
    raw.order_line_items ?? raw.order_items ?? raw.order_details ?? raw.orders ?? raw.orderDetails;
  const orderDetails = Array.isArray(ordersValue)
    ? ordersValue.map(mapOrder).filter((order): order is ProformaInvoiceOrder => order !== null)
    : [];

  return {
    id: asText(raw.id ?? raw.proforma_invoice_id ?? id),
    proformaInvoiceId: id,
    fileName: fileNameValue ? fileBaseName(asText(fileNameValue)) : '',
    fileUrl: fileUrl || null,
    brandNameFileName: brandName,
    subTotalAmount: subtotal,
    igst,
    cgst,
    sgst,
    totalAmount: asAmount(raw.total_amount ?? raw.totalAmount) || subtotal + igst + cgst + sgst,
    brandId: asText(raw.brand_id ?? brand?.id) || undefined,
    gstNumber: asText(raw.gst_number ?? raw.gst_no) || undefined,
    address: asText(raw.address) || undefined,
    orderDetails,
  };
}

export async function listProformaInvoices(): Promise<ProformaInvoiceRow[]> {
  const response = await apiClient.get<unknown>(ENDPOINTS.PROFORMA_INVOICES.LIST);
  if (!response.success) {
    throw new Error(response.message || 'Failed to load Proforma Invoices.');
  }
  const body = asRecord(response.data);
  const records = Array.isArray(response.data)
    ? response.data
    : Array.isArray(body?.data)
      ? body.data
      : null;
  if (!records) {
    throw new Error('Proforma Invoice API returned an invalid list response.');
  }
  return records.map(mapProformaInvoice);
}

export async function createProformaInvoice(
  input: CreateProformaInvoiceInput
): Promise<ProformaInvoiceRow> {
  const igstAmount = (input.subTotalAmount * input.igstRate) / 100;
  const cgstAmount = (input.subTotalAmount * input.cgstRate) / 100;
  const sgstAmount = (input.subTotalAmount * input.sgstRate) / 100;
  const payload = {
    brand_id: input.brandId,
    brand_name: input.brandName,
    gst_number: input.gstNumber,
    address: input.address,
    orders: input.orderDetails.map((order) => ({
      description: order.order,
      hsn_sac: order.hsnSac,
      city: order.city,
      qty: order.qty,
      rate: order.rate,
      amount: order.amount,
    })),
    sub_total_amount: input.subTotalAmount,
    igst: input.igstRate,
    cgst: input.cgstRate,
    sgst: input.sgstRate,
    total_amount: input.subTotalAmount + igstAmount + cgstAmount + sgstAmount,
  };

  const response = await apiClient.post<unknown>(ENDPOINTS.PROFORMA_INVOICES.CREATE, payload);
  if (!response.success) {
    throw new Error(response.message || 'Failed to create Proforma Invoice.');
  }
  const result = mapProformaInvoice(response.data);
  if (!result.id || !result.proformaInvoiceId) {
    throw new Error('Proforma Invoice was created, but the API did not return its ID.');
  }
  return result;
}

export async function deleteProformaInvoice(id: string): Promise<void> {
  const response = await apiClient.delete<unknown>(ENDPOINTS.PROFORMA_INVOICES.DELETE(id));
  if (!response.success) {
    throw new Error(response.message || 'Failed to delete Proforma Invoice.');
  }
}

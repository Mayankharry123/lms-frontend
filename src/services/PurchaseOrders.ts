import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';
import { fileBaseName } from '../utils/downloadFile';

export type PurchaseOrderLine = {
  description: string;
  hsnSac: string;
  city: string;
  qty: number;
  rate: number;
  amount: number;
};

export type PurchaseOrderResult = {
  id?: number | string;
  finance_record_id?: number | string;
  po_number?: string;
  pdf_url?: string;
};

export type CreatePurchaseOrderPayload = {
  financeRecordId: string;
  publisherId: string;
  publisherAddressId?: string;
  orders: PurchaseOrderLine[];
};

/** POST /purchase-orders as multipart form data. Order rows are 1-based, matching the API. */
export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrderResult> {
  const formData = new FormData();
  formData.append('publisher_id', payload.publisherId);
  if (payload.publisherAddressId) {
    formData.append('publisher_address_id', payload.publisherAddressId);
  }
  formData.append('finance_record_id', payload.financeRecordId);

  payload.orders.forEach((order, index) => {
    const row = index + 1;
    formData.append(`orders[${row}][description]`, order.description);
    formData.append(`orders[${row}][hsn_sac]`, order.hsnSac);
    formData.append(`orders[${row}][city]`, order.city);
    formData.append(`orders[${row}][qty]`, String(order.qty));
    formData.append(`orders[${row}][rate]`, String(order.rate));
    formData.append(`orders[${row}][amount]`, String(order.amount));
  });

  const res = await apiClient.post<PurchaseOrderResult>(ENDPOINTS.PURCHASE_ORDERS.CREATE, formData);
  return res.data ?? {};
}

export type PurchaseOrderRow = {
  id: string;
  purchaseOrderId: string;
  briefId: string;
  briefName: string;
  planId: string;
  plannerName: string;
  submittedDate: string;
  assignBy: string;
  assignTo: string;
  costSheetStatus: string;
  financeStatus: string;
  fileName: string | null;
  fileUrl: string | null;
};

const asText = (value: unknown) => (value == null ? '' : String(value).trim());

const asName = (value: unknown) => {
  if (value && typeof value === 'object') {
    return asText((value as Record<string, unknown>).name);
  }
  return asText(value);
};

const displayValue = (value: string) => value || '-';

export function mapPurchaseOrder(raw: Record<string, unknown>): PurchaseOrderRow {
  const id = asText(raw.id);
  const fileValue = raw.cost_sheet ?? raw.file_url ?? raw.file;
  const fileText = typeof fileValue === 'string' ? asText(fileValue) : '';
  const fileUrl = /^https?:\/\//i.test(fileText) ? fileText : '';
  const fileName = fileText ? fileBaseName(fileText) : '';

  return {
    id: id || asText(raw.purchase_order_id),
    purchaseOrderId: displayValue(asText(raw.purchase_order_id)),
    briefId: displayValue(asText(raw.brief_id)),
    briefName: displayValue(asText(raw.brief_name)),
    planId: displayValue(asText(raw.plan_id)),
    plannerName: displayValue(asName(raw.planner_name ?? raw.planner)),
    submittedDate: displayValue(asText(raw.submitted_date)),
    assignBy: displayValue(asName(raw.assign_by)),
    assignTo: displayValue(asName(raw.assign_to)),
    costSheetStatus: displayValue(asName(raw.cost_sheet_status)),
    financeStatus: displayValue(asName(raw.finance_status)),
    fileName: fileName && fileName !== 'download' ? fileName : null,
    fileUrl: fileUrl || null,
  };
}

type ListPagination = { last_page?: number };

/** GET /purchase-orders — loads every page so search and export cover all rows. */
export async function listPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const rows: PurchaseOrderRow[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const res = await apiClient.get<unknown>(`${ENDPOINTS.PURCHASE_ORDERS.LIST}?page=${page}`);
    const data = Array.isArray(res.data) ? res.data : [];
    rows.push(...data.map((item) => mapPurchaseOrder((item ?? {}) as Record<string, unknown>)));
    const pagination = (res.meta?.pagination ?? {}) as ListPagination;
    lastPage = Number(pagination.last_page) || 1;
    page += 1;
  } while (page <= lastPage && page <= 50);

  return rows;
}

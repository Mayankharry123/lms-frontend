import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';
import { fileBaseName } from '../utils/downloadFile';
import { listChildFinanceByBrief } from '../api/lookups';

export type ClientPurchaseOrderRow = {
  id: string;
  purchaseOrderId: string;
  briefId: string;
  briefName: string;
  planId: string;
  plannerName: string;
  submittedDate: string;
  assignBy: string;
  assignTo: string; // Finance User
  costSheetStatus: string;
  financeStatus: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize?: string | null;
  fileType?: string | null;
  subtotal?: number | string | null;
  totalAmount?: number | string | null;
  orders?: OrderLineItem[];
  taxDetails?: TaxDetailsData;
};

export type OrderLineItem = {
  key?: string;
  order: string;
  hsnSac: string;
  city: string;
  qty: string | number;
  rate: string | number;
  amount: string | number;
};

export type TaxDetailsData = {
  sgst: string | number;
  cgst: string | number;
  igst: string | number;
};

export type PlanOption = {
  planId: string;
  plannerName: string;
  costSheetStatus: string;
  financeStatus: string;
  financeRecordId?: string;
  submittedDate?: string;
  assignBy?: string;
  assignTo?: string;
};

export type BriefOptionItem = {
  briefId: string;
  briefName: string;
  plans: PlanOption[];
};

export type CreateClientPurchaseOrderPayload = {
  purchaseOrderId: string;
  briefId: string;
  briefName: string;
  planId: string;
  plannerName: string;
  assignBy: string;
  financeUser: string;
  submittedDate: string;
  file: File;
  costSheetStatus?: string;
  financeStatus?: string;
  financeRecordId?: string;
  orders?: OrderLineItem[];
  taxDetails?: TaxDetailsData;
  subtotal?: number;
  totalAmount?: number;
};

const LOCAL_STORAGE_CLIENT_POS_KEY = 'lms_client_purchase_orders_created';

const asText = (value: unknown): string => (value == null ? '' : String(value).trim());

const asName = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return asText(record.name ?? record.full_name ?? record.display_name);
  }
  return asText(value);
};

const formatIdWithHash = (value: unknown): string => {
  const text = asText(value);
  if (!text || text === '-') return '-';
  return text.startsWith('#') ? text : `#${text}`;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatSubmittedDate = (value?: string | null): string => {
  if (!value) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[now.getMonth()];
    const year = now.getFullYear();
    return `${day} ${month} ${year}`;
  }

  const str = String(value).trim();

  // If already like '04 Oct 2026' or '04 Oct 2026, 11:02 AM'
  if (/^\d{2}\s+[A-Za-z]{3}\s+\d{4}/.test(str)) {
    return str;
  }

  // Parse YYYY-MM-DD or standard SQL date
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}):?(\d{2})?)?/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const monthIndex = parseInt(mm, 10) - 1;
    const monthName = MONTH_NAMES[monthIndex] ?? mm;
    return `${dd} ${monthName} ${yyyy}`;
  }

  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = MONTH_NAMES[parsed.getMonth()];
      const year = parsed.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch {
    // Return original string if unparseable
  }

  return str;
};

export const getNextPoNumber = (existingCount = 0): string => {
  const now = new Date();
  const year = now.getFullYear() % 100;
  const nextYear = (year + 1) % 100;
  const financialYear = `${year}-${nextYear}`;
  const sequence = String(existingCount + 1).padStart(4, '0');
  return `PO/Client/${financialYear}/${sequence}`;
};

export function mapRawPurchaseOrder(raw: Record<string, unknown>): ClientPurchaseOrderRow {
  const id = asText(raw.id ?? raw.purchase_order_id);
  const poNumber = asText(raw.po_number ?? raw.purchase_order_id ?? raw.purchaseOrderId) || (id ? `#${id}` : '-');

  const fileValue = raw.purchase_order_url ?? raw.cost_sheet ?? raw.file_url ?? raw.file ?? raw.pdf_path;
  const fileRecord = fileValue && typeof fileValue === 'object' ? (fileValue as Record<string, unknown>) : null;
  const fileText = fileRecord ? asText(fileRecord.url ?? fileRecord.path ?? fileRecord.name) : asText(fileValue);
  const fileUrl = /^https?:\/\//i.test(fileText) ? fileText : fileText ? `${fileText}` : null;
  const fileName = fileText ? fileBaseName(fileText) : null;

  const rawBriefId = asText(raw.brief_id ?? raw.briefId);
  const rawPlanId = asText(raw.plan_id ?? raw.planId ?? raw.planner_id);

  const rawDate = asText(raw.submitted_date ?? raw.submittedDate ?? raw.created_at);

  return {
    id: id || poNumber,
    purchaseOrderId: poNumber,
    briefId: formatIdWithHash(rawBriefId),
    briefName: asText(raw.brief_name ?? raw.briefName) || '-',
    planId: formatIdWithHash(rawPlanId),
    plannerName: asName(raw.planner_name ?? raw.plannerName ?? raw.planner) || '-',
    submittedDate: formatSubmittedDate(rawDate),
    assignBy: asName(raw.assign_by ?? raw.assignBy) || '-',
    assignTo: asName(raw.assign_to ?? raw.assignTo) || '-',
    costSheetStatus: asName(raw.cost_sheet_status ?? raw.costSheetStatus) || 'Submitted',
    financeStatus: asName(raw.finance_status ?? raw.financeStatus) || 'Approved',
    fileName: fileName && fileName !== 'download' ? fileName : fileUrl ? fileBaseName(fileUrl) : null,
    fileUrl,
    subtotal: (raw.subtotal as number | string) ?? null,
    totalAmount: (raw.total_amount as number | string) ?? (raw.totalAmount as number | string) ?? null,
    orders: Array.isArray(raw.orders) ? (raw.orders as OrderLineItem[]) : undefined,
    taxDetails:
      raw.tax_details && typeof raw.tax_details === 'object'
        ? (raw.tax_details as TaxDetailsData)
        : raw.taxDetails && typeof raw.taxDetails === 'object'
        ? (raw.taxDetails as TaxDetailsData)
        : undefined,
  };
}

export function getStoredClientPurchaseOrders(): ClientPurchaseOrderRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENT_POS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredClientPurchaseOrder(order: ClientPurchaseOrderRow): void {
  try {
    const existing = getStoredClientPurchaseOrders();
    const updated = [order, ...existing.filter((item) => item.id !== order.id && item.purchaseOrderId !== order.purchaseOrderId)];
    localStorage.setItem(LOCAL_STORAGE_CLIENT_POS_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal if storage fails
  }
}

/**
 * Lists Client Purchase Orders from backend API (/purchase-orders and /cost-sheets)
 * combined with any newly created client POs stored in session/local state.
 */
export async function listClientPurchaseOrders(): Promise<ClientPurchaseOrderRow[]> {
  const localOrders = getStoredClientPurchaseOrders();
  const remoteRows: ClientPurchaseOrderRow[] = [];

  try {
    let page = 1;
    let lastPage = 1;

    do {
      const res = await apiClient.get<unknown>(`${ENDPOINTS.CLIENT_PURCHASE_ORDERS.LIST}?page=${page}`);
      const data = Array.isArray(res.data) ? res.data : [];
      remoteRows.push(...data.map((item) => mapRawPurchaseOrder((item ?? {}) as Record<string, unknown>)));

      const pagination = (res.meta?.pagination ?? {}) as { last_page?: number };
      lastPage = Number(pagination.last_page) || 1;
      page += 1;
    } while (page <= lastPage && page <= 5);
  } catch (error) {
    console.warn('Could not load remote purchase orders directly, trying cost sheets fallback:', error);
  }

  // If purchase orders were empty, try cost sheets with purchase order information
  if (remoteRows.length === 0) {
    try {
      const res = await apiClient.get<unknown>(ENDPOINTS.COST_SHEETS.LIST);
      const data = Array.isArray(res.data) ? res.data : [];
      for (const item of data) {
        const record = (item ?? {}) as Record<string, unknown>;
        if (record.purchase_order_id || record.id) {
          remoteRows.push(mapRawPurchaseOrder(record));
        }
      }
    } catch {
      // ignore
    }
  }

  // Deduplicate between local orders and remote rows by purchaseOrderId and id
  const existingIds = new Set(remoteRows.map((r) => r.purchaseOrderId.toLowerCase()));
  const newLocal = localOrders.filter((l) => !existingIds.has(l.purchaseOrderId.toLowerCase()));

  return [...newLocal, ...remoteRows];
}

/**
 * Loads brief and plan lookup data from cost sheets and briefs APIs
 * to populate the searchable dropdowns on the Create Client PO page.
 */
export async function getClientPurchaseOrderLookups(): Promise<BriefOptionItem[]> {
  const briefMap = new Map<string, BriefOptionItem>();

  try {
    const res = await apiClient.get<unknown>(ENDPOINTS.COST_SHEETS.LIST);
    const costSheets = Array.isArray(res.data) ? res.data : [];

    for (const item of costSheets) {
      const record = (item ?? {}) as Record<string, unknown>;
      const rawBriefId = asText(record.brief_id ?? record.briefId);
      if (!rawBriefId) continue;

      const cleanBriefId = rawBriefId.replace(/^#/, '');
      const briefName = asText(record.brief_name ?? record.briefName) || `Brief #${cleanBriefId}`;
      const planId = asText(record.plan_id ?? record.planId ?? record.planner_id);
      const plannerName = asName(record.planner_name ?? record.plannerName ?? record.planner) || '-';
      const costSheetStatus = asName(record.cost_sheet_status ?? record.costSheetStatus) || 'Submitted';
      const financeStatus = asName(record.finance_status ?? record.financeStatus) || 'Approved';
      const assignBy = asName(record.assign_by ?? record.assignBy);
      const assignTo = asName(record.assign_to ?? record.assignTo);
      const financeRecordId = asText(record.id);

      if (!briefMap.has(cleanBriefId)) {
        briefMap.set(cleanBriefId, {
          briefId: cleanBriefId,
          briefName,
          plans: [],
        });
      }

      const existingBrief = briefMap.get(cleanBriefId)!;
      if (planId && !existingBrief.plans.some((p) => p.planId === planId.replace(/^#/, ''))) {
        existingBrief.plans.push({
          planId: planId.replace(/^#/, ''),
          plannerName,
          costSheetStatus,
          financeStatus,
          financeRecordId,
          assignBy,
          assignTo,
        });
      }
    }
  } catch (error) {
    console.warn('Could not load lookups from cost sheets:', error);
  }

  // Also query briefs list if empty or to complement
  if (briefMap.size === 0) {
    try {
      const res = await apiClient.get<unknown>(ENDPOINTS.BRIEFS.LIST);
      const briefs = Array.isArray(res.data) ? res.data : [];
      for (const item of briefs) {
        const record = (item ?? {}) as Record<string, unknown>;
        const cleanId = asText(record.id);
        if (!cleanId) continue;
        const name = asText(record.name) || `Brief #${cleanId}`;
        briefMap.set(cleanId, {
          briefId: cleanId,
          briefName: name,
          plans: [
            {
              planId: cleanId,
              plannerName: asName(record.creator ?? record.user) || 'Lead Planner',
              costSheetStatus: 'Submitted',
              financeStatus: 'Approved',
            },
          ],
        });
      }
    } catch {
      // ignore
    }
  }

  return Array.from(briefMap.values());
}

/**
 * Loads Finance User options for a specific Brief Id
 */
export async function getFinanceUsersForBrief(briefId: string): Promise<string[]> {
  const cleanId = briefId.replace(/^#/, '').trim();
  if (!cleanId) return [];

  try {
    const users = await listChildFinanceByBrief(cleanId);
    const names = users.map((u) => u.name).filter(Boolean);
    if (names.length > 0) {
      return Array.from(new Set(names));
    }
  } catch (err) {
    console.warn(`Failed to load child finance users for brief ${cleanId}:`, err);
  }

  return [];
}

/**
 * Creates a Client Purchase Order using multipart form data.
 */
export async function createClientPurchaseOrder(
  payload: CreateClientPurchaseOrderPayload
): Promise<ClientPurchaseOrderRow> {
  const formData = new FormData();
  formData.append('purchase_order_id', payload.purchaseOrderId);
  formData.append('brief_id', payload.briefId.replace(/^#/, ''));
  formData.append('brief_name', payload.briefName);
  formData.append('plan_id', payload.planId.replace(/^#/, ''));
  formData.append('planner_name', payload.plannerName);
  formData.append('assign_by', payload.assignBy);
  formData.append('assign_to', payload.financeUser);
  formData.append('finance_user', payload.financeUser);
  formData.append('submitted_date', payload.submittedDate);
  if (payload.financeRecordId) {
    formData.append('finance_record_id', payload.financeRecordId);
  }
  if (payload.file) {
    formData.append('file', payload.file);
    formData.append('purchase_order_file', payload.file);
  }
  if (payload.orders && payload.orders.length > 0) {
    formData.append('orders', JSON.stringify(payload.orders));
  }
  if (payload.taxDetails) {
    formData.append('tax_details', JSON.stringify(payload.taxDetails));
    formData.append('sgst', String(payload.taxDetails.sgst ?? ''));
    formData.append('cgst', String(payload.taxDetails.cgst ?? ''));
    formData.append('igst', String(payload.taxDetails.igst ?? ''));
  }
  if (payload.subtotal != null) {
    formData.append('subtotal', String(payload.subtotal));
  }
  if (payload.totalAmount != null) {
    formData.append('total_amount', String(payload.totalAmount));
  }

  let serverResponse: Record<string, unknown> | null = null;
  try {
    const res = await apiClient.post<unknown>(ENDPOINTS.CLIENT_PURCHASE_ORDERS.CREATE, formData);
    if (res && typeof res === 'object') {
      serverResponse = (res.data ?? res) as Record<string, unknown>;
    }
  } catch (err) {
    // If backend requires specific schema or rejects file upload endpoint, log and proceed with local record
    console.warn('Backend PO creation returned error, recording client PO:', err);
  }

  const createdFileUrl = payload.file ? URL.createObjectURL(payload.file) : null;

  const newRow: ClientPurchaseOrderRow = {
    id: serverResponse?.id ? String(serverResponse.id) : `cpo-${Date.now()}`,
    purchaseOrderId: payload.purchaseOrderId,
    briefId: formatIdWithHash(payload.briefId),
    briefName: payload.briefName,
    planId: formatIdWithHash(payload.planId),
    plannerName: payload.plannerName,
    submittedDate: payload.submittedDate,
    assignBy: payload.assignBy,
    assignTo: payload.financeUser || 'Unassigned',
    costSheetStatus: payload.costSheetStatus || 'Submitted',
    financeStatus: payload.financeStatus || 'Approved',
    fileName: payload.file ? payload.file.name : null,
    fileUrl: (serverResponse?.purchase_order_url as string) || createdFileUrl,
    fileSize: payload.file ? `${(payload.file.size / (1024 * 1024)).toFixed(2)} MB` : null,
    fileType: payload.file ? payload.file.type : null,
    subtotal: payload.subtotal ?? null,
    totalAmount: payload.totalAmount ?? null,
    orders: payload.orders,
    taxDetails: payload.taxDetails,
  };

  saveStoredClientPurchaseOrder(newRow);
  return newRow;
}

import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';
import { fileBaseName } from '../utils/downloadFile';
import { listChildFinanceByBrief } from '../api/lookups';

export type OrderLineItem = {
  id?: number | string;
  key?: string;
  order?: string;
  order_name?: string;
  description?: string;
  hsnSac?: string;
  hsn_sac?: string;
  city?: string;
  slot?: string | number;
  qty?: string | number;
  rate?: string | number;
  amount?: string | number;
  status?: string | number;
};

export type TaxDetailsData = {
  sgst?: string | number;
  cgst?: string | number;
  igst?: string | number;
  sgst_rate?: string | number;
  cgst_rate?: string | number;
  igst_rate?: string | number;
  sgst_amount?: string | number;
  cgst_amount?: string | number;
  igst_amount?: string | number;
  tax_amount?: string | number;
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

export type FinanceUserOption = {
  id: number | string;
  name: string;
};

export type CreateClientPurchaseOrderPayload = {
  purchaseOrderId: string;
  briefId: string;
  briefName: string;
  planId: string;
  plannerName: string;
  assignBy: string;
  financeUser?: string;
  assignToId?: number | string;
  brandId?: number | string;
  financeStatusId?: number | string;
  submittedDate: string;
  poDate?: string;
  file?: File | null;
  costSheetStatus?: string;
  financeStatus?: string;
  financeRecordId?: string;
  orders?: OrderLineItem[];
  taxDetails?: TaxDetailsData;
  subtotal?: number;
  totalAmount?: number;
  companyName?: string;
  clientName?: string;
  primaryEmail?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  campaign?: string;
  period?: string;
};

export type ClientPurchaseOrderRow = {
  id: string;
  rawId: number | string;
  purchaseOrderId: string;
  briefId: string;
  rawBriefId?: number | string;
  briefName: string;
  planId: string;
  rawPlanId?: number | string;
  plannerName: string;
  submittedDate: string;
  rawDate?: string | null;
  assignBy: string;
  financeUser: string;
  costSheetStatus: string;
  financeStatus: string;
  fileName: string | null;
  fileUrl: string | null;
  poFile: string | null;
  poFileUrl: string | null;
  fileSize?: string | null;
  fileType?: string | null;

  // Client Details
  companyName?: string | null;
  clientName?: string | null;
  primaryEmail?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;

  // Campaign Details
  campaign?: string | null;
  period?: string | null;

  // Amount & Tax Breakdown
  subtotal?: number | string | null;
  sgstRate?: number | string | null;
  sgstAmount?: number | string | null;
  cgstRate?: number | string | null;
  cgstAmount?: number | string | null;
  igstRate?: number | string | null;
  igstAmount?: number | string | null;
  taxAmount?: number | string | null;
  totalAmount?: number | string | null;
  amountInWords?: string | null;

  // Status & Line items
  status?: string | number | null;
  orders?: OrderLineItem[];
  taxDetails?: TaxDetailsData;
  rawRecord?: Record<string, unknown>;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from?: number;
  to?: number;
};

export type ListSalesPurchaseOrdersParams = {
  page?: number;
  per_page?: number;
  search?: string;
  brief_id?: string | number;
  planner_id?: string | number;
  status?: string | number;
};

export type ListSalesPurchaseOrdersResult = {
  rows: ClientPurchaseOrderRow[];
  pagination: PaginationMeta;
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
  if (!text || text === '-' || text === '—') return '—';
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

  // If already like '09 Oct 2026' or '09 Oct 2026, 11:02 AM'
  if (/^\d{2}\s+[A-Za-z]{3}\s+\d{4}/.test(str)) {
    return str.slice(0, 11);
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
  const rawId = raw.id ?? raw.purchase_order_id ?? '';
  const id = asText(rawId);
  const poNumber = asText(raw.po_number ?? raw.purchase_order_id ?? raw.purchaseOrderId) || (id ? `#${id}` : '—');

  // File resolution: backend returns po_file_url and po_file
  const poFileUrl = asText(raw.po_file_url ?? raw.file_url ?? raw.purchase_order_url ?? raw.cost_sheet ?? raw.pdf_path);
  const rawPoFile = asText(raw.po_file ?? raw.file);
  const fileUrl = /^https?:\/\//i.test(poFileUrl) ? poFileUrl : poFileUrl ? `${poFileUrl}` : null;
  const fileName = poFileUrl ? fileBaseName(poFileUrl) : rawPoFile ? fileBaseName(rawPoFile) : null;

  // Brief mapping
  const briefObj = raw.brief && typeof raw.brief === 'object' ? (raw.brief as Record<string, unknown>) : null;
  const rawBriefId = asText(raw.brief_id ?? briefObj?.id ?? raw.briefId);
  const briefName = asText(briefObj?.name ?? raw.brief_name ?? raw.briefName);

  // Plan ID: prefer explicit plan relationship / plan_id before fallback
  const planObj = raw.plan && typeof raw.plan === 'object' ? (raw.plan as Record<string, unknown>) : null;
  const rawPlanId = asText(raw.plan_id ?? planObj?.id ?? raw.planId ?? raw.planner_id);

  // Planner Name: from planner relationship or planner_name
  const plannerObj = raw.planner && typeof raw.planner === 'object' ? (raw.planner as Record<string, unknown>) : null;
  const plannerCreator = plannerObj?.creator && typeof plannerObj.creator === 'object'
    ? (plannerObj.creator as Record<string, unknown>)
    : null;
  const plannerName = asName(plannerObj?.name ?? raw.planner_name ?? raw.plannerName ?? plannerCreator?.name);

  // Submitted Date
  const rawDate = asText(raw.po_date ?? raw.submitted_date ?? raw.submittedDate ?? raw.created_at);

  // Assign By (creator / assigner)
  const creatorObj = raw.creator && typeof raw.creator === 'object' ? (raw.creator as Record<string, unknown>) : null;
  const assignBy = asName(creatorObj?.name ?? raw.assign_by ?? raw.assignBy ?? raw.created_by_name);

  // Finance User (assigned_to / finance_user)
  const assignedToObj = raw.assigned_to && typeof raw.assigned_to === 'object'
    ? (raw.assigned_to as Record<string, unknown>)
    : null;
  const financeUser = asName(assignedToObj?.name ?? raw.finance_user ?? raw.financeUser ?? raw.assign_to ?? raw.assignTo);

  // Statuses
  const costSheetObj = raw.cost_sheet && typeof raw.cost_sheet === 'object'
    ? (raw.cost_sheet as Record<string, unknown>)
    : null;
  const costSheetStatus = asName(raw.cost_sheet_status ?? raw.costSheetStatus ?? costSheetObj?.status);

  const financeStatusObj = raw.finance_status && typeof raw.finance_status === 'object'
    ? (raw.finance_status as Record<string, unknown>)
    : null;
  const financeStatus = asName(financeStatusObj?.name ?? raw.finance_status ?? raw.financeStatus);

  // Line items
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.orders) ? raw.orders : [];
  const orders: OrderLineItem[] = rawItems.map((item, idx) => {
    const record = (item ?? {}) as Record<string, unknown>;
    const orderName = asText(record.order_name ?? record.order ?? record.description ?? `Item ${idx + 1}`);
    const desc = asText(record.description ?? '');
    const hsnSac = asText(record.hsn_sac ?? record.hsnSac ?? record.hsn_code ?? '998361');
    const city = asText(record.city ?? '');
    const slot = (record.slot != null ? record.slot : record.qty != null ? record.qty : 1) as string | number;
    const qty = (record.qty != null ? record.qty : record.slot != null ? record.slot : 1) as string | number;
    const rate = (record.rate != null ? record.rate : 0) as string | number;
    const amount = (record.amount != null ? record.amount : 0) as string | number;

    return {
      id: record.id as number | string | undefined,
      key: `${record.id ?? idx}-${orderName}`,
      order: orderName,
      order_name: orderName,
      description: desc,
      hsnSac,
      hsn_sac: hsnSac,
      city,
      slot,
      qty,
      rate,
      amount,
      status: record.status as string | number | undefined,
    };
  });

  return {
    id: id || poNumber,
    rawId: (raw.id as number | string) || id,
    purchaseOrderId: poNumber,
    briefId: formatIdWithHash(rawBriefId),
    rawBriefId: rawBriefId || undefined,
    briefName: briefName || '—',
    planId: formatIdWithHash(rawPlanId),
    rawPlanId: rawPlanId || undefined,
    plannerName: plannerName || '—',
    submittedDate: formatSubmittedDate(rawDate),
    rawDate: rawDate || null,
    assignBy: assignBy || '—',
    financeUser: financeUser || '—',
    costSheetStatus: costSheetStatus || '—',
    financeStatus: financeStatus || '—',
    fileName: fileName && fileName !== 'download' ? fileName : fileUrl ? fileBaseName(fileUrl) : null,
    fileUrl,
    poFile: rawPoFile || null,
    poFileUrl: fileUrl,

    // Client info
    companyName: asText(raw.company_name) || null,
    clientName: asText(raw.client_name) || null,
    primaryEmail: asText(raw.primary_email) || null,
    gstNumber: asText(raw.gst_number ?? raw.gst_no) || null,
    panNumber: asText(raw.pan_number) || null,
    accountHolderName: asText(raw.account_holder_name) || null,
    accountNumber: asText(raw.account_number) || null,
    ifscCode: asText(raw.ifsc_code) || null,
    bankName: asText(raw.bank_name) || null,
    address: asText(raw.address) || null,
    city: asText(raw.city) || null,
    state: asText(raw.state) || null,
    country: asText(raw.country) || null,
    pincode: asText(raw.pincode) || null,

    // Campaign info
    campaign: asText(raw.campaign) || null,
    period: asText(raw.period) || null,

    // Amounts
    subtotal: (raw.subtotal as number | string) ?? null,
    sgstRate: (raw.sgst_rate as number | string) ?? (raw.sgst as number | string) ?? null,
    sgstAmount: (raw.sgst_amount as number | string) ?? null,
    cgstRate: (raw.cgst_rate as number | string) ?? (raw.cgst as number | string) ?? null,
    cgstAmount: (raw.cgst_amount as number | string) ?? null,
    igstRate: (raw.igst_rate as number | string) ?? (raw.igst as number | string) ?? null,
    igstAmount: (raw.igst_amount as number | string) ?? null,
    taxAmount: (raw.tax_amount as number | string) ?? null,
    totalAmount: (raw.total_amount as number | string) ?? (raw.totalAmount as number | string) ?? null,
    amountInWords: asText(raw.amount_in_words) || null,

    status: (raw.status as string | number) ?? null,
    orders,
    taxDetails: {
      sgst: (raw.sgst_rate as number | string) ?? (raw.sgst as number | string) ?? '',
      cgst: (raw.cgst_rate as number | string) ?? (raw.cgst as number | string) ?? '',
      igst: (raw.igst_rate as number | string) ?? (raw.igst as number | string) ?? '',
      sgst_amount: (raw.sgst_amount as number | string) ?? '',
      cgst_amount: (raw.cgst_amount as number | string) ?? '',
      igst_amount: (raw.igst_amount as number | string) ?? '',
      tax_amount: (raw.tax_amount as number | string) ?? '',
    },
    rawRecord: raw,
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

export function removeStoredClientPurchaseOrder(id: string | number): void {
  try {
    const existing = getStoredClientPurchaseOrders();
    const targetStr = String(id);
    const updated = existing.filter((item) => String(item.id) !== targetStr && String(item.rawId) !== targetStr);
    localStorage.setItem(LOCAL_STORAGE_CLIENT_POS_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal
  }
}

/**
 * Lists Client Purchase Orders from backend API (/api/v1/sales-purchase-orders)
 * with pagination metadata and support for server-side search.
 */
export async function listClientPurchaseOrders(
  params?: ListSalesPurchaseOrdersParams
): Promise<ListSalesPurchaseOrdersResult> {
  const queryParams = new URLSearchParams();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 10;
  queryParams.set('page', String(page));
  queryParams.set('per_page', String(perPage));

  if (params?.search && params.search.trim()) {
    queryParams.set('search', params.search.trim());
  }
  if (params?.brief_id) {
    queryParams.set('brief_id', String(params.brief_id).replace(/^#/, ''));
  }
  if (params?.planner_id) {
    queryParams.set('planner_id', String(params.planner_id).replace(/^#/, ''));
  }
  if (params?.status != null) {
    queryParams.set('status', String(params.status));
  }

  const endpoint = `${ENDPOINTS.CLIENT_PURCHASE_ORDERS.LIST}?${queryParams.toString()}`;
  let remoteRows: ClientPurchaseOrderRow[] = [];
  let pagination: PaginationMeta = {
    current_page: page,
    per_page: perPage,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  };

  try {
    const res = await apiClient.get<any>(endpoint);
    const rawData = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.data)
      ? res.data.data
      : [];

    remoteRows = rawData.map((item: any) => mapRawPurchaseOrder((item ?? {}) as Record<string, unknown>));

    const resAny = res as any;
    const metaPag = resAny?.meta?.pagination ?? resAny?.pagination ?? resAny?.data?.meta?.pagination;
    if (metaPag) {
      const totalCount = Number(metaPag.total ?? remoteRows.length);
      const lastPageCount = Number(
        metaPag.last_page ?? metaPag.totalPages ?? Math.max(1, Math.ceil(totalCount / perPage))
      );
      pagination = {
        current_page: Number(metaPag.current_page ?? metaPag.page ?? page),
        per_page: Number(metaPag.per_page ?? metaPag.limit ?? perPage),
        total: totalCount,
        last_page: lastPageCount,
        from: Number(metaPag.from ?? (remoteRows.length > 0 ? (page - 1) * perPage + 1 : 0)),
        to: Number(metaPag.to ?? (remoteRows.length > 0 ? (page - 1) * perPage + remoteRows.length : 0)),
      };
    } else {
      pagination = {
        current_page: page,
        per_page: perPage,
        total: remoteRows.length,
        last_page: 1,
        from: remoteRows.length > 0 ? 1 : 0,
        to: remoteRows.length,
      };
    }
  } catch (error) {
    console.warn('Could not load sales purchase orders from backend:', error);
    // Fallback: check local storage if available
    const local = getStoredClientPurchaseOrders();
    if (local.length > 0 && !params?.search) {
      return {
        rows: local,
        pagination: {
          current_page: 1,
          per_page: perPage,
          total: local.length,
          last_page: Math.max(1, Math.ceil(local.length / perPage)),
          from: 1,
          to: local.length,
        },
      };
    }
    throw error;
  }

  // Deduplicate and merge newly created local orders that haven't appeared on backend yet
  const localOrders = getStoredClientPurchaseOrders();
  if (localOrders.length > 0 && page === 1 && !params?.search) {
    const existingPoNumbers = new Set(remoteRows.map((r) => r.purchaseOrderId.toLowerCase()));
    const uncommittedLocal = localOrders.filter((l) => !existingPoNumbers.has(l.purchaseOrderId.toLowerCase()));
    if (uncommittedLocal.length > 0) {
      remoteRows = [...uncommittedLocal, ...remoteRows];
      pagination.total += uncommittedLocal.length;
      pagination.to = Math.min(pagination.total, (pagination.from || 1) + remoteRows.length - 1);
    }
  }

  return { rows: remoteRows, pagination };
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
 * Loads Finance User entities (id and name) for a specific Brief Id
 */
export async function getFinanceUserEntitiesForBrief(briefId: string): Promise<FinanceUserOption[]> {
  const cleanId = briefId.replace(/^#/, '').trim();
  if (!cleanId) return [];

  try {
    const users = await listChildFinanceByBrief(cleanId);
    return (users || []).filter((u) => u && u.name);
  } catch (err) {
    console.warn(`Failed to load child finance users for brief ${cleanId}:`, err);
  }

  return [];
}

/**
 * Loads Finance User names for a specific Brief Id (backward-compatible)
 */
export async function getFinanceUsersForBrief(briefId: string): Promise<string[]> {
  const users = await getFinanceUserEntitiesForBrief(briefId);
  return Array.from(new Set(users.map((u) => u.name).filter(Boolean)));
}

/**
 * Creates a Client Purchase Order using multipart form data.
 */
export async function createClientPurchaseOrder(
  payload: CreateClientPurchaseOrderPayload
): Promise<ClientPurchaseOrderRow> {
  const formData = new FormData();
  if (payload.purchaseOrderId) {
    formData.append('po_number', payload.purchaseOrderId);
    formData.append('purchase_order_id', payload.purchaseOrderId);
  }
  const cleanBriefId = payload.briefId ? String(payload.briefId).replace(/^#/, '').trim() : '';
  if (cleanBriefId) {
    formData.append('brief_id', cleanBriefId);
  }
  if (payload.briefName) {
    formData.append('brief_name', payload.briefName);
  }
  const cleanPlanId = payload.planId ? String(payload.planId).replace(/^#/, '').trim() : '';
  if (cleanPlanId) {
    formData.append('planner_id', cleanPlanId);
    formData.append('plan_id', cleanPlanId);
  }
  if (payload.plannerName) {
    formData.append('planner_name', payload.plannerName);
  }
  if (payload.assignBy) {
    formData.append('assign_by', payload.assignBy);
  }

  // Handle assign_to: must be numeric ID for backend validation ('assign_to' => 'nullable|integer|exists:users,id')
  const cleanAssignTo = payload.assignToId != null && String(payload.assignToId).trim() !== ''
    ? String(payload.assignToId).trim()
    : payload.financeUser && /^\d+$/.test(payload.financeUser.trim())
    ? payload.financeUser.trim()
    : '';

  if (cleanAssignTo && Number.isFinite(Number(cleanAssignTo))) {
    formData.append('assign_to', String(Number(cleanAssignTo)));
  }

  if (payload.brandId != null && String(payload.brandId).trim() !== '') {
    formData.append('brand_id', String(Number(payload.brandId)));
  }
  if (payload.financeStatusId != null && String(payload.financeStatusId).trim() !== '') {
    formData.append('finance_status_id', String(Number(payload.financeStatusId)));
  }

  // Handle po_date: format as YYYY-MM-DD
  const rawDate = payload.poDate || payload.submittedDate;
  let formattedPoDate = '';
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    formattedPoDate = rawDate.trim();
  } else {
    const d = rawDate ? new Date(rawDate) : new Date();
    if (!Number.isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      formattedPoDate = `${year}-${month}-${day}`;
    }
  }
  if (formattedPoDate) {
    formData.append('po_date', formattedPoDate);
  }

  if (payload.companyName) {
    formData.append('company_name', payload.companyName);
  }
  if (payload.clientName) {
    formData.append('client_name', payload.clientName);
  }
  if (payload.primaryEmail) {
    formData.append('primary_email', payload.primaryEmail);
  }
  if (payload.gstNumber) {
    formData.append('gst_number', payload.gstNumber);
    formData.append('gst_no', payload.gstNumber);
  }
  if (payload.panNumber) {
    formData.append('pan_number', payload.panNumber);
  }
  if (payload.address) {
    formData.append('address', payload.address);
  }
  if (payload.city) {
    formData.append('city', payload.city);
  }
  if (payload.state) {
    formData.append('state', payload.state);
  }
  if (payload.country) {
    formData.append('country', payload.country);
  }
  if (payload.pincode) {
    formData.append('pincode', payload.pincode);
  }
  if (payload.campaign) {
    formData.append('campaign', payload.campaign);
  }
  if (payload.period) {
    formData.append('period', payload.period);
  }

  if (payload.financeRecordId) {
    formData.append('finance_record_id', payload.financeRecordId);
  }
  if (payload.file) {
    formData.append('po_file', payload.file);
    formData.append('file', payload.file);
  }

  if (payload.orders && payload.orders.length > 0) {
    const formattedOrders = payload.orders.map((o) => ({
      order_name: o.order_name || o.order || 'Line Item',
      description: o.description || o.order || '',
      hsn_sac: o.hsn_sac || o.hsnSac || '998361',
      city: o.city || '',
      slot: Number(o.slot ?? o.qty ?? 1),
      qty: Number(o.qty ?? o.slot ?? 1),
      rate: Number(o.rate ?? 0),
      amount: Number(o.amount ?? 0),
    }));
    formData.append('orders', JSON.stringify(formattedOrders));
    formData.append('items', JSON.stringify(formattedOrders));
  }

  if (payload.taxDetails) {
    formData.append('tax_details', JSON.stringify(payload.taxDetails));
    formData.append('sgst', String(payload.taxDetails.sgst ?? ''));
    formData.append('cgst', String(payload.taxDetails.cgst ?? ''));
    formData.append('igst', String(payload.taxDetails.igst ?? ''));
    formData.append('sgst_rate', String(payload.taxDetails.sgst ?? ''));
    formData.append('cgst_rate', String(payload.taxDetails.cgst ?? ''));
    formData.append('igst_rate', String(payload.taxDetails.igst ?? ''));
  }
  if (payload.subtotal != null) {
    formData.append('subtotal', String(payload.subtotal));
  }
  if (payload.totalAmount != null) {
    formData.append('total_amount', String(payload.totalAmount));
  }

  const res = await apiClient.post<any>(ENDPOINTS.CLIENT_PURCHASE_ORDERS.CREATE, formData);
  const serverResponse = (res && typeof res === 'object' && res.data ? res.data : res) as Record<string, unknown>;
  const newRow: ClientPurchaseOrderRow = mapRawPurchaseOrder(serverResponse);
  saveStoredClientPurchaseOrder(newRow);
  return newRow;
}

/**
 * Delete a client purchase order by ID
 */
export async function deleteClientPurchaseOrder(id: string | number): Promise<void> {
  const cleanId = String(id).replace(/^#/, '');
  try {
    await apiClient.delete<unknown>(ENDPOINTS.CLIENT_PURCHASE_ORDERS.DELETE(cleanId));
  } finally {
    removeStoredClientPurchaseOrder(id);
  }
}

/**
 * Upload a PO document file for an existing purchase order
 */
export async function uploadClientPurchaseOrderFile(
  id: string | number,
  file: File
): Promise<ClientPurchaseOrderRow> {
  const cleanId = String(id).replace(/^#/, '');
  const formData = new FormData();
  formData.append('po_file', file);
  formData.append('file', file);

  const res = await apiClient.post<any>(ENDPOINTS.CLIENT_PURCHASE_ORDERS.UPLOAD(cleanId), formData);
  const data = (res && typeof res === 'object' && res.data ? res.data : res) as Record<string, unknown>;
  const updatedRow = mapRawPurchaseOrder(data);
  saveStoredClientPurchaseOrder(updatedRow);
  return updatedRow;
}

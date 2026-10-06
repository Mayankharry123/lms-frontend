import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';
import { downloadBlobFile, fileBaseName, parseContentDispositionFilename } from '../utils/downloadFile';

export type OperationRow = {
  id: string;
  planId: string;
  briefId: string;
  briefName: string;
  productName: string;
  campaignStartDate: string;
  campaignEndDate: string;
  salesUserName: string;
  plannerName: string;
  assignUser: string;
  status: string;
  operationStatusId?: string;
  fileName: string | null;
  fileUrl: string | null;
};

type OperationsPagination = {
  current_page?: number;
  last_page?: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_PAGES = 50;

const asText = (value: unknown) => (value == null ? '' : String(value).trim());

const formatApiDate = (value: unknown) => {
  const text = asText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text;
  const [, year, month, day] = match;
  const monthLabel = MONTHS[Number(month) - 1];
  return monthLabel ? `${day} ${monthLabel} ${year}` : text;
};

const fileNameFromUrl = (url: string) => {
  try {
    const path = new URL(url, window.location.origin).pathname;
    return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '');
  } catch {
    return '';
  }
};

export function mapOperation(raw: Record<string, unknown>): OperationRow {
  const id = asText(raw.id);
  const backup = raw.backup_plan ?? raw.file;
  const backupObject = backup && typeof backup === 'object' ? (backup as Record<string, unknown>) : null;
  const fileUrl = asText(
    raw.backup_plan_url ?? raw.file_url ?? backupObject?.url ?? (typeof backup === 'string' && /^https?:\/\//i.test(backup) ? backup : '')
  );
  const storedName =
    asText(raw.backup_plan_name ?? raw.file_name ?? backupObject?.name ?? backupObject?.original_name) ||
    (typeof backup === 'string' && !/^https?:\/\//i.test(backup) ? asText(backup) : '') ||
    (fileUrl ? fileNameFromUrl(fileUrl) : '');
  const fileName = storedName ? fileNameFromUrl(storedName) || storedName : '';
  const planId = asText(raw.plan_id ?? raw.brief_id ?? raw.id);
  const briefObject = raw.brief && typeof raw.brief === 'object' ? (raw.brief as Record<string, unknown>) : null;
  const briefId = asText(raw.brief_id ?? raw.briefId ?? briefObject?.id ?? '');

  return {
    id,
    planId: planId ? `#${planId.replace(/^#/, '')}` : '',
    briefId,
    briefName: asText(raw.brief_name),
    productName: asText(raw.product_name),
    campaignStartDate: formatApiDate(raw.campaign_start_date),
    campaignEndDate: formatApiDate(raw.campaign_end_date),
    salesUserName: asText(raw.sales_user_name),
    plannerName: asText(raw.planner_name),
    assignUser: asText(raw.assign_user_name),
    status: asText(raw.operation_status),
    operationStatusId: asText(raw.operation_status_id) || undefined,
    fileName: fileName || null,
    fileUrl: fileUrl || null,
  };
}

/** Path from backup_plan_url, e.g. http://localhost:8000/api/v1/operations/2/backup-plan. */
function backupPlanPath(fileUrl: string, id: string): string {
  try {
    const pathname = new URL(fileUrl, 'http://localhost').pathname;
    const marker = '/api/v1';
    const index = pathname.indexOf(marker);
    const path = index >= 0 ? pathname.slice(index + marker.length) : pathname;
    if (path.startsWith('/operations/')) return path;
  } catch {
    // Fall back to the id from the row.
  }
  return ENDPOINTS.OPERATIONS.BACKUP_PLAN(id);
}

/** GET backup_plan_url with the login token and save the Excel file. */
export async function downloadOperationBackupPlan(row: Pick<OperationRow, 'id' | 'fileUrl' | 'fileName'>): Promise<void> {
  const endpoint = row.fileUrl ? backupPlanPath(row.fileUrl, row.id) : ENDPOINTS.OPERATIONS.BACKUP_PLAN(row.id);
  const response = await apiClient.getBlob(endpoint);
  const blob = await response.blob();
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    const text = await blob.text();
    let message = 'Failed to download backup plan';
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (text.trim()) message = text.trim();
    }
    throw new Error(message);
  }

  if (!blob.size) throw new Error('Downloaded file is empty');

  const filename =
    parseContentDispositionFilename(response.headers.get('content-disposition')) ??
    fileBaseName(row.fileName || 'backup-plan.xlsx');
  downloadBlobFile(filename, blob);
}

/** GET /operations — loads every page so search and export cover all rows. */
export async function updateOperationStatus(
  operationId: string | number,
  statusId: string | number
): Promise<unknown> {
  const formData = new FormData();
  formData.append('status', String(statusId));
  const res = await apiClient.post(ENDPOINTS.OPERATIONS.DETAIL(operationId), formData);
  return res.data;
}

export async function updateOperationAssignUser(
  operationId: string | number,
  assignUserId: string | number,
  statusId?: string | number
): Promise<unknown> {
  const formData = new FormData();
  formData.append('assign_to', String(assignUserId));
  if (statusId !== undefined && statusId !== null && statusId !== '') {
    formData.append('status', String(statusId));
  }
  const res = await apiClient.post(ENDPOINTS.OPERATIONS.UPDATE_ASSIGN_USER(operationId), formData);
  return res.data;
}

export async function listOperations(): Promise<OperationRow[]> {
  const rows: OperationRow[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const res = await apiClient.get<unknown>(`${ENDPOINTS.OPERATIONS.LIST}?page=${page}`);
    const data = Array.isArray(res.data) ? res.data : [];
    rows.push(...data.map((item) => mapOperation((item ?? {}) as Record<string, unknown>)));

    const pagination = (res.meta?.pagination ?? {}) as OperationsPagination;
    lastPage = Number(pagination.last_page) || 1;
    page += 1;
  } while (page <= lastPage && page <= MAX_PAGES);

  return rows;
}

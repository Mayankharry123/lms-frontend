import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';

export type CostSheetStatus = 'Pending' | 'Submitted';
export type FinanceStatus = 'Approved' | 'Denied' | null;

export type CostSheetRow = {
  id: string;
  costSheetId: string;
  briefId: string;
  briefName: string;
  planId: string;
  plannerName: string;
  submittedDate: string;
  assignBy: string;
  assignTo: string;
  costSheetStatus: CostSheetStatus;
  financeStatus: FinanceStatus;
  fileName: string | null;
  fileUrl: string | null;
};

const asText = (value: unknown) => (value == null ? '' : String(value).trim());

const asFinanceStatus = (value: unknown): FinanceStatus => {
  const text = asText(value).toLowerCase();
  if (text === 'approved') return 'Approved';
  if (text === 'denied' || text === 'declined') return 'Denied';
  return null;
};

const asCostSheetStatus = (value: unknown): CostSheetStatus => {
  return asText(value).toLowerCase() === 'submitted' ? 'Submitted' : 'Pending';
};

export function mapCostSheet(raw: Record<string, unknown>): CostSheetRow {
  const id = asText(raw.id ?? raw.cost_sheet_id ?? raw.costSheetId);
  const file = raw.file ?? raw.cost_sheet_file ?? raw.attachment;
  const fileObject = file && typeof file === 'object' ? (file as Record<string, unknown>) : null;
  const fileName = asText(
    raw.file_name ?? raw.fileName ?? fileObject?.name ?? (typeof file === 'string' ? file : '')
  );
  const fileUrl = asText(raw.file_url ?? raw.fileUrl ?? fileObject?.url);

  return {
    id: id || asText(raw.cost_sheet_code),
    costSheetId: asText(raw.cost_sheet_code ?? raw.costSheetId ?? raw.cost_sheet_id) || id,
    briefId: asText(raw.brief_id ?? raw.briefId),
    briefName: asText(raw.brief_name ?? raw.briefName),
    planId: asText(raw.plan_id ?? raw.planId),
    plannerName: asText(raw.planner_name ?? raw.plannerName),
    submittedDate: asText(raw.submitted_date ?? raw.submittedDate),
    assignBy: asText(raw.assign_by ?? raw.assignBy),
    assignTo: asText(raw.assign_to ?? raw.assignTo),
    costSheetStatus: asCostSheetStatus(raw.cost_sheet_status ?? raw.costSheetStatus ?? raw.status),
    financeStatus: asFinanceStatus(raw.finance_status ?? raw.financeStatus),
    fileName: fileName || null,
    fileUrl: fileUrl || null,
  };
}

export async function listCostSheets(): Promise<CostSheetRow[]> {
  const res = await apiClient.get<unknown>(ENDPOINTS.COST_SHEETS.LIST);
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map((item) => mapCostSheet((item ?? {}) as Record<string, unknown>));
}

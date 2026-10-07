import { apiClient } from '../utils/apiClient';
import { handleApiError } from '../utils/apiErrorHandler';
import { listBriefLogs } from './BriefLog';
import type { BriefLogItem } from './BriefLog';
import {
  type DashboardFilterState,
  withDashboardFilters,
} from '../utils/dashboardFilters';

export interface PlannerDashboardBrief {
  id: number;
  brief_name: string;
  brand_name: string;
  product_name: string;
  budget: number;
  submission_date: string;
  status: 'Approve' | 'Submission' | 'Closed';
  left_time: string;
}

export interface PlannerDashboardCardResponse {
  active_briefs: number;
  closed_briefs: number;
  overdue_briefs: number;
  assigned_plans: number;
  average_planning_time_days: number;
  average_assignment_days: number;
}

export interface RecentSubmittedPlan {
  id: string;
  briefId: string;
  briefName: string;
  plannerId?: string;
  planStatus: string;
  plannerName: string;
  submittedAt: number;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asName = (value: unknown): string => {
  const record = asRecord(value);
  if (record) return String(record.name ?? '').trim();
  return value == null ? '' : String(value).trim();
};

const hasSubmittedPlan = (log: BriefLogItem): boolean => {
  const planner = asRecord(log.planner);
  const action = String(log.action ?? '').toLowerCase();
  return (
    (Array.isArray(log.submitted_plan) && log.submitted_plan.length > 0) ||
    (Array.isArray(planner?.submitted_plan) && planner.submitted_plan.length > 0) ||
    (action.includes('plan') && action.includes('submit')) ||
    Boolean(asName(log.planner_status))
  );
};

const mapRecentSubmittedPlan = (log: BriefLogItem): RecentSubmittedPlan | null => {
  const raw = log as Record<string, unknown>;
  const planner = asRecord(raw.planner);
  const assignedPlanner = asRecord(log.assigned_user);
  const creator = asRecord(log.created_by_user);
  const plannerStatus = raw.planner_status;
  if (!hasSubmittedPlan(log)) return null;

  const submittedAt = Date.parse(String(raw.submitted_at ?? log.created_at ?? log.updated_at ?? ''));
  const briefId = raw.brief_id ?? log.id;

  return {
    id: String(log.id),
    briefId: String(briefId),
    briefName: String(raw.brief_name ?? log.name ?? `Brief #${briefId}`),
    plannerId: String(raw.planner_id ?? planner?.id ?? '') || undefined,
    planStatus:
      asName(raw.status_label) ||
      asName(plannerStatus) ||
      asName(raw.status) ||
      'Submitted',
    plannerName:
      asName(planner?.name) ||
      asName(assignedPlanner?.name) ||
      String(raw.planner_name ?? log.user_name ?? creator?.name ?? '').trim() ||
      '—',
    submittedAt: Number.isFinite(submittedAt) ? submittedAt : 0,
  };
};

/** Loads submitted plans from the paginated Brief Log API and sorts newest first. */
export async function getRecentSubmittedPlans(): Promise<RecentSubmittedPlan[]> {
  const logs: BriefLogItem[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await listBriefLogs(page, perPage);
    logs.push(...response.data);
    const pagination = response.meta?.pagination;
    const lastPage = Number(pagination?.last_page ?? pagination?.lastPage);
    if (lastPage ? page >= lastPage : response.data.length < perPage) break;
    page += 1;
  }

  return logs
    .map(mapRecentSubmittedPlan)
    .filter((plan): plan is RecentSubmittedPlan => plan !== null)
    .sort((left, right) => right.submittedAt - left.submittedAt);
}

export async function getLatestFiveBriefs(
  filters?: DashboardFilterState
): Promise<PlannerDashboardBrief[]> {
  try {
    const res = await apiClient.get<PlannerDashboardBrief[]>(
      withDashboardFilters('/briefs/latest/five', filters, { includePriority: false })
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch latest briefs');
    }
    return res.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getPlannerDashboardCard(
  filters?: DashboardFilterState
): Promise<PlannerDashboardCardResponse> {
  try {
    const res = await apiClient.get<PlannerDashboardCardResponse>(
      withDashboardFilters('/briefs/planner-dashboard-card', filters, { includePriority: false })
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch planner dashboard card data');
    }
    return res.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

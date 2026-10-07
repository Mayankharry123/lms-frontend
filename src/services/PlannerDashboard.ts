import { apiClient } from '../utils/apiClient';
import { handleApiError } from '../utils/apiErrorHandler';
import { ENDPOINTS } from '../constants/endpoints';
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

const mapRecentSubmittedPlan = (value: unknown): RecentSubmittedPlan | null => {
  const raw = asRecord(value);
  if (!raw) return null;
  const planner = asRecord(raw.planner);
  const plannerUser = asRecord(planner?.user);
  const assignedPlanner = asRecord(raw.assigned_user);
  const creator = asRecord(raw.created_by_user ?? raw.creator);
  const brief = asRecord(raw.brief);
  const plannerStatus = raw.planner_status;
  const plannerStatusName = asName(plannerStatus);
  const statusLabel = asName(raw.status_label);
  const rowId = raw.id ?? raw.planner_id ?? planner?.id;
  const briefId = brief?.id ?? raw.brief_id;
  if (rowId == null || briefId == null) return null;

  return {
    id: String(rowId),
    briefId: String(briefId),
    briefName: String(brief?.name ?? raw.brief_name ?? `Brief #${briefId}`),
    plannerId: String(raw.planner_id ?? planner?.id ?? '') || undefined,
    planStatus:
      plannerStatusName ||
      (statusLabel.toLowerCase() === 'active' ? '' : statusLabel) ||
      'Submitted',
    plannerName:
      asName(planner?.name) ||
      asName(plannerUser?.name) ||
      asName(assignedPlanner?.name) ||
      String(raw.planner_name ?? raw.user_name ?? creator?.name ?? '').trim() ||
      '—',
    submittedAt: Date.parse(
      String(raw.submitted_at ?? raw.created_at ?? raw.updated_at ?? '')
    ) || 0,
  };
};

/** Loads the latest five submitted plans from the planner dashboard endpoint. */
export async function getRecentSubmittedPlans(): Promise<RecentSubmittedPlan[]> {
  try {
    const response = await apiClient.get<unknown[]>(ENDPOINTS.PLANNERS.SUBMITTED_PLANS_LATEST_FIVE);
    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error(response?.message || 'Failed to fetch latest submitted plans.');
    }
    return response.data
      .map(mapRecentSubmittedPlan)
      .filter((plan): plan is RecentSubmittedPlan => plan !== null)
      .sort((left, right) => right.submittedAt - left.submittedAt);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
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

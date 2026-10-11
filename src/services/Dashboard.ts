import { handleApiError } from '../utils/apiErrorHandler';
import { apiClient } from '../utils/apiClient';
import { ENDPOINTS } from '../constants/endpoints';
import {
  buildDashboardFilterQuery,
  appendDashboardQueryParams,
  withDashboardFilters,
  type DashboardFilterState,
} from '../utils/dashboardFilters';

export type PendingAssignment = {
  id: number;
  // initials may be provided or derived from name
  initials?: string | null;
  // some APIs return a simple string name, others return an object like { id, name }
  name: string | { id: number; name: string; full_name?: string };
  priority: string;
  dueInDays?: number;
  created_at?: string | null;
  progress?: number; // 0-100
  brand?: string | null;
  sub_source?: string | null;
  mobile_numbers?: string[];
};

export type DashboardStats = {
  totalUsers: number;
  pendingAssignments: number;
  teamPerformance: string; // e.g., "92%"
  openAlerts: number;
};

export type Meeting = {
  id: number;
  title: string;
  agenda: string;
  meeting_date: string;
  meeting_time: string;
  meetin_start_date?: string | null;
  meetin_end_date?: string | null;
  lead: { id: number; name: string };
  attendees: { id: number; name: string }[];
  type: string;
  location: string;
  link: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DashboardApiResponse = {
  total_user_count: number;
  pending_lead_count: number;
  team_performance: string | null;
  open_alerts: number | null;
};

const SERVICE_ENDPOINTS = {
  PENDING_ASSIGNMENTS: ENDPOINTS.LEADS.PENDING,
  DASHBOARD_STATS: ENDPOINTS.DASHBOARD.STATS,
  PENDING_ASSIGNMENT_COUNTS: ENDPOINTS.DASHBOARD.UNASSIGNED_COUNTS,
  UNASSIGNED_COUNTS: ENDPOINTS.DASHBOARD.UNASSIGNED_COUNTS,
  LEGACY_PENDING_ASSIGNMENT_COUNTS: ENDPOINTS.DASHBOARD.PENDING_ASSIGNMENTS,
  MEETINGS: ENDPOINTS.MEETINGS.LIST,
} as const;

export type PendingAssignmentCounts = {
  lead: number;
  brief: number;
  plan: number;
  backupPlan: number;
  costSheets: number;
  purchaseOrder: number;
  totalUnassigned?: number;
};

const EMPTY_PENDING_ASSIGNMENT_COUNTS: PendingAssignmentCounts = {
  lead: 0,
  brief: 0,
  plan: 0,
  backupPlan: 0,
  costSheets: 0,
  purchaseOrder: 0,
  totalUnassigned: 0,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toCount = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return toCount(record.count ?? record.total ?? record.pending ?? record.pending_count ?? record.value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
};

const pickCount = (source: Record<string, unknown> | null, keys: string[]): number | null => {
  if (!source) return null;
  for (const key of keys) {
    if (!(key in source)) continue;
    const count = toCount(source[key]);
    if (count != null) return count;
  }
  return null;
};

const extractPendingAssignmentCounts = (payload: unknown): Partial<PendingAssignmentCounts> => {
  const root = asRecord(payload) ?? {};
  const nested =
    asRecord(root.pending_assignments) ??
    asRecord(root.pendingAssignments) ??
    asRecord(root.unassigned_counts) ??
    asRecord(root.unassignedCounts) ??
    asRecord(root.notifications) ??
    asRecord(root.counts) ??
    asRecord(root.data) ??
    root;

  const lead = pickCount(nested, [
    'unassigned_sales',
    'unassigned_sale',
    'unassigned_leads',
    'unassigned_lead',
    'lead',
    'leads',
    'pending_lead',
    'pending_leads',
    'pending_lead_count',
    'lead_count',
    'leads_count',
  ]);
  const brief = pickCount(nested, [
    'unassigned_briefs',
    'unassigned_brief',
    'brief',
    'briefs',
    'pending_brief',
    'pending_briefs',
    'pending_brief_count',
    'brief_count',
    'briefs_count',
  ]);
  const plan = pickCount(nested, [
    'unassigned_planner',
    'unassigned_planners',
    'unassigned_plans',
    'unassigned_plan',
    'plan',
    'plans',
    'pending_plan',
    'pending_plans',
    'pending_plan_count',
    'plan_count',
    'plans_count',
  ]);
  const backupPlan = pickCount(nested, [
    'unassigned_operations',
    'unassigned_operation',
    'unassigned_ops',
    'unassigned_backup_plans',
    'unassigned_backup_plan',
    'unassigned_backupPlan',
    'backup_plan',
    'backupPlan',
    'backup_plans',
    'pending_backup_plan',
    'pending_backup_plans',
    'pending_backup_plan_count',
    'backup_plan_count',
  ]);
  const costSheets = pickCount(nested, [
    'unassigned_finance',
    'unassigned_cost_sheets',
    'unassigned_cost_sheet',
    'unassigned_costSheets',
    'cost_sheet',
    'cost_sheets',
    'costSheet',
    'costSheets',
    'pending_cost_sheet',
    'pending_cost_sheets',
    'pending_cost_sheet_count',
    'cost_sheet_count',
  ]);
  const purchaseOrder = pickCount(nested, [
    'unassigned_purchase_orders',
    'unassigned_purchase_order',
    'unassigned_purchaseOrders',
    'unassigned_purchaseOrder',
    'purchase_order',
    'purchase_orders',
    'purchaseOrder',
    'purchaseOrders',
    'po',
    'pending_purchase_order',
    'pending_purchase_orders',
    'pending_purchase_order_count',
    'purchase_order_count',
  ]);
  const totalUnassigned = pickCount(nested, [
    'total_unassigned',
    'totalUnassigned',
    'total_pending',
    'totalPending',
  ]);

  return {
    ...(lead != null ? { lead } : {}),
    ...(brief != null ? { brief } : {}),
    ...(plan != null ? { plan } : {}),
    ...(backupPlan != null ? { backupPlan } : {}),
    ...(costSheets != null ? { costSheets } : {}),
    ...(purchaseOrder != null ? { purchaseOrder } : {}),
    ...(totalUnassigned != null ? { totalUnassigned } : {}),
  };
};

const mergePendingAssignmentCounts = (
  current: Partial<PendingAssignmentCounts>,
  next: Partial<PendingAssignmentCounts>,
): Partial<PendingAssignmentCounts> => {
  const merged = { ...current };
  (Object.keys(next) as (keyof PendingAssignmentCounts)[]).forEach((key) => {
    if (merged[key] == null && next[key] != null) merged[key] = next[key];
  });
  return merged;
};

const fetchCountPayload = async (
  path: string,
  filters?: DashboardFilterState,
): Promise<Partial<PendingAssignmentCounts>> => {
  const res = await apiClient.get<unknown>(
    withDashboardFilters(path, filters, { includePriority: false }),
  );
  if (!res?.success) return {};
  return extractPendingAssignmentCounts(res.data);
};

const fetchPendingLeadCount = async (filters?: DashboardFilterState): Promise<number | null> => {
  const query = filters ? buildDashboardFilterQuery(filters, { includePriority: true }) : '';
  const res = await apiClient.get<unknown[]>(`${SERVICE_ENDPOINTS.PENDING_ASSIGNMENTS}${query}`);
  if (!res?.success) return null;

  const paginationTotal = res.meta?.pagination?.total;
  if (typeof paginationTotal === 'number' && Number.isFinite(paginationTotal)) {
    return Math.max(0, Math.round(paginationTotal));
  }
  return Array.isArray(res.data) ? res.data.length : null;
};

export async function getPendingAssignmentCounts(
  filters?: DashboardFilterState,
): Promise<PendingAssignmentCounts> {
  let counts: Partial<PendingAssignmentCounts> = {};

  try {
    counts = mergePendingAssignmentCounts(
      counts,
      await fetchCountPayload(SERVICE_ENDPOINTS.UNASSIGNED_COUNTS, filters),
    );
  } catch {
    // Dedicated unassigned counts endpoint is optional; fall back to other backend sources.
  }

  // If filtered fetch returned nothing (e.g. backend route does not support filter params), fetch without filters
  if (Object.keys(counts).length === 0) {
    try {
      counts = mergePendingAssignmentCounts(
        counts,
        await fetchCountPayload(SERVICE_ENDPOINTS.UNASSIGNED_COUNTS),
      );
    } catch {
      // ignore
    }
  }

  // Fallback to legacy pending-assignments endpoint if needed
  if (Object.keys(counts).length === 0) {
    try {
      counts = mergePendingAssignmentCounts(
        counts,
        await fetchCountPayload(SERVICE_ENDPOINTS.LEGACY_PENDING_ASSIGNMENT_COUNTS, filters),
      );
    } catch {
      // ignore
    }
  }

  const missingKeys = (Object.keys(EMPTY_PENDING_ASSIGNMENT_COUNTS) as (keyof PendingAssignmentCounts)[])
    .filter((key) => counts[key] == null);

  if (missingKeys.length > 0) {
    try {
      counts = mergePendingAssignmentCounts(
        counts,
        await fetchCountPayload(SERVICE_ENDPOINTS.DASHBOARD_STATS, filters),
      );
    } catch {
      // Dashboard stats may omit module-specific pending assignment fields.
    }
  }

  if (counts.lead == null) {
    try {
      const leadCount = await fetchPendingLeadCount(filters);
      if (leadCount != null) counts.lead = leadCount;
    } catch {
      // Keep the lead count at zero when the pending-leads source is unavailable.
    }
  }

  return {
    ...EMPTY_PENDING_ASSIGNMENT_COUNTS,
    ...counts,
  };
}

export const getUnassignedCounts = getPendingAssignmentCounts;

export type PendingAssignmentsResponse = {
  data: PendingAssignment[];
};

export type DashboardStatsResponse = {
  data: DashboardStats;
};

export type MeetingsResponse = {
  data: Meeting[];
};

export async function getPendingAssignments(
  filters?: DashboardFilterState
): Promise<PendingAssignmentsResponse> {
  try {
    const query = filters ? buildDashboardFilterQuery(filters, { includePriority: true }) : '';
    const res = await apiClient.get<PendingAssignment[]>(`${SERVICE_ENDPOINTS.PENDING_ASSIGNMENTS}${query}`);
    const json = res;
    if (!json || !json.success) {
      const message = (json as any)?.message || (json as any)?.error || 'Request failed';
      const error = new Error(message);
      (error as any).statusCode = (json as any)?.meta?.status_code || (json as any)?.meta?.status || undefined;
      (error as any).responseData = json;
      handleApiError(error);
      throw error;
    }
    const raw = json.data || [];

    const normalizeName = (v: any): string => {
      if (!v && v !== 0) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object') {
        if (typeof v.name === 'string') return v.name;
        if (typeof v.full_name === 'string') return v.full_name;
        // common nested shape: { id, name }
        if (typeof v.name === 'object' && typeof (v.name as any).name === 'string') return (v.name as any).name;
        return String(v.id || v.name || JSON.stringify(v));
      }
      return String(v);
    };

    const normalizeInitials = (item: any): string => {
      if (item.initials) return String(item.initials);
      const name = normalizeName(item.name || item.lead_name || item.full_name || item.owner || item.assignee);
      if (!name) return '';
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const normalizeCreatedAt = (item: any): string | undefined => {
      return item?.created_at ?? item?.createdAt ?? item?.created_on ?? item?.created ?? undefined;
    };

    const normalized: PendingAssignment[] = (raw || []).map((it: any) => {
      // normalize priority: could be string or object {id, name}
      let pr = 'Low';
      if (it && it.priority !== undefined && it.priority !== null) {
        if (typeof it.priority === 'string') pr = it.priority;
        else if (typeof it.priority === 'object') {
          pr = (it.priority.name && String(it.priority.name)) || String(it.priority.id || 'Low');
        } else {
          pr = String(it.priority);
        }
      }

      return {
        id: Number(it.id),
        name: normalizeName(it.name ?? it.lead_name ?? it.full_name ?? it.owner ?? it.assignee ?? it),
        initials: normalizeInitials(it),
        priority: pr,
        dueInDays: it.due_in_days ?? it.dueInDays ?? (typeof it.due === 'number' ? it.due : undefined),
        created_at: normalizeCreatedAt(it),
        progress: typeof it.progress === 'number' ? it.progress : undefined,
        brand: it.brand ?? it.brand_name ?? null,
        sub_source: it.sub_source ?? it.source ?? null,
        mobile_numbers: Array.isArray(it.mobile_numbers) ? it.mobile_numbers : (it.mobile_number ? [it.mobile_number] : []),
      } as PendingAssignment;
    });

    return {
      data: normalized,
    };
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getDashboardStats(
  filters?: DashboardFilterState
): Promise<DashboardStatsResponse> {
  try {
    const query = filters ? buildDashboardFilterQuery(filters, { includePriority: false }) : '';
    const res = await apiClient.get<DashboardApiResponse>(`${SERVICE_ENDPOINTS.DASHBOARD_STATS}${query}`);
    const json = res;
    if (!json || !json.success) {
      const message = (json as any)?.message || (json as any)?.error || 'Request failed';
      const error = new Error(message);
      (error as any).statusCode = (json as any)?.meta?.status_code || (json as any)?.meta?.status || undefined;
      (error as any).responseData = json;
      handleApiError(error);
      throw error;
    }
    const data = json.data as DashboardApiResponse;

    return {
      data: {
        totalUsers: data.total_user_count || 0,
        pendingAssignments: data.pending_lead_count || 0,
        teamPerformance: data.team_performance || '0%',
        openAlerts: data.open_alerts || 0,
      },
    };
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getMeetings(
  filters?: DashboardFilterState
): Promise<MeetingsResponse> {
  try {
    const endpoint = appendDashboardQueryParams(
      SERVICE_ENDPOINTS.MEETINGS,
      filters,
      { per_page: 50 },
      { includePriority: false }
    );
    const res = await apiClient.get<Meeting[]>(endpoint);
    const json = res;
    if (!json || !json.success) {
      const message = (json as any)?.message || (json as any)?.error || 'Request failed';
      const error = new Error(message);
      (error as any).statusCode = (json as any)?.meta?.status_code || (json as any)?.meta?.status || undefined;
      (error as any).responseData = json;
      handleApiError(error);
      throw error;
    }
    const raw = Array.isArray(json.data)
      ? json.data
      : Array.isArray((json.data as { data?: Meeting[] })?.data)
        ? (json.data as { data: Meeting[] }).data
        : [];

    const normalized: Meeting[] = (raw || []).map((it: any) => ({
      id: Number(it.id),
      title: it.title || '',
      agenda: it.agenda || '',
      meeting_date: it.meeting_date || '',
      meeting_time: it.meeting_time || '',
      meetin_start_date: it.meetin_start_date ?? null,
      meetin_end_date: it.meetin_end_date ?? null,
      lead: it.lead || { id: 0, name: '' },
      attendees: it.attendees || [],
      type: it.type || '',
      location: it.location || '',
      link: it.link || '',
      status: it.status || '',
      created_at: it.created_at || '',
      updated_at: it.updated_at || '',
    }));

    return {
      data: normalized,
    };
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}
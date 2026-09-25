import { apiClient } from '../utils/apiClient';
import { handleApiError } from '../utils/apiErrorHandler';
import {
  type DashboardFilterState,
  withDashboardFilters,
} from '../utils/dashboardFilters';

export type DashboardChartOrganisationRow = {
  organisationId: string;
  organisationName: string;
  totalLeads: number;
  preLeads: number;
  briefs: number;
  briefBudget: number;
};

export type DashboardChartMetrics = {
  rows: DashboardChartOrganisationRow[];
  totals: {
    totalLeads: number;
    preLeads: number;
    briefs: number;
    briefBudget: number;
  };
};

const EMPTY_METRICS: DashboardChartMetrics = {
  rows: [],
  totals: { totalLeads: 0, preLeads: 0, briefs: 0, briefBudget: 0 },
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value != null && value !== '') return String(value);
  }
  return '';
}

function normalizeRow(raw: unknown, index: number): DashboardChartOrganisationRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const organisationName = pickString(record, [
    'organisation_name',
    'organization_name',
    'name',
    'label',
  ]);
  const organisationId = pickString(record, [
    'organisation_id',
    'organization_id',
    'id',
  ]) || String(index + 1);

  if (!organisationName) return null;

  return {
    organisationId,
    organisationName,
    totalLeads: toNumber(record.total_leads ?? record.totalLeads ?? record.leads),
    preLeads: toNumber(record.pre_leads ?? record.preLeads ?? record.miss_campaigns),
    briefs: toNumber(record.briefs ?? record.total_briefs ?? record.brief_count),
    briefBudget: toNumber(record.brief_budget ?? record.briefBudget ?? record.total_budget),
  };
}

function normalizeChartMetrics(data: unknown): DashboardChartMetrics {
  if (!data) return EMPTY_METRICS;

  const payload = data as Record<string, unknown>;
  const rawRows = Array.isArray(data)
    ? data
    : Array.isArray(payload.by_organisation)
      ? payload.by_organisation
      : Array.isArray(payload.by_organization)
        ? payload.by_organization
        : Array.isArray(payload.organisations)
          ? payload.organisations
          : Array.isArray(payload.data)
            ? payload.data
            : [];

  const rows = rawRows
    .map((row, index) => normalizeRow(row, index))
    .filter((row): row is DashboardChartOrganisationRow => row != null);

  const totalsSource = (payload.totals ?? payload.summary ?? payload) as Record<string, unknown>;

  const totals = {
    totalLeads: toNumber(totalsSource.total_leads ?? totalsSource.totalLeads),
    preLeads: toNumber(totalsSource.pre_leads ?? totalsSource.preLeads),
    briefs: toNumber(totalsSource.briefs ?? totalsSource.total_briefs),
    briefBudget: toNumber(totalsSource.brief_budget ?? totalsSource.briefBudget ?? totalsSource.total_budget),
  };

  const hasTotals = Object.values(totals).some((value) => value > 0);
  const computedTotals = hasTotals
    ? totals
    : {
        totalLeads: rows.reduce((sum, row) => sum + row.totalLeads, 0),
        preLeads: rows.reduce((sum, row) => sum + row.preLeads, 0),
        briefs: rows.reduce((sum, row) => sum + row.briefs, 0),
        briefBudget: rows.reduce((sum, row) => sum + row.briefBudget, 0),
      };

  return { rows, totals: computedTotals };
}

export async function getDashboardChartMetrics(
  filters?: DashboardFilterState
): Promise<DashboardChartMetrics> {
  try {
    const res = await apiClient.get<unknown>(
      withDashboardFilters('/dashboard/charts', filters, { includePriority: false })
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch dashboard chart metrics');
    }
    return normalizeChartMetrics(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export type SalesChartOrganisationRow = {
  organisationId: string;
  organisationName: string;
  totalLeads: number;
  briefs: number;
  briefBudget: number;
};

export type SalesChartMetrics = {
  rows: SalesChartOrganisationRow[];
  totals: {
    totalLeads: number;
    briefs: number;
    briefBudget: number;
  };
  pipeline: {
    newLeads: number;
    followUp: number;
    meetingScheduled: number;
    briefs: number;
  };
  userLeadPerformance: SalesUserLeadPerformance[];
  zonePerformance: SalesZoneLeadPerformance[];
};

export type SalesZoneLeadPerformance = {
  zoneId: string;
  zoneName: string;
  assignedLeads: number;
};

export type SalesUserLead = {
  leadId: string;
  contactPerson: string;
  callStatus: string;
  leadStatus: string;
  priority: string;
};

export type SalesUserLeadPerformance = {
  userId: string;
  userName: string;
  email: string;
  leads: SalesUserLead[];
  leadCount?: number;
  children?: SalesUserLeadPerformance[];
};

export type DashboardPriority = {
  id: string;
  name: string;
};

export type DashboardStatus = {
  id: string;
  name: string;
};

export type DashboardCallStatus = {
  id: string;
  name: string;
};

export type PlannerChartOrganisationRow = {
  organisationId: string;
  organisationName: string;
  briefs: number;
  briefBudget: number;
  assignedPlans: number;
  avgAssignmentDays: number;
};

export type PlannerChartMetrics = {
  rows: PlannerChartOrganisationRow[];
  totals: {
    briefs: number;
    briefBudget: number;
    assignedPlans: number;
    avgAssignmentDays: number;
  };
  briefStatus: {
    activeBriefs: number;
    closedBriefs: number;
    overdueBriefs: number;
  };
};

function normalizeSalesRow(raw: unknown, index: number): SalesChartOrganisationRow | null {
  const base = normalizeRow(raw, index);
  if (!base) return null;
  return {
    organisationId: base.organisationId,
    organisationName: base.organisationName,
    totalLeads: base.totalLeads,
    briefs: base.briefs,
    briefBudget: base.briefBudget,
  };
}

function normalizeSalesMetrics(data: unknown): SalesChartMetrics {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawRows = Array.isArray(payload.by_organisation) ? payload.by_organisation : [];
  const rows = rawRows
    .map((row, index) => normalizeSalesRow(row, index))
    .filter((row): row is SalesChartOrganisationRow => row != null);

  const totalsSource = (payload.totals ?? {}) as Record<string, unknown>;
  const pipelineSource = (payload.pipeline ?? {}) as Record<string, unknown>;
  const rawZones = Array.isArray(payload.by_zone)
    ? payload.by_zone
    : Array.isArray(payload.zone_performance)
      ? payload.zone_performance
      : Array.isArray(payload.zonePerformance)
        ? payload.zonePerformance
        : [];
  const zonePerformance = rawZones.reduce<SalesZoneLeadPerformance[]>((zones, rawZone, zoneIndex) => {
    if (!rawZone || typeof rawZone !== 'object') return zones;
    const zone = rawZone as Record<string, unknown>;
    const zoneName = pickString(zone, ['zone_name', 'zoneName', 'name', 'label']);
    if (!zoneName) return zones;
    zones.push({
      zoneId: pickString(zone, ['zone_id', 'zoneId', 'id']) || String(zoneIndex + 1),
      zoneName,
      assignedLeads: toNumber(zone.assigned_leads ?? zone.assignedLeads ?? zone.lead_count ?? zone.total_leads ?? zone.count),
    });
    return zones;
  }, []);
  const rawUsers = Array.isArray(payload.user_lead_performance)
    ? payload.user_lead_performance
    : Array.isArray(payload.userLeadPerformance)
      ? payload.userLeadPerformance
      : [];
  const userLeadPerformance = rawUsers.reduce<SalesUserLeadPerformance[]>((users, rawUser, userIndex) => {
    if (!rawUser || typeof rawUser !== 'object') return users;
    const user = rawUser as Record<string, unknown>;
    const rawLeads = Array.isArray(user.leads) ? user.leads : [];
    const leads = rawLeads.reduce<SalesUserLead[]>((items, rawLead, leadIndex) => {
      if (!rawLead || typeof rawLead !== 'object') return items;
      const lead = rawLead as Record<string, unknown>;
      items.push({
        leadId: pickString(lead, ['lead_id', 'leadId', 'id']) || String(leadIndex + 1),
          contactPerson: pickString(lead, ['contact_person_name', 'contact_person', 'contactPerson', 'contact_name', 'name']) || 'Unknown contact',
        callStatus: pickString(lead, ['call_status', 'callStatus']) || 'Not set',
        leadStatus: pickString(lead, ['lead_status', 'leadStatus', 'status']) || 'Not set',
        priority: pickString(lead, ['priority']) || 'Not set',
      });
      return items;
    }, []);
    users.push({
      userId: pickString(user, ['user_id', 'userId', 'id']) || String(userIndex + 1),
      userName: pickString(user, ['user_name', 'userName', 'name']) || 'Unnamed user',
      email: pickString(user, ['email', 'user_email', 'userEmail']),
      leads,
    });
    return users;
  }, []);

  return {
    rows,
    totals: {
      totalLeads: toNumber(totalsSource.total_leads ?? totalsSource.totalLeads),
      briefs: toNumber(totalsSource.briefs),
      briefBudget: toNumber(totalsSource.brief_budget ?? totalsSource.briefBudget),
    },
    pipeline: {
      newLeads: toNumber(pipelineSource.new_leads ?? pipelineSource.newLeads),
      followUp: toNumber(pipelineSource.follow_up ?? pipelineSource.followUp),
      meetingScheduled: toNumber(pipelineSource.meeting_scheduled ?? pipelineSource.meetingScheduled),
      briefs: toNumber(pipelineSource.briefs),
    },
    userLeadPerformance,
    zonePerformance,
  };
}

function normalizeUserLeadPerformance(data: unknown): SalesUserLeadPerformance[] {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawUsers = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.users)
        ? payload.users
        : Array.isArray(payload.child_users)
          ? payload.child_users
          : [];

  const normalizeUser = (rawUser: unknown, userIndex: number): SalesUserLeadPerformance | null => {
    if (!rawUser || typeof rawUser !== 'object') return null;
    const user = rawUser as Record<string, unknown>;
    const rawLeads = Array.isArray(user.leads)
      ? user.leads
      : Array.isArray(user.assigned_leads)
        ? user.assigned_leads
        : Array.isArray(user.lead_performance)
          ? user.lead_performance
          : [];

    const leads = rawLeads.reduce<SalesUserLead[]>((items, rawLead, leadIndex) => {
      if (!rawLead || typeof rawLead !== 'object') return items;
      const lead = rawLead as Record<string, unknown>;
      items.push({
        leadId: pickString(lead, ['lead_id', 'leadId', 'id']) || String(leadIndex + 1),
        contactPerson: pickString(lead, ['contact_person_name', 'contact_person', 'contactPerson', 'contact_name', 'name']) || 'Unknown contact',
        callStatus: pickString(lead, ['call_status', 'callStatus']) || 'Not set',
        leadStatus: pickString(lead, ['lead_status', 'leadStatus', 'status']) || 'Not set',
        priority: pickString(lead, ['priority']) || 'Not set',
      });
      return items;
    }, []);
    const rawLeadCount =
      user.lead_count ??
      user.leads_count ??
      user.total_leads ??
      user.assigned_leads_count ??
      user.leadCount ??
      user.leadsCount ??
      user.totalLeads ??
      user.count;

    const rawChildren = Array.isArray(user.children) ? user.children : [];
    const children = rawChildren
      .map((child, childIndex) => normalizeUser(child, childIndex))
      .filter((child): child is SalesUserLeadPerformance => child !== null);

    return {
      userId: pickString(user, ['user_id', 'userId', 'id']) || String(userIndex + 1),
      userName: pickString(user, ['user_name', 'userName', 'name', 'full_name']) || 'Unnamed user',
      email: pickString(user, ['email', 'user_email', 'userEmail']),
      leads,
      ...(rawLeadCount !== undefined && rawLeadCount !== null
        ? { leadCount: toNumber(rawLeadCount) }
        : {}),
      ...(children.length > 0 ? { children } : {}),
    };
  };

  return rawUsers
    .map((rawUser, userIndex) => normalizeUser(rawUser, userIndex))
    .filter((user): user is SalesUserLeadPerformance => user !== null);
}

function normalizeLeadPerformance(data: unknown): SalesUserLead[] {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawLeads = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.leads)
        ? payload.leads
        : Array.isArray(payload.results)
          ? payload.results
          : [];

  return rawLeads.reduce<SalesUserLead[]>((leads, rawLead, leadIndex) => {
    if (!rawLead || typeof rawLead !== 'object') return leads;
    const lead = rawLead as Record<string, unknown>;
    leads.push({
      leadId: pickString(lead, ['lead_id', 'leadId', 'id']) || String(leadIndex + 1),
      contactPerson: pickString(lead, ['contact_person_name', 'contact_person', 'contactPerson', 'contact_name', 'name']) || 'Unknown contact',
      callStatus: pickString(lead, ['call_status', 'callStatus']) || 'Not set',
      leadStatus: pickString(lead, ['lead_status', 'leadStatus', 'status']) || 'Not set',
      priority: pickString(lead, ['priority']) || 'Not set',
    });
    return leads;
  }, []);
}

function normalizePriorities(data: unknown): DashboardPriority[] {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawPriorities = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.priorities)
        ? payload.priorities
        : [];

  return rawPriorities.reduce<DashboardPriority[]>((priorities, rawPriority) => {
    if (!rawPriority || typeof rawPriority !== 'object') return priorities;
    const priority = rawPriority as Record<string, unknown>;
    const id = pickString(priority, ['id', 'value']);
    const name = pickString(priority, ['name', 'label', 'title']);
    if (id && name) priorities.push({ id, name });
    return priorities;
  }, []);
}

function normalizeStatuses(data: unknown): DashboardStatus[] {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawStatuses = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.statuses)
        ? payload.statuses
        : [];

  return rawStatuses.reduce<DashboardStatus[]>((statuses, rawStatus) => {
    if (!rawStatus || typeof rawStatus !== 'object') return statuses;
    const status = rawStatus as Record<string, unknown>;
    const id = pickString(status, ['id', 'value']);
    const name = pickString(status, ['name', 'label', 'title']);
    if (id && name) statuses.push({ id, name });
    return statuses;
  }, []);
}

function normalizeCallStatuses(data: unknown): DashboardCallStatus[] {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawCallStatuses = Array.isArray(data)
    ? data
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.call_statuses)
        ? payload.call_statuses
        : [];

  return rawCallStatuses.reduce<DashboardCallStatus[]>((statuses, rawCallStatus) => {
    if (!rawCallStatus || typeof rawCallStatus !== 'object') return statuses;
    const callStatus = rawCallStatus as Record<string, unknown>;
    const id = pickString(callStatus, ['id', 'value']);
    const name = pickString(callStatus, ['name', 'label', 'title']);
    if (id && name) statuses.push({ id, name });
    return statuses;
  }, []);
}

function normalizePlannerRow(raw: unknown, index: number): PlannerChartOrganisationRow | null {
  const base = normalizeRow(raw, index);
  if (!base) return null;
  const record = raw as Record<string, unknown>;

  return {
    organisationId: base.organisationId,
    organisationName: base.organisationName,
    briefs: base.briefs,
    briefBudget: base.briefBudget,
    assignedPlans: toNumber(record.assigned_plans ?? record.assignedPlans),
    avgAssignmentDays: toNumber(
      record.avg_plan_submission_days
      ?? record.avg_assignment_days
      ?? record.avgAssignmentDays
    ),
  };
}

function normalizePlannerMetrics(data: unknown): PlannerChartMetrics {
  const payload = (data ?? {}) as Record<string, unknown>;
  const rawRows = Array.isArray(payload.by_organisation) ? payload.by_organisation : [];
  const rows = rawRows
    .map((row, index) => normalizePlannerRow(row, index))
    .filter((row): row is PlannerChartOrganisationRow => row != null);

  const totalsSource = (payload.totals ?? {}) as Record<string, unknown>;
  const statusSource = (payload.brief_status ?? payload.briefStatus ?? {}) as Record<string, unknown>;

  return {
    rows,
    totals: {
      briefs: toNumber(totalsSource.briefs),
      briefBudget: toNumber(totalsSource.brief_budget ?? totalsSource.briefBudget),
      assignedPlans: toNumber(totalsSource.assigned_plans ?? totalsSource.assignedPlans),
      avgAssignmentDays: toNumber(
        totalsSource.avg_plan_submission_days
        ?? totalsSource.avg_assignment_days
        ?? totalsSource.avgAssignmentDays
      ),
    },
    briefStatus: {
      activeBriefs: toNumber(statusSource.active_briefs ?? statusSource.activeBriefs),
      closedBriefs: toNumber(statusSource.closed_briefs ?? statusSource.closedBriefs),
      overdueBriefs: toNumber(statusSource.overdue_briefs ?? statusSource.overdueBriefs),
    },
  };
}

export async function getSalesChartMetrics(
  filters?: DashboardFilterState
): Promise<SalesChartMetrics> {
  try {
    const res = await apiClient.get<unknown>(
      withDashboardFilters('/dashboard/sales-charts', filters, { includePriority: false })
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch sales chart metrics');
    }
    return normalizeSalesMetrics(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getChildUsersByOrganisation(
  organisationIds: string[] = [],
  filters?: { callStatus?: string; leadStatus?: string; priority?: string; zoneIds?: string[] },
): Promise<SalesUserLeadPerformance[]> {
  try {
    const params = new URLSearchParams();
    organisationIds.forEach((id) => {
      if (id) params.append('organisation_id[]', id);
    });
    filters?.zoneIds?.forEach((id) => {
      if (id) params.append('zone_id[]', id);
    });
    if (filters?.callStatus) params.append('call_status', filters.callStatus);
    if (filters?.leadStatus) params.append('lead_status', filters.leadStatus);
    if (filters?.priority) params.append('priority', filters.priority);
    const query = params.toString();
    const res = await apiClient.get<unknown>(
      `/profile/child-users-by-organisation${query ? `?${query}` : ''}`,
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch child users by organisation');
    }
    return normalizeUserLeadPerformance(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export type LeadPerformanceFilters = {
  callStatus?: string;
  leadStatus?: string;
  priority?: string;
};

export async function getLeadPerformance(
  userId: string,
  filters?: LeadPerformanceFilters,
): Promise<SalesUserLead[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.callStatus) params.append('call_status', filters.callStatus);
    if (filters?.leadStatus) params.append('lead_status', filters.leadStatus);
    if (filters?.priority) params.append('priority', filters.priority);
    const query = params.toString();
    const res = await apiClient.get<unknown>(
      `/leads/user-performance/${encodeURIComponent(userId)}${query ? `?${query}` : ''}`,
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch lead performance');
    }
    return normalizeLeadPerformance(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getPriorities(): Promise<DashboardPriority[]> {
  try {
    const res = await apiClient.get<unknown>('/priorities');
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch priorities');
    }
    return normalizePriorities(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getStatuses(): Promise<DashboardStatus[]> {
  try {
    const res = await apiClient.get<unknown>('/statuses');
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch statuses');
    }
    return normalizeStatuses(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getCallStatuses(): Promise<DashboardCallStatus[]> {
  try {
    const res = await apiClient.get<unknown>('/call-statuses');
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch call statuses');
    }
    return normalizeCallStatuses(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export async function getPlannerChartMetrics(
  filters?: DashboardFilterState
): Promise<PlannerChartMetrics> {
  try {
    const res = await apiClient.get<unknown>(
      withDashboardFilters('/dashboard/planner-charts', filters, { includePriority: false })
    );
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to fetch planner chart metrics');
    }
    return normalizePlannerMetrics(res.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

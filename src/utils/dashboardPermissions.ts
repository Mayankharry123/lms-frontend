import { useMemo } from 'react';
import { useSidebarMenu } from '../hooks/SidebarMenuHooks';
import type { DashboardView } from './dashboardCardVisibility';

export const DASHBOARD_PERMISSIONS = {
  LEGACY_READ: 'dashboard.read',
  OVERVIEW: 'dashboard.overview',
  SALES: 'dashboard.sales',
  PLANNER: 'dashboard.planner',
  OVERVIEW_STATS: 'dashboard.overview.stats',
  OVERVIEW_ASSIGNMENTS: 'dashboard.overview.assignments',
  OVERVIEW_MEETINGS: 'dashboard.overview.meetings',
  CHART_LEADS: 'dashboard.charts.leads',
  CHART_PRE_LEADS: 'dashboard.charts.pre-leads',
  CHART_BRIEFS: 'dashboard.charts.briefs',
  CHART_BRIEF_BUDGET: 'dashboard.charts.brief-budget',
  CHART_PIPELINE: 'dashboard.charts.pipeline',
  CHART_BRIEF_STATUS: 'dashboard.charts.brief-status',
} as const;

export type DashboardChartKey =
  | 'totalLeads'
  | 'preLeads'
  | 'briefs'
  | 'briefBudget'
  | 'assignedPlans'
  | 'avgAssignmentDays';

const CHART_KEY_PERMISSIONS: Record<DashboardChartKey, string> = {
  totalLeads: DASHBOARD_PERMISSIONS.CHART_LEADS,
  preLeads: DASHBOARD_PERMISSIONS.CHART_PRE_LEADS,
  briefs: DASHBOARD_PERMISSIONS.CHART_BRIEFS,
  briefBudget: DASHBOARD_PERMISSIONS.CHART_BRIEF_BUDGET,
  assignedPlans: DASHBOARD_PERMISSIONS.CHART_BRIEFS,
  avgAssignmentDays: DASHBOARD_PERMISSIONS.CHART_BRIEF_STATUS,
};

export function createDashboardPermissionChecker(hasPermission: (name: string) => boolean) {
  const can = (permission: string) =>
    hasPermission(permission) || hasPermission(DASHBOARD_PERMISSIONS.LEGACY_READ);

  return {
    canViewOverviewTab: () => can(DASHBOARD_PERMISSIONS.OVERVIEW),
    canViewSalesTab: () => can(DASHBOARD_PERMISSIONS.SALES),
    canViewPlannerTab: () => can(DASHBOARD_PERMISSIONS.PLANNER),
    canViewOverviewStats: () => can(DASHBOARD_PERMISSIONS.OVERVIEW_STATS),
    canViewPendingAssignments: () => can(DASHBOARD_PERMISSIONS.OVERVIEW_ASSIGNMENTS),
    canViewMeetings: () => can(DASHBOARD_PERMISSIONS.OVERVIEW_MEETINGS),
    canViewChart: (chartKey: DashboardChartKey) => can(CHART_KEY_PERMISSIONS[chartKey]),
    canViewPipelineChart: () => can(DASHBOARD_PERMISSIONS.CHART_PIPELINE),
    canViewBriefStatusChart: () => can(DASHBOARD_PERMISSIONS.CHART_BRIEF_STATUS),
  };
}

export type DashboardPermissionChecker = ReturnType<typeof createDashboardPermissionChecker>;

const VIEW_ACCESS: Record<DashboardView, (permissions: DashboardPermissionChecker) => boolean> = {
  overview: (permissions) => permissions.canViewOverviewTab(),
  sales: (permissions) => permissions.canViewSalesTab(),
  planner: (permissions) => permissions.canViewPlannerTab(),
};

const CARD_ACCESS: Record<string, (permissions: DashboardPermissionChecker) => boolean> = {
  'overview.total-users': (permissions) => permissions.canViewOverviewStats(),
  'overview.pending-assignments': (permissions) => permissions.canViewOverviewStats(),
  'overview.monthly-revenue': (permissions) => permissions.canViewOverviewStats(),
  'overview.total-leads-analytics': (permissions) => permissions.canViewChart('totalLeads'),
  'overview.pre-leads-analytics': (permissions) => permissions.canViewChart('preLeads'),
  'overview.briefs-analytics': (permissions) => permissions.canViewChart('briefs'),
  'overview.brief-budget-analytics': (permissions) => permissions.canViewChart('briefBudget'),
  'overview.pending-assignments-list': (permissions) => permissions.canViewPendingAssignments(),
  'overview.meetings': (permissions) => permissions.canViewMeetings(),
  'sales.total-leads-analytics': (permissions) => permissions.canViewChart('totalLeads'),
  'sales.briefs-analytics': (permissions) => permissions.canViewChart('briefs'),
  'sales.brief-budget': (permissions) => permissions.canViewChart('briefBudget'),
  'sales.sales-pipeline': (permissions) => permissions.canViewPipelineChart(),
  'planner.briefs-analytics': (permissions) => permissions.canViewChart('briefs'),
  'planner.assigned-plans-analytics': (permissions) => permissions.canViewChart('assignedPlans'),
  'planner.avg-submission-analytics': (permissions) => permissions.canViewChart('avgAssignmentDays'),
  'planner.brief-budget-analytics': (permissions) => permissions.canViewChart('briefBudget'),
  'planner.brief-status': (permissions) => permissions.canViewBriefStatusChart(),
};

export function canShowDashboardCard(
  permissions: DashboardPermissionChecker,
  view: DashboardView,
  cardId: string,
) {
  if (!VIEW_ACCESS[view](permissions)) return false;
  return CARD_ACCESS[cardId]?.(permissions) ?? true;
}

export function useDashboardPermissions() {
  const { allPermittedSlugs } = useSidebarMenu();

  return useMemo(
    () => createDashboardPermissionChecker((slug) => allPermittedSlugs.includes(slug)),
    [allPermittedSlugs],
  );
}

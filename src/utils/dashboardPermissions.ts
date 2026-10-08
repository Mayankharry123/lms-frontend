import { useMemo } from 'react';
import { useSidebarMenu } from '../hooks/SidebarMenuHooks';
import type { DashboardView } from './dashboardCardVisibility';

export const DASHBOARD_PERMISSIONS = {
  LEGACY_READ: 'dashboard.read',
  OVERVIEW: 'dashboard.overview',
  SALES: 'dashboard.sales',
  PLANNER: 'dashboard.planner',
  OPERATIONS: 'dashboard.operations',
  FINANCE: 'dashboard.finance',
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
  | 'avgAssignmentDays'
  | 'operations'
  | 'pendingOperations'
  | 'liveOperations'
  | 'assignedOperations'
  | 'costSheets'
  | 'approvedFinance'
  | 'deniedFinance'
  | 'purchaseOrderAmount';

const CHART_KEY_PERMISSIONS: Record<DashboardChartKey, string> = {
  totalLeads: DASHBOARD_PERMISSIONS.CHART_LEADS,
  preLeads: DASHBOARD_PERMISSIONS.CHART_PRE_LEADS,
  briefs: DASHBOARD_PERMISSIONS.CHART_BRIEFS,
  briefBudget: DASHBOARD_PERMISSIONS.CHART_BRIEF_BUDGET,
  assignedPlans: DASHBOARD_PERMISSIONS.CHART_BRIEFS,
  avgAssignmentDays: DASHBOARD_PERMISSIONS.CHART_BRIEF_STATUS,
  operations: DASHBOARD_PERMISSIONS.OPERATIONS,
  pendingOperations: DASHBOARD_PERMISSIONS.OPERATIONS,
  liveOperations: DASHBOARD_PERMISSIONS.OPERATIONS,
  assignedOperations: DASHBOARD_PERMISSIONS.OPERATIONS,
  costSheets: DASHBOARD_PERMISSIONS.FINANCE,
  approvedFinance: DASHBOARD_PERMISSIONS.FINANCE,
  deniedFinance: DASHBOARD_PERMISSIONS.FINANCE,
  purchaseOrderAmount: DASHBOARD_PERMISSIONS.FINANCE,
};

export function createDashboardPermissionChecker(hasPermission: (name: string) => boolean) {
  const can = (permission: string) =>
    hasPermission(permission) || hasPermission(DASHBOARD_PERMISSIONS.LEGACY_READ);

  return {
    canViewOverviewTab: () => can(DASHBOARD_PERMISSIONS.OVERVIEW),
    canViewSalesTab: () => can(DASHBOARD_PERMISSIONS.SALES),
    canViewPlannerTab: () => can(DASHBOARD_PERMISSIONS.PLANNER),
    canViewOperationsTab: () => can(DASHBOARD_PERMISSIONS.OPERATIONS),
    canViewFinanceTab: () => can(DASHBOARD_PERMISSIONS.FINANCE),
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
  operations: (permissions) => permissions.canViewOperationsTab(),
  finance: (permissions) => permissions.canViewFinanceTab(),
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
  'operations.total': (permissions) => permissions.canViewOperationsTab(),
  'operations.pending': (permissions) => permissions.canViewOperationsTab(),
  'operations.live': (permissions) => permissions.canViewOperationsTab(),
  'operations.assigned': (permissions) => permissions.canViewOperationsTab(),
  'operations.operations-analytics': (permissions) => permissions.canViewChart('operations'),
  'operations.pending-analytics': (permissions) => permissions.canViewChart('pendingOperations'),
  'operations.live-analytics': (permissions) => permissions.canViewChart('liveOperations'),
  'operations.assigned-analytics': (permissions) => permissions.canViewChart('assignedOperations'),
  'operations.status': (permissions) => permissions.canViewOperationsTab(),
  'operations.recent': (permissions) => permissions.canViewOperationsTab(),
  'finance.cost-sheets': (permissions) => permissions.canViewFinanceTab(),
  'finance.pending': (permissions) => permissions.canViewFinanceTab(),
  'finance.approved': (permissions) => permissions.canViewFinanceTab(),
  'finance.purchase-orders': (permissions) => permissions.canViewFinanceTab(),
  'finance.voucher-total': (permissions) => permissions.canViewFinanceTab(),
  'finance.proforma-invoice-total': (permissions) => permissions.canViewFinanceTab(),
  'finance.cost-sheets-analytics': (permissions) => permissions.canViewChart('costSheets'),
  'finance.approved-analytics': (permissions) => permissions.canViewChart('approvedFinance'),
  'finance.denied-analytics': (permissions) => permissions.canViewChart('deniedFinance'),
  'finance.purchase-order-analytics': (permissions) => permissions.canViewChart('purchaseOrderAmount'),
  'finance.status': (permissions) => permissions.canViewFinanceTab(),
  'finance.recent': (permissions) => permissions.canViewFinanceTab(),
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

export type DashboardView = 'overview' | 'sales' | 'planner' | 'operations' | 'finance';

export type DashboardCardDefinition = {
  id: string;
  label: string;
};

export type DashboardCardPreferences = Record<DashboardView, Record<string, boolean>>;

export const DASHBOARD_CARD_PREFERENCES_COOKIE = 'dashboard_card_preferences';

export const DASHBOARD_CARD_DEFINITIONS: Record<DashboardView, DashboardCardDefinition[]> = {
  overview: [
    { id: 'overview.total-users', label: 'Total Users' },
    { id: 'overview.pending-assignments', label: 'Pending Assignments' },
    { id: 'overview.monthly-revenue', label: 'Monthly Revenue' },
    { id: 'overview.total-leads-analytics', label: 'Total Leads Analytics' },
    { id: 'overview.pre-leads-analytics', label: 'Pre Leads Analytics' },
    { id: 'overview.briefs-analytics', label: 'Briefs Analytics' },
    { id: 'overview.brief-budget-analytics', label: 'Brief Budget Analytics' },
    { id: 'overview.pending-assignments-list', label: 'Pending Assignments List' },
    { id: 'overview.meetings', label: 'Meetings' },
  ],
  sales: [
    { id: 'sales.total-leads', label: 'Total Leads' },
    { id: 'sales.total-briefs', label: 'Total Briefs' },
    { id: 'sales.business-forecast', label: 'Business Forecast' },
    { id: 'sales.business-weightage', label: 'Business Weightage' },
    { id: 'sales.total-leads-analytics', label: 'Total Leads Analytics' },
    { id: 'sales.briefs-analytics', label: 'Briefs Analytics' },
    { id: 'sales.brief-budget', label: 'Brief Budget' },
    { id: 'sales.sales-pipeline', label: 'Sales Pipeline' },
    { id: 'sales.lead-table', label: 'Lead and Brief Table' },
    { id: 'sales.recent-activities', label: 'Recent Activities' },
    { id: 'sales.recent-briefs', label: 'Recent Briefs' },
  ],
  planner: [
    { id: 'planner.active-briefs', label: 'Active Briefs' },
    { id: 'planner.plans-assigned', label: 'Plans Assigned' },
    { id: 'planner.avg-plan-submission-time', label: 'Avg Plan Submission Time' },
    { id: 'planner.overdue-briefs', label: 'Overdue Briefs' },
    { id: 'planner.briefs-analytics', label: 'Briefs Analytics' },
    { id: 'planner.assigned-plans-analytics', label: 'Plans Assigned Analytics' },
    { id: 'planner.avg-submission-analytics', label: 'Avg Plan Submission Analytics' },
    { id: 'planner.brief-budget-analytics', label: 'Brief Budget Analytics' },
    { id: 'planner.brief-status', label: 'Brief Status Mix' },
    { id: 'planner.assigned-briefs', label: 'My Assigned Briefs' },
  ],
  operations: [
    { id: 'operations.total', label: 'Total Operations' },
    { id: 'operations.pending', label: 'Pending Operations' },
    { id: 'operations.live', label: 'Live Operations' },
    { id: 'operations.assigned', label: 'Assigned Operations' },
    { id: 'operations.operations-analytics', label: 'Operations Analytics' },
    { id: 'operations.pending-analytics', label: 'Pending Operations Analytics' },
    { id: 'operations.live-analytics', label: 'Live Operations Analytics' },
    { id: 'operations.assigned-analytics', label: 'Assigned Operations Analytics' },
    { id: 'operations.status', label: 'Operation Status Mix' },
    { id: 'operations.recent', label: 'Recent Operations' },
  ],
  finance: [
    { id: 'finance.cost-sheets', label: 'Cost Sheets' },
    { id: 'finance.pending', label: 'Pending Review' },
    { id: 'finance.approved', label: 'Approved' },
    { id: 'finance.purchase-orders', label: 'Purchase Order Amount' },
    { id: 'finance.voucher-total', label: 'Voucher Total Amount' },
    { id: 'finance.proforma-invoice-total', label: 'Proforma Invoice Total Amount' },
    { id: 'finance.cost-sheets-analytics', label: 'Cost Sheets Analytics' },
    { id: 'finance.approved-analytics', label: 'Approved Analytics' },
    { id: 'finance.denied-analytics', label: 'Denied Analytics' },
    { id: 'finance.purchase-order-analytics', label: 'Purchase Order Analytics' },
    { id: 'finance.status', label: 'Finance Status Mix' },
    { id: 'finance.recent', label: 'Recent Cost Sheets' },
  ],
};

const createDefaultPreferences = (): DashboardCardPreferences =>
  (Object.keys(DASHBOARD_CARD_DEFINITIONS) as DashboardView[]).reduce((preferences, view) => {
    preferences[view] = Object.fromEntries(
      DASHBOARD_CARD_DEFINITIONS[view].map((card) => [card.id, true]),
    );
    return preferences;
  }, {} as DashboardCardPreferences);

const readPreferences = (): DashboardCardPreferences => {
  const defaults = createDefaultPreferences();

  if (typeof document === 'undefined') return defaults;

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${DASHBOARD_CARD_PREFERENCES_COOKIE}=`));

  if (!cookie) return defaults;

  try {
    const saved = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('='))) as Partial<DashboardCardPreferences>;
    return (Object.keys(defaults) as DashboardView[]).reduce((preferences, view) => {
      preferences[view] = {
        ...defaults[view],
        ...(saved[view] ?? {}),
      };
      return preferences;
    }, {} as DashboardCardPreferences);
  } catch {
    return defaults;
  }
};

export const saveDashboardCardPreferences = (preferences: DashboardCardPreferences) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${DASHBOARD_CARD_PREFERENCES_COOKIE}=${encodeURIComponent(JSON.stringify(preferences))}; path=/; max-age=31536000; samesite=lax`;
};

export const getDashboardCardPreferences = readPreferences;
export const createDefaultDashboardCardPreferences = createDefaultPreferences;
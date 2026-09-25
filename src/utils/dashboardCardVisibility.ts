export type DashboardView = 'overview' | 'sales' | 'planner';

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
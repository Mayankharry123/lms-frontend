jest.mock('../../hooks/SidebarMenuHooks', () => ({
  useSidebarMenu: () => ({ allPermittedSlugs: [] }),
}));

import { canShowDashboardCard, createDashboardPermissionChecker } from '../dashboardPermissions';

const checker = (slugs: string[]) =>
  createDashboardPermissionChecker((slug) => slugs.includes(slug));

describe('canShowDashboardCard', () => {
  it('hides overview and sales cards when those dashboards are not permitted', () => {
    const permissions = checker(['dashboard.planner']);

    expect(canShowDashboardCard(permissions, 'overview', 'overview.total-users')).toBe(false);
    expect(canShowDashboardCard(permissions, 'sales', 'sales.total-leads')).toBe(false);
    expect(canShowDashboardCard(permissions, 'planner', 'planner.active-briefs')).toBe(true);
  });

  it('hides a card inside a permitted dashboard when its own permission is missing', () => {
    const permissions = checker(['dashboard.overview', 'dashboard.charts.leads']);

    expect(canShowDashboardCard(permissions, 'overview', 'overview.total-leads-analytics')).toBe(true);
    expect(canShowDashboardCard(permissions, 'overview', 'overview.total-users')).toBe(false);
    expect(canShowDashboardCard(permissions, 'overview', 'overview.meetings')).toBe(false);
  });
});

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
    expect(canShowDashboardCard(permissions, 'operations', 'operations.total')).toBe(false);
    expect(canShowDashboardCard(permissions, 'finance', 'finance.cost-sheets')).toBe(false);
  });

  it('hides a card inside a permitted dashboard when its own permission is missing', () => {
    const permissions = checker(['dashboard.overview', 'dashboard.charts.leads']);

    expect(canShowDashboardCard(permissions, 'overview', 'overview.total-leads-analytics')).toBe(true);
    expect(canShowDashboardCard(permissions, 'overview', 'overview.total-users')).toBe(false);
    expect(canShowDashboardCard(permissions, 'overview', 'overview.meetings')).toBe(false);
  });

  it('shows operations and finance cards only for those dashboard permissions', () => {
    const operations = checker(['dashboard.operations']);
    const finance = checker(['dashboard.finance']);

    expect(canShowDashboardCard(operations, 'operations', 'operations.total')).toBe(true);
    expect(canShowDashboardCard(operations, 'operations', 'operations.operations-analytics')).toBe(true);
    expect(canShowDashboardCard(operations, 'finance', 'finance.cost-sheets')).toBe(false);
    expect(canShowDashboardCard(finance, 'finance', 'finance.purchase-orders')).toBe(true);
    expect(canShowDashboardCard(finance, 'finance', 'finance.voucher-total')).toBe(true);
    expect(canShowDashboardCard(finance, 'finance', 'finance.proforma-invoice-total')).toBe(true);
    expect(canShowDashboardCard(finance, 'finance', 'finance.purchase-order-analytics')).toBe(true);
    expect(canShowDashboardCard(finance, 'operations', 'operations.live')).toBe(false);
  });
});

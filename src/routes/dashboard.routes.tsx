import { Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import SalesDashboard from '../pages/Dashboard/SalesDashboard';
import ZoneLeadPerformanceDetail from '../pages/Dashboard/ZoneLeadPerformanceDetail';
import PlannerDashboard from '../pages/Dashboard/PlannerDashboard';
import OrganisationPlanner from '../pages/Dashboard/OrganisationPlanner';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const dashboardRoutes = (
  <>
    <Route path={ROUTE_SEGMENTS.DASHBOARD} element={permissionElement(<Dashboard />)} />
    <Route path={ROUTE_SEGMENTS.DASHBOARD_SALES} element={permissionElement(<SalesDashboard />)} />
    <Route path={ROUTE_SEGMENTS.DASHBOARD_ZONE_DETAIL} element={permissionElement(<ZoneLeadPerformanceDetail />)} />
    <Route path={ROUTE_SEGMENTS.DASHBOARD_PLANNER} element={permissionElement(<PlannerDashboard />)} />
    <Route
      path={ROUTE_SEGMENTS.DASHBOARD_ORGANISATION_PLANNER}
      element={permissionElement(<OrganisationPlanner />)}
    />
  </>
);

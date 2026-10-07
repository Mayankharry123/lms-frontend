import { Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ROUTES, ROUTE_SEGMENTS } from '../constants/routes';
import { ProtectedRoute } from './guards';
import { dashboardRoutes } from './dashboard.routes';
import { gmailRoutes } from './gmail.routes';
import { masterRoutes } from './master.routes';
import { leadManagementRoutes } from './lead-management.routes';
import { missCampaignRoutes } from './miss-campaign.routes';
import { briefRoutes } from './brief.routes';
import { meetingRoutes } from './meeting.routes';
import { userManagementRoutes } from './user-management.routes';
import { miscRoutes } from './misc.routes';
import { backupPlanRoutes } from './backup-plan.routes';
import { costSheetsRoutes } from './cost-sheets.routes';
import { proformaInvoicesRoutes } from './proforma-invoices.routes';
import { purchaseOrderRoutes } from './purchase-order.routes';

export const protectedRoutes = (
  <Route
    path={ROUTES.HOME}
    element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to={ROUTE_SEGMENTS.DASHBOARD} replace />} />
    {dashboardRoutes}
    {miscRoutes}
    {gmailRoutes}
    {masterRoutes}
    {leadManagementRoutes}
    {missCampaignRoutes}
    {briefRoutes}
    {backupPlanRoutes}
    {costSheetsRoutes}
    {proformaInvoicesRoutes}
    {purchaseOrderRoutes}
    {meetingRoutes}
    {userManagementRoutes}
  </Route>
);

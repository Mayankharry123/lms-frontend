import { Route } from 'react-router-dom';
import ProformaInvoices from '../pages/ProformaInvoices/ProformaInvoices';
import CreateProformaInvoice from '../pages/ProformaInvoices/CreateProformaInvoice';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const proformaInvoicesRoutes = (
  <>
    <Route
      path={ROUTE_SEGMENTS.PROFORMA_INVOICES_CREATE}
      element={permissionElement(<CreateProformaInvoice />)}
    />
    <Route
      path={ROUTE_SEGMENTS.PROFORMA_INVOICES}
      element={permissionElement(<ProformaInvoices />)}
    />
  </>
);

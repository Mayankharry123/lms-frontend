import { Route } from 'react-router-dom';
import ClientPurchaseOrder from '../pages/ClientPurchaseOrder/ClientPurchaseOrder';
import CreateClientPurchaseOrder from '../pages/ClientPurchaseOrder/CreateClientPurchaseOrder';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const clientPurchaseOrderRoutes = (
  <>
    <Route
      path={ROUTE_SEGMENTS.CLIENT_PURCHASE_ORDERS_CREATE}
      element={permissionElement(<CreateClientPurchaseOrder />)}
    />
    <Route
      path={ROUTE_SEGMENTS.CLIENT_PURCHASE_ORDERS}
      element={permissionElement(<ClientPurchaseOrder />)}
    />
    {/* Singular aliases for direct URL tolerance */}
    <Route
      path="client-purchase-order/create"
      element={permissionElement(<CreateClientPurchaseOrder />)}
    />
    <Route
      path="client-purchase-order"
      element={permissionElement(<ClientPurchaseOrder />)}
    />
  </>
);

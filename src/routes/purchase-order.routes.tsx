import { Route } from 'react-router-dom';
import PurchaseOrder from '../pages/PurchaseOrder/PurchaseOrder';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const purchaseOrderRoutes = (
  <Route path={ROUTE_SEGMENTS.PURCHASE_ORDER} element={permissionElement(<PurchaseOrder />)} />
);

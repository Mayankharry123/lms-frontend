import { Route } from 'react-router-dom';
import CostSheets from '../pages/CostSheets/CostSheets';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const costSheetsRoutes = (
  <Route path={ROUTE_SEGMENTS.COST_SHEETS} element={permissionElement(<CostSheets />)} />
);

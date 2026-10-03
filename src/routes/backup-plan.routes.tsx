import { Route } from 'react-router-dom';
import BackupPlan from '../pages/BackupPlan/BackupPlan';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const backupPlanRoutes = (
  <Route path={ROUTE_SEGMENTS.BACKUP_PLAN} element={permissionElement(<BackupPlan />)} />
);

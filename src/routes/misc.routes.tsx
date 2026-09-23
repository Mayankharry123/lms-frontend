import { Route } from 'react-router-dom';
import Courses from '../pages/Courses';
import Profile from '../pages/Profile';
import LeadSource from '../pages/LeadSource';
import Notifications from '../pages/Notifications';
import DeviceInventory from '../pages/Inventory/DeviceInventory';
import DeviceInventoryClone from '../pages/Inventory/DeviceInventoryClone';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const miscRoutes = (
  <>
    <Route path={ROUTE_SEGMENTS.COURSES} element={permissionElement(<Courses />)} />
    <Route path={ROUTE_SEGMENTS.NOTIFICATIONS} element={permissionElement(<Notifications />)} />
    <Route path={ROUTE_SEGMENTS.PROFILE} element={permissionElement(<Profile />)} />
    <Route path={ROUTE_SEGMENTS.LEAD_SOURCE} element={permissionElement(<LeadSource />)} />
    <Route path={ROUTE_SEGMENTS.INVENTORY_DEVICE} element={permissionElement(<DeviceInventory />)} />
    <Route
      path={ROUTE_SEGMENTS.INVENTORY_DEVICE_CLONE}
      element={permissionElement(<DeviceInventoryClone />)}
    />
  </>
);

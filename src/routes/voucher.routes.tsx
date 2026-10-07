import { Route } from 'react-router-dom';
import Voucher from '../pages/Voucher/Voucher';
import UploadVoucher from '../pages/Voucher/UploadVoucher';
import { ROUTE_SEGMENTS } from '../constants/routes';
import { permissionElement } from './PermissionElement';

export const voucherRoutes = (
  <>
    <Route
      path={ROUTE_SEGMENTS.VOUCHERS_CREATE}
      element={permissionElement(<UploadVoucher />)}
    />
    <Route path={ROUTE_SEGMENTS.VOUCHERS} element={permissionElement(<Voucher />)} />
  </>
);

/**
 * @file index.ts
 * @description Barrel exports for user management (RBAC) pages.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

export { default as AllPermissions } from './Permission/AllPermissions';
export { default as CreatePermission } from './Permission/CreatePermission';
export { default as EditPermission } from './Permission/EditPermission';
export { default as ViewPermission } from './Permission/ViewPermission';
export { default as AllRoles } from './Role/AllRoles';
export { default as CreateRole } from './Role/CreateRole';
export { default as EditRole } from './Role/EditRole';
export { default as ViewRole } from './Role/ViewRole';
export { default as AllUsers } from './User/AllUsers';
export { default as CreateUser } from './User/CreateUser';
export { default as EditUser } from './User/EditUser';
export { default as ViewUser } from './User/ViewUser';

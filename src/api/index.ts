/**
 * Single API entry point — import all API functions from here.
 *
 * @example
 * import { listLeads, listUsers, listRoles } from '@/api';
 * // or
 * import * as api from '@/api';
 * await api.listLeads(1, 15);
 */

export * from './client';
export * from './briefChat';
export * from './leads';
export * from './users';
export * from './rbac';
export * from './lookups';

export { ENDPOINTS, API_ENDPOINTS } from '../constants/endpoints';

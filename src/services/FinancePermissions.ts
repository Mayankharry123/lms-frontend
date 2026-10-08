import { listParentPermissions } from '../api/rbac';
import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';

const FINANCE_PAGE_PERMISSIONS = [
  {
    display_name: 'Proforma Invoice',
    name: 'proforma-invoice',
    url: '/proforma-invoices',
    description: 'Access the Proforma Invoice listing and creation pages.',
  },
  {
    display_name: 'Voucher',
    name: 'voucher',
    url: '/vouchers',
    description: 'Access the Voucher listing and upload pages.',
  },
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase();

/**
 * Creates missing Finance Managements page permissions without duplicating existing entries.
 */
export async function ensureFinancePagePermissions(): Promise<string[]> {
  const permissions = await listParentPermissions();
  const parent = permissions.find((permission) => {
    const permissionName = normalized(permission.display_name ?? permission.name);
    return permissionName === 'finance managements' || permissionName === 'finance management';
  });

  if (!parent) {
    throw new Error('Finance Managements parent permission was not found.');
  }

  const parentId = String(parent.id);
  const existingRecords = permissions
    .map(asRecord)
    .filter((permission): permission is Record<string, unknown> => permission !== null);
  const siblings = existingRecords.filter((permission) =>
    String(permission.is_parent ?? permission.parent_id ?? permission.parent_permission_id ?? '') === parentId
  );
  const nextOrder = siblings.reduce((highest, permission) => {
    const order = Number(permission.order);
    return Number.isFinite(order) ? Math.max(highest, order) : highest;
  }, 0);

  const created: string[] = [];
  for (const [index, pagePermission] of FINANCE_PAGE_PERMISSIONS.entries()) {
    const found = existingRecords.some((permission) =>
      normalized(permission.name) === normalized(pagePermission.name) ||
      normalized(permission.url) === normalized(pagePermission.url)
    );
    if (found) continue;

    const response = await apiClient.post<unknown>(ENDPOINTS.PERMISSIONS.CREATE, {
      ...pagePermission,
      is_parent: parentId,
      order: nextOrder + index + 1,
      status: '1',
    });
    if (!response.success) {
      throw new Error(response.message || `Failed to create the ${pagePermission.display_name} permission.`);
    }
    created.push(pagePermission.display_name);
  }

  return created;
}

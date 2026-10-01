import { ENDPOINTS } from '../constants/endpoints';
import {
  apiClient,
  assertSuccess,
  buildPaginationQuery,
  extractListItems,
  extractNumericId,
  mapToSelectOptions,
  normalizeApiDate,
  stripIdPrefix,
  type SelectOption,
} from './client';

export type { SelectOption };
import type { AppUser, UserListResponse, UserDepartment, UserOrganisation } from '../types/user/user.types';

export type { AppUser, UserListResponse };
/** @deprecated Use AppUser */
export type User = AppUser;

export interface OrganisationZone {
  zone_id: number | string;
  zone_name: string;
  assigned_leads_count: number;
}

function parseOrganisations(it: Record<string, unknown>): UserOrganisation[] {
  if (Array.isArray(it.organisations) && it.organisations.length > 0) {
    return it.organisations
      .map((org) => {
        const item = org as Record<string, unknown>;
        const name = String(
          item.name ?? item.organisation_name ?? item.label ?? item.title ?? ''
        ).trim();
        if (!name) return null;
        return {
          id: (item.id ?? item.organisation_id) as number | string | undefined,
          name,
        };
      })
      .filter((org): org is NonNullable<typeof org> => Boolean(org));
  }

  const organisationName = it.organisation_name;
  if (typeof organisationName === 'string' && organisationName.includes(',')) {
    return organisationName
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }

  const singleName = String(
    (it.origination as { name?: string })?.name ??
      (it.orientation as { name?: string })?.name ??
      it.origination ??
      it.orientation ??
      it.organisation_name ??
      ''
  ).trim();

  return singleName ? [{ name: singleName }] : [];
}

function parseDepartments(it: Record<string, unknown>): UserDepartment[] {
  if (Array.isArray(it.departments) && it.departments.length > 0) {
    return it.departments
      .map((dept) => {
        const item = dept as Record<string, unknown>;
        const name = String(
          item.name ?? item.department_name ?? item.label ?? item.title ?? ''
        ).trim();
        if (!name) return null;
        return {
          id: (item.id ?? item.department_id) as number | string | undefined,
          name,
        };
      })
      .filter((dept): dept is NonNullable<typeof dept> => Boolean(dept));
  }

  const departmentName = it.department_name;
  if (typeof departmentName === 'string' && departmentName.includes(',')) {
    return departmentName
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }

  const singleName = String(
    (it.department as { name?: string })?.name ??
      it.department ??
      it.department_name ??
      ''
  ).trim();

  return singleName ? [{ name: singleName }] : [];
}

function mapUserRow(it: Record<string, unknown>, idx: number): AppUser {
  const rawId = it.id ?? idx + 1;
  let idStr = String(rawId);
  if (/^\d+$/.test(idStr)) {
    idStr = `#USR${String(Number(idStr)).padStart(3, '0')}`;
  } else if (!idStr.startsWith('#')) {
    idStr = `#USR${idStr}`;
  }

  const name = String(it.name ?? it.full_name ?? it.display_name ?? '');
  const email = String(it.email ?? '');

  let status: 'Active' | 'Inactive' = 'Active';
  if (it.status !== undefined && it.status !== null) {
    const statusStr = String(it.status).toLowerCase();
    status =
      statusStr === 'inactive' || statusStr === '0' || statusStr === 'false'
        ? 'Inactive'
        : 'Active';
  }

  const roles: NonNullable<AppUser['roles']> = Array.isArray(it.roles)
    ? (it.roles as NonNullable<AppUser['roles']>)
    : [];
  let role = '';
  if (roles.length > 0) {
    role = String(roles[0]?.name ?? roles[0] ?? '');
  } else {
    role = String(it.role ?? it.role_name ?? '');
  }

  const lastLogin = String(it.last_login_at ?? it.last_login ?? it.lastLogin ?? '');
  const rawCreated = it.created_at ?? it.created ?? '';
  const created = String(it.created_at_formatted ?? normalizeApiDate(rawCreated));
  const zone = String(
    (it.zone as { name?: string; zone?: string })?.name ??
      (it.zone as { name?: string; zone?: string })?.zone ??
      it.zone ??
      it.zone_name ??
      ''
  );
  const organisations = parseOrganisations(it);
  const origination = organisations.map((org) => org.name).join(', ');
  const departments = parseDepartments(it);
  const department = departments.map((dept) => dept.name).join(', ');

  let parentsArray: AppUser['parents'];
  if (Array.isArray(it.parents) && it.parents.length > 0) {
    parentsArray = (it.parents as Array<{ id: number; name: string; email?: string }>).map(
      (p) => ({ id: p.id, name: p.name, email: p.email })
    );
  } else if (it.parent) {
    const p = it.parent as { id: number; name: string; email?: string };
    parentsArray = [{ id: p.id, name: p.name, email: p.email }];
  }

  return {
    id: idStr,
    name,
    email,
    zone,
    origination,
    organisations,
    department,
    departments,
    role,
    roles,
    status,
    lastLogin,
    created,
    created_at_formatted: it.created_at_formatted as string | undefined,
    last_login_at: it.last_login_at as string | undefined,
    parent: parentsArray?.[0],
    parents: parentsArray,
  };
}

export async function listUsers(
  page = 1,
  perPage = 10,
  search?: string
): Promise<UserListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  if (search?.trim()) params.set('search', search.trim());

  const res = await apiClient.get<Record<string, unknown>[]>(
    `${ENDPOINTS.USERS.LIST}?${params.toString()}`
  );
  const items = (res.data || []).map((it, idx) => mapUserRow(it, idx));
  return { data: items, meta: res.meta };
}

export async function listAttendees(
  page = 1,
  perPage = 100,
  search?: string
): Promise<UserListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  if (search?.trim()) params.set('search', search.trim());

  const res = await apiClient.get<Record<string, unknown>[]>(
    `${ENDPOINTS.USERS.CHILD_USERS}?${params.toString()}`
  );
  const items = (res.data || []).map((it, idx) => {
    const user = mapUserRow(it, idx);
    if (it.parent) {
      const p = it.parent as { id: number; name: string; email?: string };
      user.parent = { id: p.id, name: p.name, email: p.email };
    }
    return user;
  });
  return { data: items, meta: res.meta };
}

export async function getUser(id: string): Promise<AppUser> {
  const res = await apiClient.get<AppUser>(ENDPOINTS.USERS.DETAIL(stripIdPrefix(id)));
  return assertSuccess(res);
}

export async function createUser(payload: Partial<AppUser>): Promise<AppUser> {
  const res = await apiClient.post<AppUser>(ENDPOINTS.USERS.CREATE, payload);
  return assertSuccess(res);
}

export async function updateUser(id: string, payload: Partial<AppUser>): Promise<AppUser> {
  const res = await apiClient.put<AppUser>(
    ENDPOINTS.USERS.UPDATE(stripIdPrefix(id)),
    payload
  );
  return assertSuccess(res);
}

export async function deleteUser(id: string): Promise<void> {
  const res = await apiClient.delete(ENDPOINTS.USERS.DELETE(extractNumericId(id)));
  await assertSuccess(res);
}

/** Dropdown options for user create/edit forms */
export async function listRolesForSelect(perPage = 100): Promise<SelectOption[]> {
  const res = await apiClient.get(
    `${ENDPOINTS.ROLES.LIST}${buildPaginationQuery(1, perPage)}`
  );
  return mapToSelectOptions(extractListItems(res), {
    idKeys: ['id', 'role_id'],
    labelKeys: ['name', 'title', 'role'],
  });
}

export async function listZonesForSelect(): Promise<SelectOption[]> {
  const res = await apiClient.get(ENDPOINTS.GEO.ZONES.LIST);
  return mapToSelectOptions(extractListItems(res), {
    idKeys: ['id', 'value', 'zone'],
    labelKeys: ['name', 'zone', 'label'],
  });
}

export async function listOrganisationsForSelect(): Promise<SelectOption[]> {
  const res = await apiClient.get(ENDPOINTS.ORGANISATIONS.LIST);
  return mapToSelectOptions(extractListItems(res), {
    idKeys: ['id', 'organisation_id', 'value'],
    labelKeys: ['name', 'organisation_name', 'label'],
  });
}

export async function listOrganisationZones(
  organisationIds: Array<number | string>
): Promise<OrganisationZone[]> {
  const params = new URLSearchParams();
  organisationIds.forEach((organisationId) => {
    params.append('organisation_id[]', String(organisationId));
  });

  const query = params.toString();
  const res = await apiClient.get<OrganisationZone[]>(
    `${ENDPOINTS.ORGANISATIONS.ZONES}${query ? `?${query}` : ''}`
  );
  return assertSuccess(res);
}

export async function listManagersForSelect(perPage = 100): Promise<SelectOption[]> {
  const res = await apiClient.get(
    `${ENDPOINTS.USERS.LIST}${buildPaginationQuery(1, perPage)}`
  );
  return mapToSelectOptions(extractListItems(res), {
    idKeys: ['id', 'user_id'],
    labelKeys: ['name', 'full_name', 'display_name', 'email'],
  });
}

export async function listDepartmentsForSelect(perPage = 100): Promise<SelectOption[]> {
  const res = await apiClient.get(
    `${ENDPOINTS.MASTER.DEPARTMENTS.LIST}${buildPaginationQuery(1, perPage)}`
  );
  return mapToSelectOptions(extractListItems(res), {
    idKeys: ['id', 'department_id'],
    labelKeys: ['name', 'department_name', 'label'],
  });
}

export default {
  listUsers,
  listAttendees,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};

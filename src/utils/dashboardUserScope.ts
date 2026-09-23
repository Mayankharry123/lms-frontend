import type { AuthUser } from '../redux/slices/authSlice';

export function getUserOrganisationIds(user: AuthUser | null | undefined): string[] {
  if (!user) return [];

  if (Array.isArray(user.organisation_ids) && user.organisation_ids.length > 0) {
    return user.organisation_ids.map((id) => String(id)).filter(Boolean);
  }

  if (Array.isArray(user.organisations) && user.organisations.length > 0) {
    return user.organisations
      .map((org) => String(org.id ?? ''))
      .filter(Boolean);
  }

  if (user.organisation_id != null && user.organisation_id !== '') {
    return [String(user.organisation_id)];
  }

  return [];
}

export function getProcessOrganisationId(user: AuthUser | null | undefined): string | null {
  if (!user) return null;

  if (user.organisation_id != null && user.organisation_id !== '') {
    return String(user.organisation_id);
  }

  const orgIds = getUserOrganisationIds(user);
  return orgIds[0] ?? null;
}

export function isSuperAdminUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.roles?.some((role) => role.name === 'Super Admin'));
}

/** Organisation-wide dashboard access requires explicit organisation assignment. */
export function canAccessAllOrganisations(user: AuthUser | null | undefined): boolean {
  void user;
  return false;
}

/** Default dashboard scope: all organisations assigned to the user. */
export function getDefaultDashboardOrganisationIds(user: AuthUser | null | undefined): string[] {
  return getUserOrganisationIds(user);
}

/** Keep organisation filter selections within the user's assigned organisations. */
export function sanitizeDashboardOrganisationIds(
  user: AuthUser | null | undefined,
  selectedIds: string[],
): string[] {
  const accessible = getUserOrganisationIds(user);
  if (accessible.length === 0) return [];

  const normalizedSelection = selectedIds.filter(Boolean);
  if (normalizedSelection.length === 0) return accessible;

  const allowed = normalizedSelection.filter((id) => accessible.includes(id));
  return allowed.length > 0 ? allowed : accessible;
}

export function filterOrganisationOptionsForUser<T extends { value: string }>(
  user: AuthUser | null | undefined,
  options: T[],
): T[] {
  const accessible = new Set(getUserOrganisationIds(user));
  if (accessible.size === 0) return [];

  return options.filter((option) => accessible.has(String(option.value)));
}

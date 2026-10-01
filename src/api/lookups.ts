import { ENDPOINTS } from '../constants/endpoints';
import { apiClient, assertSuccess } from './client';
import type { CallStatusOption } from '../types/lead/lead.types';

export type { CallStatusOption };

export interface PriorityOption {
  id: number | string;
  name: string;
  slug?: string;
  [key: string]: unknown;
}

export async function listCallStatuses(): Promise<CallStatusOption[]> {
  const res = await apiClient.get<CallStatusOption[]>(ENDPOINTS.CALL_STATUSES.LIST);
  return (res.data || []) as CallStatusOption[];
}

/** Alias for listCallStatuses — backward compatible */
export const getCallStatuses = listCallStatuses;

export async function listPriorities(): Promise<PriorityOption[]> {
  const res = await apiClient.get<PriorityOption[]>(ENDPOINTS.PRIORITIES.LIST);
  return (res.data || []) as PriorityOption[];
}

/** Alias for listPriorities — backward compatible */
export const getPriorities = listPriorities;

export async function listPrioritiesByCallStatus(
  callStatusId: string | number
): Promise<PriorityOption[]> {
  const res = await apiClient.get<PriorityOption[]>(
    ENDPOINTS.CALL_STATUSES.PRIORITIES(callStatusId)
  );
  return (res.data || []) as PriorityOption[];
}

/** Alias for listPrioritiesByCallStatus — backward compatible */
export const getPrioritiesByCallStatus = listPrioritiesByCallStatus;

export async function updateLeadCallStatus(
  leadId: string | number,
  callStatusId: string | number
): Promise<void> {
  const res = await apiClient.post(ENDPOINTS.LEADS.CALL_STATUS(leadId), {
    call_status_id: callStatusId,
    _method: 'Put',
  });
  await assertSuccess(res);
}

/** Alias for updateLeadCallStatus — backward compatible */
export const updateCallStatus = updateLeadCallStatus;

export async function assignLead(
  leadId: string | number,
  payload: Record<string, unknown>
): Promise<unknown> {
  const res = await apiClient.put(ENDPOINTS.LEADS.ASSIGN(leadId), payload);
  return assertSuccess(res);
}

export async function listBrandsFlat(): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<Array<{ id: number | string; name: string }>>(
    ENDPOINTS.BRANDS.LIST_FLAT
  );
  return (res.data || []) as Array<{ id: number | string; name: string }>;
}

export async function listAgenciesFlat(): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<Array<{ id: number | string; name: string }>>(
    ENDPOINTS.AGENCIES.LIST_FLAT
  );
  return (res.data || []) as Array<{ id: number | string; name: string }>;
}

interface ChildUserHierarchyNode {
  id?: number | string;
  name?: string;
  children?: ChildUserHierarchyNode[];
}

export function flattenChildUserHierarchy(
  nodes: ChildUserHierarchyNode[] | ChildUserHierarchyNode | null | undefined
): Array<{ id: number | string; name: string }> {
  const result: Array<{ id: number | string; name: string }> = [];
  const seen = new Set<string>();

  const walk = (nodeList: ChildUserHierarchyNode[]) => {
    nodeList.forEach((node) => {
      if (node?.id === undefined || node.id === null) return;

      const key = String(node.id);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id: node.id, name: String(node.name ?? '') });
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    });
  };

  if (Array.isArray(nodes)) {
    walk(nodes);
  } else if (nodes && typeof nodes === 'object') {
    walk([nodes]);
  }

  return result;
}

export async function listChildUsers(
  perPage = 1000
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<Array<{ id: number | string; name: string }>>(
    `${ENDPOINTS.USERS.CHILD_USERS}?per_page=${perPage}`
  );
  return (res.data || []) as Array<{ id: number | string; name: string }>;
}
/**
 * Planning users for a brief and contact person.
 * GET /profile/child-planing-users?brief_id={briefId}&contact_person_id={contactPersonId}
 */
export async function listChildPlaningUsers(
  briefId?: string | number,
  contactPersonId?: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const params = new URLSearchParams();
  if (briefId !== undefined && briefId !== null && String(briefId).trim() !== '') {
    params.set('brief_id', String(briefId));
  }
  if (contactPersonId !== undefined && contactPersonId !== null && String(contactPersonId).trim() !== '') {
    params.set('contact_person_id', String(contactPersonId));
  }
  const query = params.toString();
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    `${ENDPOINTS.USERS.CHILD_PLANING_USERS}${query ? `?${query}` : ''}`
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listChildUsersByMissCampaign(
  missCampaignId: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    ENDPOINTS.USERS.CHILD_USERS_BY_MISS_CAMPAIGN(missCampaignId)
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listChildUsersByLead(
  leadId: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    ENDPOINTS.USERS.CHILD_USERS_BY_LEAD(leadId)
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listChildPlannersByLead(
  leadId: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    ENDPOINTS.USERS.CHILD_PLANNERS_BY_LEAD(leadId)
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listChildUsersByBrief(
  briefId: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    ENDPOINTS.USERS.CHILD_USERS_BY_BRIEF(briefId)
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listChildPlannersByBrief(
  briefId: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    ENDPOINTS.USERS.CHILD_PLANNERS_BY_BRIEF(briefId)
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listChildUsersForBriefCreation(
  organisationId: string | number
): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<ChildUserHierarchyNode[]>(
    ENDPOINTS.USERS.CHILD_USERS_FOR_BRIEF_CREATION(organisationId)
  );
  return flattenChildUserHierarchy(res.data);
}

export async function listLeadTypes(): Promise<Array<{ id: number | string; name: string }>> {
  const res = await apiClient.get<Array<{ id: number | string; name: string }>>(
    ENDPOINTS.LEAD_TYPES.LIST
  );
  return (res.data || []) as Array<{ id: number | string; name: string }>;
}

export async function createLeadType(payload: {
  name: string;
}): Promise<{ id: number | string; name: string }> {
  const res = await apiClient.post<{ id: number | string; name: string }>(
    ENDPOINTS.LEAD_TYPES.CREATE,
    payload
  );
  return assertSuccess(res);
}

export async function listIndustriesFlat(): Promise<
  Array<{ id: number | string; name: string }>
> {
  const res = await apiClient.get<Array<{ id: number | string; name: string }>>(
    ENDPOINTS.MASTER.INDUSTRIES.LIST_FLAT
  );
  return (res.data || []) as Array<{ id: number | string; name: string }>;
}

export async function listMediaTypes(): Promise<
  Array<{ id: number | string; name: string }>
> {
  const res = await apiClient.get<Array<{ id: number | string; name: string }>>(
    ENDPOINTS.MEDIA_TYPES.LIST
  );
  return (res.data || []) as Array<{ id: number | string; name: string }>;
}

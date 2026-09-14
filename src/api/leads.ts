import { ENDPOINTS } from '../constants/endpoints';
import { apiClient, buildPaginationQuery } from './client';
import type { LeadListItem, LeadListResponse } from '../types/lead/lead.types';

export type { LeadListItem, LeadListResponse };
/** @deprecated Use LeadListItem */
export type LeadItem = LeadListItem;

export async function listLeads(
  page = 1,
  perPage = 15,
  filters?: Record<string, unknown>
): Promise<LeadListResponse> {
  const query = buildPaginationQuery(page, perPage, filters);
  const res = await apiClient.get<LeadListItem[]>(`${ENDPOINTS.LEADS.LIST}${query}`);
  return { data: (res.data || []) as LeadListItem[], meta: res.meta };
}

export async function listLeadContacts(): Promise<LeadListItem[]> {
  const res = await apiClient.get<LeadListItem[] | { data?: LeadListItem[] }>(
    ENDPOINTS.LEADS.CONTACT_LIST
  );
  return Array.isArray(res.data) ? res.data : (res.data?.data || []);
}

export async function getLeadById(id: string | number): Promise<LeadListItem> {
  const res = await apiClient.get<LeadListItem>(ENDPOINTS.LEADS.DETAIL(id));
  return res.data as LeadListItem;
}

export async function createLead(payload: Record<string, unknown>): Promise<LeadListItem> {
  const res = await apiClient.post<LeadListItem>(ENDPOINTS.LEADS.CREATE, payload);
  return res.data as LeadListItem;
}

export async function updateLead(
  id: string | number,
  payload: Record<string, unknown>
): Promise<LeadListItem> {
  const res = await apiClient.put<LeadListItem>(ENDPOINTS.LEADS.UPDATE(id), payload);
  return res.data as LeadListItem;
}

export async function deleteLead(id: string | number): Promise<void> {
  await apiClient.delete(ENDPOINTS.LEADS.DELETE(id));
}

export async function listLeadsByStatus(
  status: string | number,
  page = 1,
  perPage = 15,
  extraFilters?: Record<string, unknown>
): Promise<LeadListResponse> {
  const filters: Record<string, unknown> = { ...extraFilters };
  if (typeof status === 'number') {
    filters.lead_status_id = status;
  } else {
    filters.lead_status = status;
  }
  return listLeads(page, perPage, filters);
}

export default {
  listLeads,
  listLeadContacts,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  listLeadsByStatus,
};

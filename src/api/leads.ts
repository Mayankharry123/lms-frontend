import { ENDPOINTS } from '../constants/endpoints';
import { apiClient, assertSuccess, buildPaginationQuery, buildQuery } from './client';
import type { LeadAssignHistoryItem, LeadChatPayload, LeadListItem, LeadListResponse, ReminderBeforeUnit } from '../types/lead/lead.types';

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
/**
 * Added API helper to fetch lead contacts for the Brief contact-person dropdown.
 * Supports both direct array and wrapped API response formats.
 */
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

function appendLeadChatFormData(payload: LeadChatPayload): FormData {
  const formData = new FormData();
  formData.append('call_status_id', String(payload.call_status_id));
  formData.append('comment', payload.comment ?? '');
  formData.append('reminder', payload.reminder ? 'true' : 'false');

  if (payload.reminder) {
    if (payload.reminder_at) {
      formData.append('reminder_at', payload.reminder_at);
    }
    if (payload.reminder_before != null) {
      formData.append('reminder_before', String(payload.reminder_before));
    }
    if (payload.reminder_before_unit) {
      formData.append('reminder_before_unit', payload.reminder_before_unit);
    }
  }

  return formData;
}

export async function createLeadChat(payload: LeadChatPayload): Promise<unknown> {
  const res = await apiClient.post(
    ENDPOINTS.LEADS.CHAT(payload.lead_id),
    appendLeadChatFormData(payload)
  );
  return assertSuccess(res, false);
}

function mapAssignHistoryItem(raw: Record<string, unknown>): LeadAssignHistoryItem {
  const id = raw.id ?? raw.uuid ?? raw.assign_history_id;
  return {
    id: id != null && String(id) !== '' ? String(id) : undefined,
    current_user_id: (raw.current_user_id ?? raw.user_id ?? '') as number | string,
    current_user_name: String(raw.current_user_name ?? raw.user_name ?? raw.name ?? 'Unknown'),
    lead_comment: String(raw.lead_comment ?? raw.comment ?? ''),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    timestamp: raw.timestamp ? String(raw.timestamp) : undefined,
  };
}

export async function listLeadAssignHistory(
  leadId: string | number,
  params?: { page?: number; per_page?: number }
): Promise<{ data: LeadAssignHistoryItem[]; meta?: Record<string, unknown> }> {
  const query = buildQuery({
    page: params?.page,
    per_page: params?.per_page,
  });
  const res = await apiClient.get<LeadAssignHistoryItem[] | { data?: LeadAssignHistoryItem[] }>(
    `${ENDPOINTS.LEADS.ASSIGN_HISTORY(leadId)}${query}`
  );

  if (!res?.success) {
    throw new Error(res?.message || 'Failed to load chat history.');
  }

  const rows = Array.isArray(res.data)
    ? res.data
    : Array.isArray((res.data as { data?: LeadAssignHistoryItem[] } | undefined)?.data)
      ? ((res.data as { data?: LeadAssignHistoryItem[] }).data || [])
      : [];

  return {
    data: rows.map((row) => mapAssignHistoryItem(row as unknown as Record<string, unknown>)),
    meta: res.meta as Record<string, unknown> | undefined,
  };
}

export async function sendLeadChatComment(
  leadId: string | number,
  comment: string
): Promise<void> {
  await sendLeadChatActivity(leadId, {
    comment,
    reminder: false,
  });
}

export async function sendLeadChatActivity(
  leadId: string | number,
  payload: {
    comment: string;
    call_status_id?: number;
    reminder: boolean;
    reminder_at?: string;
    reminder_before?: number;
    reminder_before_unit?: ReminderBeforeUnit;
  }
): Promise<void> {
  const body: Record<string, unknown> = {
    comment: payload.comment,
    reminder: payload.reminder,
  };

  if (payload.call_status_id != null) {
    body.call_status_id = payload.call_status_id;
  }

  if (payload.reminder) {
    if (payload.reminder_at) body.reminder_at = payload.reminder_at;
    if (payload.reminder_before != null) body.reminder_before = payload.reminder_before;
    if (payload.reminder_before_unit) body.reminder_before_unit = payload.reminder_before_unit;
  }

  const res = await apiClient.post(ENDPOINTS.LEADS.CHAT(leadId), body);
  await assertSuccess(res, false);
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
  createLeadChat,
  listLeadAssignHistory,
  sendLeadChatComment,
  sendLeadChatActivity,
  listLeadsByStatus,
};

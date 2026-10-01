import { ENDPOINTS } from '../constants/endpoints';
import { apiClient, assertSuccess, buildQuery } from './client';
import type { LeadAssignHistoryItem, ReminderBeforeUnit } from '../types/lead/lead.types';

function mapBriefChatHistoryItem(raw: Record<string, unknown>): LeadAssignHistoryItem {
  const id = raw.id ?? raw.uuid ?? raw.assign_history_id;
  return {
    id: id != null && String(id) !== '' ? String(id) : undefined,
    current_user_id: (raw.current_user_id ?? raw.user_id ?? '') as number | string,
    current_user_name: String(raw.current_user_name ?? raw.user_name ?? raw.name ?? 'Unknown'),
    lead_comment: String(raw.brief_comment ?? raw.comment ?? raw.lead_comment ?? ''),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    timestamp: raw.timestamp ? String(raw.timestamp) : undefined,
  };
}

export async function listBriefChatHistory(
  briefId: string | number
): Promise<{ data: LeadAssignHistoryItem[]; meta?: Record<string, unknown> }> {
  const res = await apiClient.get<LeadAssignHistoryItem[] | { data?: LeadAssignHistoryItem[] }>(
    ENDPOINTS.BRIEFS.ASSIGN_HISTORY(briefId)
  );

  if (!res?.success) {
    throw new Error(res?.message || 'Failed to load brief chat history.');
  }

  const rows = Array.isArray(res.data)
    ? res.data
    : Array.isArray((res.data as { data?: LeadAssignHistoryItem[] } | undefined)?.data)
      ? ((res.data as { data?: LeadAssignHistoryItem[] }).data || [])
      : [];

  return {
    data: rows.map((row) => mapBriefChatHistoryItem(row as unknown as Record<string, unknown>)),
    meta: res.meta as Record<string, unknown> | undefined,
  };
}

export async function sendBriefChatActivity(
  briefId: string | number,
  payload: {
    comment: string;
    reminder: boolean;
    reminder_at?: string;
    reminder_before?: number;
    reminder_before_unit?: ReminderBeforeUnit;
  }
): Promise<void> {
  const query = buildQuery({
    comment: payload.comment,
    reminder: payload.reminder,
    reminder_at: payload.reminder ? payload.reminder_at : undefined,
    reminder_before: payload.reminder ? payload.reminder_before : undefined,
    reminder_before_unit: payload.reminder ? payload.reminder_before_unit : undefined,
  });

  const res = await apiClient.post(`${ENDPOINTS.BRIEFS.CHAT(briefId)}${query}`);
  await assertSuccess(res, false);
}
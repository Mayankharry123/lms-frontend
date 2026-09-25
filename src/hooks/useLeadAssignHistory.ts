import { useCallback, useEffect, useRef, useState } from 'react';
import { listLeadAssignHistory, sendLeadChatActivity } from '../api/leads';
import type { LeadAssignHistoryItem, ReminderBeforeUnit } from '../types/lead/lead.types';

export type LeadChatSendPayload = {
  comment: string;
  call_status_id: number;
  reminder: boolean;
  reminder_at?: string;
  reminder_before?: number;
  reminder_before_unit?: ReminderBeforeUnit;
};

type HistoryMeta = Record<string, unknown> | undefined;

function readHistoryPage(meta: HistoryMeta): { currentPage: number; lastPage: number } {
  const pagination =
    meta?.pagination && typeof meta.pagination === 'object'
      ? (meta.pagination as Record<string, unknown>)
      : {};

  const currentPage = Number(pagination.current_page ?? pagination.page ?? 1);
  const lastPage = Number(
    pagination.last_page ?? pagination.total_pages ?? pagination.totalPages ?? currentPage
  );

  return {
    currentPage: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
  };
}

function withClientKeys(rows: LeadAssignHistoryItem[], page: number): LeadAssignHistoryItem[] {
  return rows.map((row, index) => ({
    ...row,
    clientKey:
      row.id != null
        ? `id-${row.id}`
        : `p${page}-${index}-${row.current_user_id}-${row.created_at ?? row.timestamp ?? ''}-${row.lead_comment}`,
  }));
}

export function useLeadAssignHistory(leadId?: string) {
  const [messages, setMessages] = useState<LeadAssignHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const requestGenRef = useRef(0);

  const syncPagination = useCallback((meta: HistoryMeta, page: number) => {
    const { lastPage } = readHistoryPage(meta);
    const more = page < lastPage;
    pageRef.current = page;
    hasMoreRef.current = more;
    setHasMore(more);
  }, []);

  const fetchHistory = useCallback(async (options?: { silent?: boolean }) => {
    if (!leadId) {
      setMessages([]);
      setError('Invalid lead selected.');
      setLoading(false);
      setHasMore(false);
      hasMoreRef.current = false;
      pageRef.current = 1;
      return;
    }

    const requestGen = ++requestGenRef.current;
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await listLeadAssignHistory(leadId, { page: 1 });
      if (requestGen !== requestGenRef.current) return;
      setMessages(withClientKeys(result.data, 1));
      syncPagination(result.meta, 1);
      setOlderError(null);
    } catch (err: unknown) {
      if (requestGen !== requestGenRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load chat history.';
      setError(message);
      if (!options?.silent) setMessages([]);
    } finally {
      if (requestGen === requestGenRef.current) {
        setLoading(false);
      }
    }
  }, [leadId, syncPagination]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const loadOlder = useCallback(async () => {
    if (!leadId || !hasMoreRef.current || loadingOlderRef.current) return false;

    const nextPage = pageRef.current + 1;
    const requestGen = requestGenRef.current;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError(null);

    try {
      const result = await listLeadAssignHistory(leadId, { page: nextPage });
      if (requestGen !== requestGenRef.current) return false;

      if (result.data.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
        return false;
      }

      const older = withClientKeys(result.data, nextPage);
      setMessages((prev) => {
        const seen = new Set(prev.map((item) => item.clientKey).filter(Boolean));
        const next = older.filter((item) => !item.clientKey || !seen.has(item.clientKey));
        // Pages are newest-first. Older pages belong after the messages already loaded.
        return next.length > 0 ? [...prev, ...next] : prev;
      });
      syncPagination(result.meta, nextPage);
      return true;
    } catch (err: unknown) {
      if (requestGen !== requestGenRef.current) return false;
      const message = err instanceof Error ? err.message : 'Failed to load earlier messages.';
      setOlderError(message);
      return false;
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [leadId, syncPagination]);

  const sendMessage = useCallback(
    async (payload: LeadChatSendPayload, sender?: { id?: string | number; name?: string }) => {
      const text = payload.comment.trim();
      if (!leadId || !text || sending) return;

      setSending(true);
      try {
        await sendLeadChatActivity(leadId, payload);
        const optimistic: LeadAssignHistoryItem = {
          clientKey: `local-${Date.now()}`,
          current_user_id: sender?.id ?? '',
          current_user_name: sender?.name || 'You',
          lead_comment: text,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [optimistic, ...prev]);
        await fetchHistory({ silent: true });
      } finally {
        setSending(false);
      }
    },
    [fetchHistory, leadId, sending]
  );

  return {
    messages,
    loading,
    loadingOlder,
    sending,
    error,
    olderError,
    hasMore,
    refetch: fetchHistory,
    loadOlder,
    sendMessage,
  };
}

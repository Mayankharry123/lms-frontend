/**
 * @file LeadChat.tsx
 * @description Lead assign-history chat thread for a selected lead.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bell, BellOff, MessageCircle, Send, X } from 'lucide-react';
import { MasterCreateHeader } from '../../components/ui/MasterCreateHeader';
import SelectField from '../../components/ui/SelectField';
import Input from '../../components/ui/Input';
import { ROUTES } from '../../constants';
import type { RootState } from '../../redux/store';
import { useLeadAssignHistory } from '../../hooks/useLeadAssignHistory';
import type { LeadAssignHistoryItem, ReminderBeforeUnit } from '../../types/lead/lead.types';
import { getCallStatuses } from '../../services/CallStatus';
import { fetchLeadById } from '../../services/ViewLead';
import SweetAlert from '../../utils/SweetAlert';

const REMINDER_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function messageTime(item: LeadAssignHistoryItem): string | null {
  const raw = item.created_at || item.timestamp;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function toCallStatusOptions(data: unknown): { value: string; label: string }[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] } | null)?.data)
      ? ((data as { data?: unknown[] }).data || [])
      : [];

  return rows
    .map((item) => {
      const row = item as { id?: number | string; value?: string; name?: string; label?: string };
      return {
        value: String(row.id ?? row.value ?? ''),
        label: String(row.name ?? row.label ?? ''),
      };
    })
    .filter((item) => item.value && item.label);
}

function formatReminderAt(value: string): string {
  const normalized = value.trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
}

const NEAR_BOTTOM_THRESHOLD = 120;
const TOP_LOAD_THRESHOLD = 80;

function messageTimestamp(item: LeadAssignHistoryItem): number | null {
  const raw = (item.created_at || item.timestamp || '').trim();
  if (!raw) return null;

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;

  const match = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i
  );
  if (!match) return null;

  let hour = Number(match[2]);
  const ampm = match[5]?.toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  const iso = `${match[1]}T${String(hour).padStart(2, '0')}:${match[3]}:${match[4] || '00'}`;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
}

type ChatMessageProps = {
  message: LeadAssignHistoryItem;
  isCurrentUser: boolean;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
  const time = messageTime(message);

  return (
    <article
      className={`flex max-w-full items-end gap-2.5 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isCurrentUser
            ? 'bg-[var(--brand-accent,#f26222)] text-white'
            : 'bg-orange-50 text-[var(--brand-accent,#f26222)]'
        }`}
        aria-hidden
      >
        {initials(message.current_user_name)}
      </span>
      <div className={`max-w-[80%] sm:max-w-[70%] ${isCurrentUser ? 'text-right' : 'text-left'}`}>
        <p className="mb-1 px-1 text-xs font-medium text-gray-600">{message.current_user_name}</p>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isCurrentUser
              ? 'rounded-br-md bg-[var(--brand-accent,#f26222)] text-white'
              : 'rounded-bl-md border border-gray-200 bg-white text-gray-800'
          }`}
        >
          {message.lead_comment || '—'}
        </div>
        {time ? (
          <p className={`mt-1 px-1 text-xs text-gray-400 ${isCurrentUser ? 'text-right' : ''}`}>
            {time}
          </p>
        ) : null}
      </div>
    </article>
  );
};

const LeadChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const leadId = String(id || '').replace(/^#/, '');
  const {
    messages,
    loading,
    loadingOlder,
    sending,
    error,
    olderError,
    hasMore,
    refetch,
    loadOlder,
    sendMessage,
  } = useLeadAssignHistory(leadId || undefined);
  const [draft, setDraft] = useState('');
  const [callStatusId, setCallStatusId] = useState('');
  const [callStatusOptions, setCallStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [reminder, setReminder] = useState(false);
  const [reminderAt, setReminderAt] = useState('');
  const [reminderBefore, setReminderBefore] = useState('');
  const [reminderBeforeUnit, setReminderBeforeUnit] = useState<ReminderBeforeUnit>('minutes');
  const [composerError, setComposerError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const stickToBottomRef = useRef(true);
  const pendingOwnSendRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const pinningRef = useRef(false);
  const olderScrollSnapshotRef = useRef<{ height: number; top: number } | null>(null);
  const loadingOlderLockRef = useRef(false);
  const activeLeadRef = useRef(leadId);

  if (activeLeadRef.current !== leadId) {
    activeLeadRef.current = leadId;
    stickToBottomRef.current = true;
    pendingOwnSendRef.current = false;
    didInitialScrollRef.current = false;
    olderScrollSnapshotRef.current = null;
    loadingOlderLockRef.current = false;
    setComposerOpen(false);
  }

  const currentUserId = currentUser?.id != null ? String(currentUser.id) : '';

  const pinThreadToBottom = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    pinningRef.current = true;
    el.scrollTop = el.scrollHeight;
    pinningRef.current = false;
    stickToBottomRef.current = true;
  }, []);

  const shouldPinToBottom = useCallback(() => {
    if (pendingOwnSendRef.current || !didInitialScrollRef.current) return true;
    return stickToBottomRef.current;
  }, []);

  const requestOlderMessages = useCallback(async (force = false) => {
    if (
      loadingOlderLockRef.current ||
      !hasMore ||
      loading ||
      loadingOlder ||
      pendingOwnSendRef.current
    ) {
      return;
    }
    if (!force && !didInitialScrollRef.current) return;

    const el = threadRef.current;
    if (!el || (!force && el.scrollTop > TOP_LOAD_THRESHOLD)) return;

    loadingOlderLockRef.current = true;
    olderScrollSnapshotRef.current = { height: el.scrollHeight, top: el.scrollTop };
    stickToBottomRef.current = false;

    try {
      const loaded = await loadOlder();
      if (!loaded) olderScrollSnapshotRef.current = null;
    } catch {
      olderScrollSnapshotRef.current = null;
    } finally {
      loadingOlderLockRef.current = false;
    }
  }, [hasMore, loadOlder, loading, loadingOlder]);

  const handleThreadScroll = useCallback(() => {
    if (pinningRef.current) return;
    const el = threadRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    if (el.scrollTop <= TOP_LOAD_THRESHOLD) {
      void requestOlderMessages();
    }
  }, [requestOlderMessages]);

  const handleThreadWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (event.deltaY >= 0) return;
      const el = threadRef.current;
      if (!el || el.scrollTop > TOP_LOAD_THRESHOLD) return;
      void requestOlderMessages();
    },
    [requestOlderMessages]
  );

  useEffect(() => {
    let mounted = true;
    getCallStatuses()
      .then((data: unknown) => {
        if (!mounted) return;
        setCallStatusOptions(toCallStatusOptions(data));
      })
      .catch(() => {
        if (mounted) setCallStatusOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!leadId) return;
    let mounted = true;
    fetchLeadById(leadId)
      .then((lead) => {
        if (!mounted || !lead) return;
        const relationId = lead.call_status_relation?.id;
        if (relationId != null && String(relationId)) {
          setCallStatusId((prev) => prev || String(relationId));
          return;
        }
        const currentName = String(lead.call_status || '').trim();
        if (!currentName || currentName.toUpperCase() === 'N/A') return;
        const matched = callStatusOptions.find(
          (opt) => opt.label.toLowerCase() === currentName.toLowerCase()
        );
        if (matched) setCallStatusId((prev) => prev || matched.value);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [leadId, callStatusOptions]);

  const orderedMessages = useMemo(() => {
    return messages
      .map((message, index) => ({ message, index }))
      .sort((a, b) => {
        const timeA = messageTimestamp(a.message);
        const timeB = messageTimestamp(b.message);
        if (timeA != null && timeB != null && timeA !== timeB) return timeA - timeB;
        if (timeA != null && timeB == null) return 1;
        if (timeA == null && timeB != null) return -1;
        // Assign history arrives newest-first; later indexes are older.
        return b.index - a.index;
      })
      .map((entry) => entry.message);
  }, [messages]);

  useLayoutEffect(() => {
    const el = threadRef.current;
    const snapshot = olderScrollSnapshotRef.current;

    if (pendingOwnSendRef.current) {
      olderScrollSnapshotRef.current = null;
    } else if (snapshot && el) {
      const delta = el.scrollHeight - snapshot.height;
      pinningRef.current = true;
      el.scrollTop = snapshot.top + Math.max(0, delta);
      pinningRef.current = false;
      olderScrollSnapshotRef.current = null;
      stickToBottomRef.current = false;
      return;
    }

    if (loading || orderedMessages.length === 0) return;
    if (!shouldPinToBottom()) return;
    pinThreadToBottom();
  }, [loading, orderedMessages, pinThreadToBottom, shouldPinToBottom]);

  useEffect(() => {
    if (loading || orderedMessages.length === 0) return;

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      if (!shouldPinToBottom()) return;
      pinThreadToBottom();
      secondFrame = window.requestAnimationFrame(() => {
        if (!shouldPinToBottom()) return;
        pinThreadToBottom();
        pendingOwnSendRef.current = false;
        didInitialScrollRef.current = true;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [loading, orderedMessages, pinThreadToBottom, shouldPinToBottom]);

  useEffect(() => {
    const thread = threadRef.current;
    const composer = composerRef.current;
    if (!thread) return;

    const observer = new ResizeObserver(() => {
      if (!didInitialScrollRef.current) return;
      if (!stickToBottomRef.current && !pendingOwnSendRef.current) return;
      pinThreadToBottom();
    });

    observer.observe(thread);
    if (composer) observer.observe(composer);
    return () => observer.disconnect();
  }, [pinThreadToBottom]);

  const canSend = Boolean(draft.trim() && callStatusId && leadId && !sending);

  const submitDraft = async () => {
    if (!draft.trim() || sending || !leadId) return;

    if (!callStatusId) {
      setComposerError('Please select a call status.');
      return;
    }

    if (reminder) {
      if (!reminderAt.trim()) {
        setComposerError('Please select reminder date and time.');
        return;
      }
      const beforeValue = Number(reminderBefore);
      if (!reminderBefore.trim() || !Number.isFinite(beforeValue) || beforeValue < 1) {
        setComposerError('Please enter a valid reminder before value.');
        return;
      }
    }

    setComposerError('');
    stickToBottomRef.current = true;
    pendingOwnSendRef.current = true;
    try {
      await sendMessage(
        reminder
          ? {
              comment: draft.trim(),
              call_status_id: Number(callStatusId),
              reminder: true,
              reminder_at: formatReminderAt(reminderAt),
              reminder_before: Number(reminderBefore),
              reminder_before_unit: reminderBeforeUnit,
            }
          : {
              comment: draft.trim(),
              call_status_id: Number(callStatusId),
              reminder: false,
            },
        { id: currentUser?.id, name: currentUser?.name }
      );
      setDraft('');
      setReminder(false);
      setReminderAt('');
      setReminderBefore('');
      setReminderBeforeUnit('minutes');
    } catch (err: unknown) {
      pendingOwnSendRef.current = false;
      const message = err instanceof Error ? err.message : 'Failed to send message.';
      SweetAlert.showError(message);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitDraft();
  };

  return (
    <div className="lead-chat-page flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0">
        <MasterCreateHeader onClose={() => navigate(ROUTES.LEAD.ALL)} />
      </div>

      <section className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex shrink-0 items-center gap-2.5 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[var(--brand-accent,#f26222)]">
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base! font-semibold leading-5 text-gray-800">Lead Chat</h1>
            <p className="truncate text-xs leading-4 text-gray-500">Assign history conversation</p>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={threadRef}
          role="log"
          aria-label="Lead chat messages"
          aria-busy={loading || loadingOlder}
          onScroll={handleThreadScroll}
          onWheel={handleThreadWheel}
          style={{ overflowAnchor: 'none' }}
          className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-gray-50 px-4 pb-20 pt-4 sm:px-5"
        >
          {loadingOlder ? (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
                Loading earlier messages...
              </span>
            </div>
          ) : null}
          {olderError ? (
            <div className="absolute inset-x-0 top-2 z-10 flex justify-center">
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-[var(--brand-accent,#f26222)] shadow-sm"
                onClick={() => void requestOlderMessages(true)}
              >
                Couldn&apos;t load earlier messages. Try again
              </button>
            </div>
          ) : null}
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading chat history">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${index === 1 ? 'flex-row-reverse' : ''}`}
                >
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200" />
                  <div className={`w-[70%] max-w-sm space-y-2 ${index === 1 ? 'items-end' : ''}`}>
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-16 animate-pulse rounded-2xl bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-md text-sm text-red-600">{error}</p>
              <button type="button" className="btn-primary" onClick={() => void refetch()}>
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-gray-800">No chat history available</p>
              <p className="mt-1 text-xs text-gray-400">Send a message to start this conversation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orderedMessages.map((message) => (
                <ChatMessage
                  key={message.clientKey ?? `${message.current_user_id}-${message.created_at}-${message.lead_comment}`}
                  message={message}
                  isCurrentUser={
                    currentUserId !== '' && String(message.current_user_id) === currentUserId
                  }
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="absolute bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center border-0 text-white shadow-md transition-colors hover:bg-[var(--brand-accent-hover,#d9551c)]"
          style={{
            backgroundColor: 'var(--brand-accent, #f26222)',
            width: '3rem',
            height: '3rem',
            padding: 0,
            borderRadius: '9999px',
          }}
          aria-expanded={composerOpen}
          aria-controls="lead-chat-composer"
          onClick={() => setComposerOpen((open) => !open)}
        >
          {composerOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <MessageCircle className="h-5 w-5" strokeWidth={2} />}
          <span className="sr-only">{composerOpen ? 'Close message box' : 'Open message box'}</span>
        </button>
        </div>

        <div
          id="lead-chat-composer"
          className={`grid shrink-0 transition-[grid-template-rows] duration-300 ease-in-out ${
            composerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className={composerOpen ? 'min-h-0 overflow-visible' : 'min-h-0 overflow-hidden'}>
        <form
          ref={composerRef}
          onSubmit={handleSend}
          inert={!composerOpen}
          aria-hidden={!composerOpen}
          className="relative z-20 overflow-visible border-t border-gray-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-end gap-2">
            <div className="relative z-30 w-[9.5rem] shrink-0 overflow-visible sm:w-56">
              <label htmlFor="chat_call_status" className="app-label">
                Call Status
                <span className="ml-1 text-red-500">*</span>
              </label>
              <SelectField
                name="call_status_id"
                value={callStatusId}
                placeholder="Select call status"
                options={callStatusOptions}
                searchable
                autoCloseOnSelect
                placement="top"
                disabled={sending}
                onChange={(value) => {
                  setCallStatusId(typeof value === 'string' ? value : value[0] ?? '');
                  if (composerError) setComposerError('');
                }}
              />
            </div>
            <label htmlFor="lead-chat-message" className="sr-only">
              Type a message
            </label>
            <textarea
              id="lead-chat-message"
              rows={1}
              value={draft}
              disabled={sending || !leadId}
              onChange={(event) => {
                setDraft(event.target.value);
                if (composerError) setComposerError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submitDraft();
                }
              }}
              placeholder="Type a message..."
              className="app-input max-h-32 min-h-[2.75rem] min-w-0 flex-1 resize-none py-2.5"
            />
            <button
              type="button"
              className={`mb-px flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                reminder
                  ? 'border-[var(--brand-accent,#f26222)] bg-orange-50 text-[var(--brand-accent,#f26222)]'
                  : 'border-gray-200 bg-white text-gray-400'
              }`}
              style={{ width: '2.75rem', height: '2.75rem', padding: 0 }}
              aria-pressed={reminder}
              aria-label={reminder ? 'Reminder on' : 'Reminder off'}
              disabled={sending}
              onClick={() => {
                setReminder((enabled) => {
                  if (enabled) {
                    setReminderAt('');
                    setReminderBefore('');
                    setReminderBeforeUnit('minutes');
                  }
                  return !enabled;
                });
                if (composerError) setComposerError('');
              }}
            >
              {reminder ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              className="btn-primary inline-flex h-11 shrink-0 items-center gap-2 px-4"
              disabled={!canSend}
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          {reminder && (
            <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[1.4fr_1fr_8.5rem]">
              <Input
                type="datetime-local"
                name="reminder_at"
                label="Reminder Date & Time"
                value={reminderAt}
                required
                step={60}
                disabled={sending}
                onChange={(event) => {
                  setReminderAt(event.target.value);
                  if (composerError) setComposerError('');
                }}
              />
              <Input
                type="number"
                name="reminder_before"
                label="Reminder Before"
                min={1}
                step={1}
                placeholder="e.g. 30"
                value={reminderBefore}
                disabled={sending}
                onChange={(event) => {
                  setReminderBefore(event.target.value);
                  if (composerError) setComposerError('');
                }}
              />
              <div>
                <label className="app-label">Unit</label>
                <SelectField
                  name="reminder_before_unit"
                  value={reminderBeforeUnit}
                  options={REMINDER_UNIT_OPTIONS}
                  searchable={false}
                  autoCloseOnSelect
                  placement="top"
                  disabled={sending}
                  onChange={(value) => {
                    const next = typeof value === 'string' ? value : value[0] ?? 'minutes';
                    setReminderBeforeUnit(next as ReminderBeforeUnit);
                  }}
                />
              </div>
            </div>
          )}
          {composerError ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {composerError}
            </p>
          ) : null}
        </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LeadChat;

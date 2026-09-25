import React, { useEffect, useState } from 'react';
import ModalPopup from '../ui/ModalPopup';
import Input from '../ui/Input';
import SelectField from '../ui/SelectField';
import { createLeadChat } from '../../api/leads';
import SweetAlert from '../../utils/SweetAlert';
import type { AllLeadtype, CallStatusOption, ReminderBeforeUnit } from '../../types/lead/lead.types';

type LeadChatModalProps = {
  isOpen: boolean;
  lead: AllLeadtype | null;
  callStatusOptions: CallStatusOption[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type FormErrors = {
  call_status?: string;
  reminder_at?: string;
  reminder_before?: string;
  reminder_before_unit?: string;
};

const REMINDER_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

function numericLeadId(lead: AllLeadtype): number {
  return Number(String(lead.leadNumericId ?? lead.id).replace(/^#/, ''));
}

function formatReminderAt(value: string): string {
  const normalized = value.trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
}

const LeadChatModal: React.FC<LeadChatModalProps> = ({
  isOpen,
  lead,
  callStatusOptions,
  onClose,
  onSaved,
}) => {
  const [callStatusId, setCallStatusId] = useState('');
  const [comment, setComment] = useState('');
  const [reminder, setReminder] = useState(false);
  const [reminderAt, setReminderAt] = useState('');
  const [reminderBefore, setReminderBefore] = useState('');
  const [reminderBeforeUnit, setReminderBeforeUnit] = useState<ReminderBeforeUnit>('minutes');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead) return;

    const currentStatus = (lead.callStatus || '').trim();
    const matched =
      currentStatus && currentStatus.toUpperCase() !== 'N/A'
        ? callStatusOptions.find((opt) => opt.name.toLowerCase() === currentStatus.toLowerCase())
        : undefined;

    setCallStatusId(matched ? String(matched.id) : '');
    setComment('');
    setReminder(false);
    setReminderAt('');
    setReminderBefore('');
    setReminderBeforeUnit('minutes');
    setErrors({});
    setSaving(false);
  }, [isOpen, lead, callStatusOptions]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!callStatusId) {
      next.call_status = 'Call status is required.';
    }

    if (reminder) {
      if (!reminderAt.trim()) {
        next.reminder_at = 'Reminder date and time is required.';
      }
      const beforeValue = Number(reminderBefore);
      if (!reminderBefore.trim() || !Number.isFinite(beforeValue) || beforeValue < 1) {
        next.reminder_before = 'Enter a valid reminder before value.';
      }
      if (!reminderBeforeUnit) {
        next.reminder_before_unit = 'Select a reminder unit.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lead || saving) return;
    if (!validate()) return;

    const leadId = numericLeadId(lead);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      SweetAlert.showError('Invalid lead selected.');
      return;
    }

    setSaving(true);
    try {
      const payload = reminder
        ? {
            lead_id: leadId,
            call_status_id: Number(callStatusId),
            comment: comment.trim(),
            reminder: true,
            reminder_at: formatReminderAt(reminderAt),
            reminder_before: Number(reminderBefore),
            reminder_before_unit: reminderBeforeUnit,
          }
        : {
            lead_id: leadId,
            call_status_id: Number(callStatusId),
            comment: comment.trim(),
            reminder: false,
          };

      await createLeadChat(payload);
      SweetAlert.showSuccess({
        title: 'Chat Saved',
        text: 'Chat details have been saved successfully.',
      });
      await onSaved();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save chat.';
      SweetAlert.showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPopup
      show={isOpen && Boolean(lead)}
      onClose={handleClose}
      title="Chat"
      panelClassName="!max-w-lg"
      bodyClassName="max-h-[75vh] overflow-y-auto"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="call_status" className="app-label">
            Call Status
            <span className="ml-1 text-red-500">*</span>
          </label>
          <SelectField
            name="call_status"
            value={callStatusId}
            placeholder="Select call status"
            options={callStatusOptions.map((opt) => ({
              value: String(opt.id),
              label: opt.name,
            }))}
            onChange={(value) => {
              setCallStatusId(typeof value === 'string' ? value : value[0] ?? '');
              if (errors.call_status) setErrors((prev) => ({ ...prev, call_status: undefined }));
            }}
            searchable
            autoCloseOnSelect
            disabled={saving}
            inputClassName={errors.call_status ? 'border-red-500' : ''}
          />
          {errors.call_status && (
            <p className="mt-1 flex items-center gap-1 text-sm text-red-600" role="alert">
              {errors.call_status}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="comment" className="app-label">
            Comment
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={saving}
            placeholder="Enter conversation or follow-up details"
            className="app-input min-h-[7rem] resize-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>If you Want Reminder Or Not?</span>
          <input
            type="checkbox"
            name="reminder"
            className="h-4 w-4 accent-orange-600"
            checked={reminder}
            disabled={saving}
            onChange={(event) => {
              const checked = event.target.checked;
              setReminder(checked);
              if (!checked) {
                setReminderAt('');
                setReminderBefore('');
                setReminderBeforeUnit('minutes');
                setErrors((prev) => ({
                  ...prev,
                  reminder_at: undefined,
                  reminder_before: undefined,
                  reminder_before_unit: undefined,
                }));
              }
            }}
          />
        </label>

        {reminder && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <Input
              type="datetime-local"
              name="reminder_at"
              label="Reminder Date & Time"
              value={reminderAt}
              required
              step={60}
              disabled={saving}
              error={errors.reminder_at}
              onChange={(event) => {
                setReminderAt(event.target.value);
                if (errors.reminder_at) setErrors((prev) => ({ ...prev, reminder_at: undefined }));
              }}
            />

            <div>
              <label className="app-label">
                Reminder Before
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8.5rem]">
                <Input
                  type="number"
                  name="reminder_before"
                  min={1}
                  step={1}
                  placeholder="e.g. 30"
                  value={reminderBefore}
                  disabled={saving}
                  error={errors.reminder_before}
                  onChange={(event) => {
                    setReminderBefore(event.target.value);
                    if (errors.reminder_before) {
                      setErrors((prev) => ({ ...prev, reminder_before: undefined }));
                    }
                  }}
                />
                <div>
                  <SelectField
                    name="reminder_before_unit"
                    value={reminderBeforeUnit}
                    options={REMINDER_UNIT_OPTIONS}
                    searchable={false}
                    autoCloseOnSelect
                    disabled={saving}
                    inputClassName={errors.reminder_before_unit ? 'border-red-500' : ''}
                    onChange={(value) => {
                      const next = typeof value === 'string' ? value : value[0] ?? 'minutes';
                      setReminderBeforeUnit(next as ReminderBeforeUnit);
                      if (errors.reminder_before_unit) {
                        setErrors((prev) => ({ ...prev, reminder_before_unit: undefined }));
                      }
                    }}
                  />
                  {errors.reminder_before_unit && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.reminder_before_unit}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Chat'}
          </button>
        </div>
      </form>
    </ModalPopup>
  );
};

export default LeadChatModal;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import { CalendarDays, ChevronDown } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './DashboardDateRangePicker.css';
import {
  DATE_PRESET_OPTIONS,
  formatDashboardDateLabel,
  formatLocalDate,
  formatSingleDashboardDate,
  getDateRangeForPreset,
  type DashboardFilterState,
  type DatePreset,
} from '../../utils/dashboardFilters';

type DashboardDateRangePickerProps = {
  value: Pick<DashboardFilterState, 'preset' | 'dateFrom' | 'dateTo'>;
  onApply: (next: Pick<DashboardFilterState, 'preset' | 'dateFrom' | 'dateTo'>) => void;
};

const parseLocalDate = (dateValue: string): Date | null => {
  if (!dateValue) return null;
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const DashboardDateRangePicker: React.FC<DashboardDateRangePickerProps> = ({ value, onApply }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [draftPreset, setDraftPreset] = useState<DatePreset>(value.preset);
  const [draftStart, setDraftStart] = useState<Date | null>(parseLocalDate(value.dateFrom));
  const [draftEnd, setDraftEnd] = useState<Date | null>(parseLocalDate(value.dateTo));

  const syncDraftFromValue = useCallback(() => {
    setDraftPreset(value.preset);
    setDraftStart(parseLocalDate(value.dateFrom));
    setDraftEnd(parseLocalDate(value.dateTo));
  }, [value.preset, value.dateFrom, value.dateTo]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        syncDraftFromValue();
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [syncDraftFromValue]);

  // Adjust popover position so it never overflows screen edges
  useEffect(() => {
    if (!open) return;

    const adjustPosition = () => {
      if (!popoverRef.current) return;
      popoverRef.current.style.transform = 'translateX(-50%)';
      const rect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      if (rect.left < 16) {
        const offset = 16 - rect.left;
        popoverRef.current.style.transform = `translateX(calc(-50% + ${offset}px))`;
      } else if (rect.right > viewportWidth - 16) {
        const offset = rect.right - (viewportWidth - 16);
        popoverRef.current.style.transform = `translateX(calc(-50% - ${offset}px))`;
      }
    };

    const animId = requestAnimationFrame(adjustPosition);
    window.addEventListener('resize', adjustPosition);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', adjustPosition);
    };
  }, [open]);

  const openPicker = () => {
    syncDraftFromValue();
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    syncDraftFromValue();
  };

  const applyDraft = (preset: DatePreset, start: Date | null, end: Date | null, close = true) => {
    if (!start || !end) return;

    onApply({
      preset,
      dateFrom: formatLocalDate(start),
      dateTo: formatLocalDate(end),
    });

    if (close) {
      setOpen(false);
    }
  };

  const applyPreset = (preset: DatePreset) => {
    setDraftPreset(preset);

    if (preset === 'custom') {
      setDraftStart(null);
      setDraftEnd(null);
      return;
    }

    const range = getDateRangeForPreset(preset);
    const start = parseLocalDate(range.dateFrom);
    const end = parseLocalDate(range.dateTo);

    setDraftStart(start);
    setDraftEnd(end);
    applyDraft(preset, start, end, true);
  };

  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;

    setDraftPreset('custom');
    setDraftStart(start);
    setDraftEnd(end);

    if (start && end) {
      applyDraft('custom', start, end, true);
    }
  };

  return (
    <div ref={containerRef} className="dashboard-date-picker">
      <button
        type="button"
        onClick={() => (open ? closePicker() : openPicker())}
        className={`dashboard-date-picker__trigger ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate">{formatDashboardDateLabel(value.dateFrom, value.dateTo)}</span>
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div ref={popoverRef} className="dashboard-date-picker__popover" role="dialog" aria-label="Date range picker">
          <aside className="dashboard-date-picker__presets">
            <span className="dashboard-date-picker__presets-title">Presets</span>
            <div className="dashboard-date-picker__presets-list">
              {DATE_PRESET_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyPreset(option.id)}
                  className={`dashboard-date-picker__preset ${draftPreset === option.id ? 'is-active' : ''}`}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="dashboard-date-picker__main">
            <div className="dashboard-date-picker__calendar">
              <DatePicker
                selected={draftStart}
                onChange={handleRangeChange}
                startDate={draftStart}
                endDate={draftEnd}
                selectsRange
                inline
                monthsShown={2}
                showPopperArrow={false}
                shouldCloseOnSelect={false}
              />
            </div>

            <div className="dashboard-date-picker__footer">
              <div className="dashboard-date-picker__range-inputs">
                <div className="dashboard-date-picker__field">
                  <span className="dashboard-date-picker__field-label">From</span>
                  <div className="dashboard-date-picker__field-box">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                    <input
                      type="text"
                      readOnly
                      value={draftStart ? formatSingleDashboardDate(formatLocalDate(draftStart)) : ''}
                      placeholder="Start date"
                    />
                  </div>
                </div>

                <div className="dashboard-date-picker__field-separator" aria-hidden>
                  →
                </div>

                <div className="dashboard-date-picker__field">
                  <span className="dashboard-date-picker__field-label">To</span>
                  <div className="dashboard-date-picker__field-box">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                    <input
                      type="text"
                      readOnly
                      value={draftEnd ? formatSingleDashboardDate(formatLocalDate(draftEnd)) : ''}
                      placeholder="End date"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDateRangePicker;

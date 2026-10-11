import React, { useRef, useState } from 'react';
import { ChevronDown, Check, Users, FileText } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

export type PriorityOption = { id: number; name: string; slug?: string };

type PriorityMetricCardProps = {
  title: string;
  subtitle?: string;
  total: number | null;
  priorityCount: number | null;
  options: PriorityOption[];
  selectedId: number | null;
  onSelect: (option: PriorityOption) => void;
  embedded?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  tone?: 'blue' | 'orange' | 'emerald' | 'purple';
};

const getPriorityMeta = (name?: string) => {
  const lower = (name ?? '').toLowerCase();
  if (lower.includes('high')) {
    return {
      dotBg: '#ef4444',
      badgeBg:
        'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      barGradient: 'linear-gradient(90deg, #f43f5e 0%, #fb923c 100%)',
    };
  }
  if (lower.includes('med')) {
    return {
      dotBg: '#f59e0b',
      badgeBg:
        'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      barGradient: 'linear-gradient(90deg, #f59e0b 0%, #facc15 100%)',
    };
  }
  return {
    dotBg: '#10b981',
    badgeBg:
      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
    barGradient: 'linear-gradient(90deg, #10b981 0%, #14b8a6 100%)',
  };
};

const PriorityMetricCard: React.FC<PriorityMetricCardProps> = ({
  title,
  subtitle,
  total,
  priorityCount,
  options,
  selectedId,
  onSelect,
  embedded = false,
  loading = false,
  icon,
  tone,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const priorityOptions = options ?? [];
  const selected = priorityOptions.find((option) => option.id === selectedId);

  useClickOutside([containerRef], open, () => setOpen(false));

  const resolvedTone =
    tone ?? (title.toLowerCase().includes('lead') ? 'blue' : 'orange');

  const resolvedIcon =
    icon ??
    (resolvedTone === 'blue' ? (
      <Users />
    ) : resolvedTone === 'orange' ? (
      <FileText />
    ) : (
      <Users />
    ));

  const resolvedSubtitle =
    subtitle ??
    (resolvedTone === 'blue'
      ? 'Active Lead Pipeline'
      : 'Campaign Briefs');

  const priorityMeta = getPriorityMeta(selected?.name);

  const percentage =
    total != null && total > 0 && priorityCount != null
      ? Math.round((priorityCount / total) * 100)
      : 0;

  if (loading) {
    return (
      <div className={`sales-kpi-card sales-kpi-card--tone-${resolvedTone} ${embedded ? 'is-embedded' : ''}`}>
        <div className="sales-kpi-card__header">
          <div className="sales-kpi-card__title-group">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="space-y-1">
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="sales-kpi-card__body">
          <div className="w-28 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="sales-kpi-card__progress-wrap">
          <div className="sales-kpi-card__track animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`sales-kpi-card sales-kpi-card--tone-${resolvedTone} ${embedded ? 'is-embedded' : ''}`}
      aria-label={`${title} Metric Card`}
    >
      {/* Card Header */}
      <div className="sales-kpi-card__header">
        <div className="sales-kpi-card__title-group">
          <div
            className={`sales-kpi-card__icon sales-kpi-card__icon--${resolvedTone}`}
            aria-hidden="true"
          >
            {resolvedIcon}
          </div>
          <div className="sales-kpi-card__titles">
            <h4 className="sales-kpi-card__title">{title}</h4>
            <p className="sales-kpi-card__subtitle">{resolvedSubtitle}</p>
          </div>
        </div>

        {/* Priority Filter Pill Trigger */}
        {priorityOptions.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              className="sales-kpi-card__priority-trigger"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              aria-label={`Filter by priority, currently ${selected?.name ?? 'Priority'}`}
            >
              <span
                className="sales-kpi-card__priority-dot"
                style={{ backgroundColor: priorityMeta.dotBg }}
              />
              <span>{selected?.name ?? 'Priority'}</span>
              <ChevronDown
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200"
                style={{ transform: open ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {/* Floating Dropdown */}
            {open ? (
              <div className="sales-kpi-card__menu" role="menu">
                <div className="sales-kpi-card__menu-header">Select Priority</div>
                {priorityOptions.map((option) => {
                  const meta = getPriorityMeta(option.name);
                  const isSelected = option.id === selectedId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitem"
                      className={`sales-kpi-card__menu-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelect(option);
                        setOpen(false);
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: meta.dotBg }}
                        />
                        {option.name}
                      </span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Main Stat & Priority Share */}
      <div className="sales-kpi-card__body">
        <div className="flex items-baseline gap-2">
          <h3 className="sales-kpi-card__value">
            {total != null ? total : '--'}
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Total
          </span>
        </div>

        <div className={`sales-kpi-card__pill border ${priorityMeta.badgeBg}`}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: priorityMeta.dotBg }}
          />
          <span>
            {priorityCount != null ? priorityCount : '--'} {selected?.name ?? 'Priority'}
          </span>
        </div>
      </div>

      {/* Progress Track & Details */}
      <div className="sales-kpi-card__progress-wrap">
        <div className="sales-kpi-card__track">
          <div
            className="sales-kpi-card__bar"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              background: priorityMeta.barGradient,
            }}
          />
        </div>
        <div className="sales-kpi-card__footer">
          <span>
            {priorityCount ?? 0} of {total ?? 0} {selected?.name ?? 'Priority'} ({percentage}%)
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            {total != null && priorityCount != null ? `${total}/${priorityCount}` : 'Pipeline'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PriorityMetricCard;

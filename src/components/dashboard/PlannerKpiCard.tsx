import React from 'react';

type PlannerKpiCardProps = {
  title: string;
  subtitle: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: 'blue' | 'orange' | 'purple' | 'rose' | 'emerald' | 'teal';
  badge?: React.ReactNode;
  pill?: React.ReactNode;
  progressPercent?: number;
  footerLeft?: string;
  footerRight?: string;
  embedded?: boolean;
  loading?: boolean;
};

const TONE_BAR_GRADIENTS: Record<string, string> = {
  blue: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
  orange: 'linear-gradient(90deg, #f97316 0%, #f59e0b 100%)',
  purple: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)',
  emerald: 'linear-gradient(90deg, #10b981 0%, #14b8a6 100%)',
  rose: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
  teal: 'linear-gradient(90deg, #0d9488 0%, #06b6d4 100%)',
};

const PlannerKpiCard: React.FC<PlannerKpiCardProps> = ({
  title,
  subtitle,
  value,
  icon,
  tone,
  badge,
  pill,
  progressPercent = 100,
  footerLeft,
  footerRight,
  embedded = false,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={`sales-kpi-card sales-kpi-card--tone-${tone} ${embedded ? 'is-embedded' : ''}`}>
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
          <div className="w-24 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="sales-kpi-card__progress-wrap">
          <div className="sales-kpi-card__track animate-pulse" />
        </div>
      </div>
    );
  }

  const gradient = TONE_BAR_GRADIENTS[tone] || TONE_BAR_GRADIENTS.blue;
  const clampedPercent = Math.min(Math.max(progressPercent, 0), 100);

  return (
    <div
      className={`sales-kpi-card sales-kpi-card--tone-${tone} ${embedded ? 'is-embedded' : ''}`}
      aria-label={`${title} Metric Card`}
    >
      <div className="sales-kpi-card__header">
        <div className="sales-kpi-card__title-group">
          <div className={`sales-kpi-card__icon sales-kpi-card__icon--${tone}`} aria-hidden="true">
            {icon}
          </div>
          <div className="sales-kpi-card__titles">
            <h4 className="sales-kpi-card__title">{title}</h4>
            <p className="sales-kpi-card__subtitle">{subtitle}</p>
          </div>
        </div>

        {badge ? (
          <span className={`sales-kpi-card__badge sales-kpi-card__badge--${tone}`}>
            {badge}
          </span>
        ) : null}
      </div>

      <div className="sales-kpi-card__body">
        <h3 className="sales-kpi-card__value">{value ?? '--'}</h3>
        {pill ? (
          <span className={`sales-kpi-card__pill sales-kpi-card__badge--${tone}`}>
            {pill}
          </span>
        ) : null}
      </div>

      <div className="sales-kpi-card__progress-wrap">
        <div className="sales-kpi-card__track">
          <div
            className="sales-kpi-card__bar"
            style={{
              width: `${clampedPercent}%`,
              background: gradient,
            }}
          />
        </div>
        <div className="sales-kpi-card__footer">
          <span>{footerLeft ?? 'Planning Metric'}</span>
          {footerRight ? <span className="font-semibold">{footerRight}</span> : null}
        </div>
      </div>
    </div>
  );
};

export default PlannerKpiCard;

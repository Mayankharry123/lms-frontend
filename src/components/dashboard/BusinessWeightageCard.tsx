import React from 'react';
import { Target, Sparkles } from 'lucide-react';
import type { BusinessForecastData } from '../../services/SalesDashboard';

type BusinessWeightageCardProps = {
  forecast: BusinessForecastData | null;
  loading?: boolean;
  embedded?: boolean;
};

const BusinessWeightageCard: React.FC<BusinessWeightageCardProps> = ({
  forecast,
  loading = false,
  embedded = false,
}) => {
  if (loading) {
    return (
      <div className={`sales-kpi-card sales-kpi-card--tone-purple ${embedded ? 'is-embedded' : ''}`}>
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
          <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="sales-kpi-card__progress-wrap">
          <div className="sales-kpi-card__track animate-pulse" />
        </div>
      </div>
    );
  }

  const weightage = forecast?.business_weightage ?? null;
  const numericWeight = weightage != null ? Math.min(Math.max(Number(weightage) || 0, 0), 100) : 0;
  const formattedValue = weightage != null ? `${weightage}%` : '--';

  return (
    <div
      className={`sales-kpi-card sales-kpi-card--tone-purple ${embedded ? 'is-embedded' : ''}`}
      aria-label="Business Weightage Card"
    >
      <div className="sales-kpi-card__header">
        <div className="sales-kpi-card__title-group">
          <div className="sales-kpi-card__icon sales-kpi-card__icon--purple" aria-hidden="true">
            <Target />
          </div>
          <div className="sales-kpi-card__titles">
            <h4 className="sales-kpi-card__title">Business Weightage</h4>
            <p className="sales-kpi-card__subtitle">Conversion Share</p>
          </div>
        </div>

        <span className="sales-kpi-card__badge sales-kpi-card__badge--purple">
          <Sparkles className="w-3 h-3 text-purple-500" />
          Weightage
        </span>
      </div>

      <div className="sales-kpi-card__body">
        <h3 className="sales-kpi-card__value text-purple-950 dark:text-purple-100">{formattedValue}</h3>
        <span className="sales-kpi-card__pill bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
          Conversion Target
        </span>
      </div>

      <div className="sales-kpi-card__progress-wrap">
        <div className="sales-kpi-card__track">
          <div
            className="sales-kpi-card__bar"
            style={{
              width: `${numericWeight}%`,
              background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)',
            }}
          />
        </div>
        <div className="sales-kpi-card__footer">
          <span>{numericWeight}% weighted contribution</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            {numericWeight} / 100
          </span>
        </div>
      </div>
    </div>
  );
};

export default BusinessWeightageCard;

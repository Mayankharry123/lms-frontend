import React from 'react';
import { TrendingUp, ArrowUpRight, IndianRupee } from 'lucide-react';
import { formatDashboardCurrency } from '../../utils/dashboardFormat';
import type { BusinessForecastData } from '../../services/SalesDashboard';

type BusinessForecastCardProps = {
  forecast: BusinessForecastData | null;
  loading?: boolean;
  embedded?: boolean;
};

const BusinessForecastCard: React.FC<BusinessForecastCardProps> = ({
  forecast,
  loading = false,
  embedded = false,
}) => {
  if (loading) {
    return (
      <div className={`sales-kpi-card sales-kpi-card--tone-emerald ${embedded ? 'is-embedded' : ''}`}>
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
          <div className="w-32 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="sales-kpi-card__progress-wrap">
          <div className="sales-kpi-card__track animate-pulse" />
        </div>
      </div>
    );
  }

  const totalBudget = forecast?.total_budget ?? null;
  const briefCount = forecast?.total_brief_count ?? 0;
  const formattedValue = totalBudget != null ? formatDashboardCurrency(totalBudget) : '--';
  const avgBudget = totalBudget != null && briefCount > 0 ? Math.round(totalBudget / briefCount) : null;

  return (
    <div
      className={`sales-kpi-card sales-kpi-card--tone-emerald ${embedded ? 'is-embedded' : ''}`}
      aria-label="Business Forecast Card"
    >
      <div className="sales-kpi-card__header">
        <div className="sales-kpi-card__title-group">
          <div className="sales-kpi-card__icon sales-kpi-card__icon--emerald" aria-hidden="true">
            <TrendingUp />
          </div>
          <div className="sales-kpi-card__titles">
            <h4 className="sales-kpi-card__title">Business Forecast</h4>
            <p className="sales-kpi-card__subtitle">Projected Revenue</p>
          </div>
        </div>

        <span className="sales-kpi-card__badge sales-kpi-card__badge--emerald">
          <IndianRupee className="w-3 h-3" />
          Pipeline
        </span>
      </div>

      <div className="sales-kpi-card__body">
        <h3 className="sales-kpi-card__value text-emerald-950 dark:text-emerald-100">{formattedValue}</h3>
        <span className="sales-kpi-card__pill bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Active Value
        </span>
      </div>

      <div className="sales-kpi-card__progress-wrap">
        <div className="sales-kpi-card__track">
          <div
            className="sales-kpi-card__bar"
            style={{
              width: totalBudget != null && totalBudget > 0 ? '100%' : '0%',
              background: 'linear-gradient(90deg, #10b981 0%, #14b8a6 100%)',
            }}
          />
        </div>
        <div className="sales-kpi-card__footer">
          <span>
            {briefCount > 0
              ? `From ${briefCount} active brief${briefCount !== 1 ? 's' : ''} in pipeline`
              : 'Active brief pipeline'}
          </span>
          {avgBudget != null ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              Avg: {formatDashboardCurrency(avgBudget)}/brief
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Target: Revenue</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessForecastCard;

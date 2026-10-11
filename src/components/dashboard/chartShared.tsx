import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCount } from '../../utils/dashboardFormat';

export type ChartPoint = {
  name: string;
  value: number;
};

function normalizeTooltipValue(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return Number(raw ?? 0);
}

type MetricChartCardProps = {
  title: string;
  color: string;
  data: ChartPoint[];
  loading: boolean;
  valueFormatter?: (value: number) => string;
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
};

export function MetricChartCard({
  title,
  color,
  data,
  loading,
  valueFormatter = formatCount,
  collapsible = false,
  isExpanded = true,
  onToggle,
}: MetricChartCardProps) {
  const hasChartRows = data.length > 0;
  const hasPositiveValues = data.some((point) => point.value > 0);

  return (
    <div
      className={`dashboard-chart-card ${
        collapsible ? 'dashboard-chart-card--collapsible' : ''
      } ${collapsible && !isExpanded ? 'is-collapsed' : ''}`}
    >
      <div
        className={`dashboard-chart-card__header ${
          collapsible ? 'dashboard-chart-card__header--clickable' : ''
        }`}
        onClick={collapsible ? onToggle : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle?.();
                }
              }
            : undefined
        }
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-label={collapsible ? `${title} chart, ${isExpanded ? 'collapse' : 'expand'}` : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="dashboard-chart-card__dot" style={{ backgroundColor: color }} />
          <h3 className="dashboard-chart-card__title">{title}</h3>
        </div>

        {collapsible ? (
          <div className="dashboard-chart-card__chevron-wrap">
            <ChevronDown
              className={`dashboard-chart-card__chevron ${
                isExpanded ? 'is-expanded' : ''
              }`}
            />
          </div>
        ) : (
          <span className="dashboard-chart-card__dot" style={{ backgroundColor: color }} />
        )}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="dashboard-chart-card__content">
          {loading ? (
            <div className="dashboard-chart-card__empty">Loading chart...</div>
          ) : !hasChartRows ? (
            <div className="dashboard-chart-card__empty">No data for selected filters</div>
          ) : (
            <div className="dashboard-chart-card__body">
              {!hasPositiveValues ? (
                <p className="dashboard-chart-card__hint">No records in the selected date range.</p>
              ) : null}
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value: number | string | undefined) => formatCount(Number(value ?? 0))}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [valueFormatter(normalizeTooltipValue(value)), title]}
                    labelFormatter={(label: unknown) => String(label ?? '')}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type PipelineChartCardProps = {
  title: string;
  data: ChartPoint[];
  loading: boolean;
  colors: string[];
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
};

export function PipelineChartCard({
  title,
  data,
  loading,
  colors,
  collapsible = false,
  isExpanded = true,
  onToggle,
}: PipelineChartCardProps) {
  const hasPositiveValues = data.some((point) => point.value > 0);

  return (
    <div
      className={`dashboard-chart-card ${
        collapsible ? 'dashboard-chart-card--collapsible' : ''
      } ${collapsible && !isExpanded ? 'is-collapsed' : ''}`}
    >
      <div
        className={`dashboard-chart-card__header ${
          collapsible ? 'dashboard-chart-card__header--clickable' : ''
        }`}
        onClick={collapsible ? onToggle : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle?.();
                }
              }
            : undefined
        }
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-label={collapsible ? `${title} chart, ${isExpanded ? 'collapse' : 'expand'}` : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="dashboard-chart-card__dot" style={{ backgroundColor: '#2563eb' }} />
          <h3 className="dashboard-chart-card__title">{title}</h3>
        </div>

        {collapsible ? (
          <div className="dashboard-chart-card__chevron-wrap">
            <ChevronDown
              className={`dashboard-chart-card__chevron ${
                isExpanded ? 'is-expanded' : ''
              }`}
            />
          </div>
        ) : null}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="dashboard-chart-card__content">
          {loading ? (
            <div className="dashboard-chart-card__empty">Loading chart...</div>
          ) : !hasPositiveValues ? (
            <div className="dashboard-chart-card__empty">No pipeline data for selected filters</div>
          ) : (
            <div className="dashboard-chart-card__body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value: number | string | undefined) => formatCount(Number(value ?? 0))}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatCount(normalizeTooltipValue(value)), 'Count']}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {data.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type StatusPieChartCardProps = {
  title: string;
  data: ChartPoint[];
  loading: boolean;
  colors: string[];
  emptyLabel?: string;
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
};

export function StatusPieChartCard({
  title,
  data,
  loading,
  colors,
  emptyLabel = 'No status data for selected filters',
  collapsible = false,
  isExpanded = true,
  onToggle,
}: StatusPieChartCardProps) {
  const filtered = data.filter((point) => point.value > 0);
  const hasData = filtered.length > 0;

  return (
    <div className="dashboard-chart-card">
      <div
        className={`dashboard-chart-card__header ${
          collapsible ? 'dashboard-chart-card__header--clickable' : ''
        }`}
        onClick={collapsible ? onToggle : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle?.();
                }
              }
            : undefined
        }
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-label={collapsible ? `${title} chart, ${isExpanded ? 'collapse' : 'expand'}` : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="dashboard-chart-card__dot" style={{ backgroundColor: colors[0] ?? '#2563eb' }} />
          <h3 className="dashboard-chart-card__title">{title}</h3>
        </div>

        {collapsible ? (
          <div className="dashboard-chart-card__chevron-wrap">
            <ChevronDown
              className={`dashboard-chart-card__chevron ${
                isExpanded ? 'is-expanded' : ''
              }`}
            />
          </div>
        ) : null}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="dashboard-chart-card__content">
          {loading ? (
            <div className="dashboard-chart-card__empty">Loading chart...</div>
          ) : !hasData ? (
            <div className="dashboard-chart-card__empty">{emptyLabel}</div>
          ) : (
            <div className="dashboard-chart-card__body">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={filtered}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {filtered.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [formatCount(normalizeTooltipValue(value)), 'Count']}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ChartsSectionHeaderProps = {
  title: string;
  subtitle?: string;
  totals?: React.ReactNode;
};

export function ChartsSectionHeader({ title, subtitle, totals }: ChartsSectionHeaderProps) {
  return (
    <div className="dashboard-charts__header">
      <div>
        <h2 className="dashboard-charts__title">{title}</h2>
        {subtitle ? <p className="dashboard-charts__subtitle">{subtitle}</p> : null}
      </div>
      {totals ? <div className="dashboard-charts__totals">{totals}</div> : null}
    </div>
  );
}

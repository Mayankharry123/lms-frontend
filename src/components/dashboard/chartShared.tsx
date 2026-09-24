import React from 'react';
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
import { formatCount, type ChartPoint } from '../../utils/dashboardFormat';

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
};

export function MetricChartCard({
  title,
  color,
  data,
  loading,
  valueFormatter = formatCount,
}: MetricChartCardProps) {
  const hasChartRows = data.length > 0;
  const hasPositiveValues = data.some((point) => point.value > 0);

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-card__header">
        <h3 className="dashboard-chart-card__title">{title}</h3>
        <span className="dashboard-chart-card__dot" style={{ backgroundColor: color }} />
      </div>

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
  );
}

type PipelineChartCardProps = {
  title: string;
  data: ChartPoint[];
  loading: boolean;
  colors: string[];
};

export function PipelineChartCard({ title, data, loading, colors }: PipelineChartCardProps) {
  const hasPositiveValues = data.some((point) => point.value > 0);

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-card__header">
        <h3 className="dashboard-chart-card__title">{title}</h3>
      </div>

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
  );
}

type StatusPieChartCardProps = {
  title: string;
  data: ChartPoint[];
  loading: boolean;
  colors: string[];
};

export function StatusPieChartCard({ title, data, loading, colors }: StatusPieChartCardProps) {
  const filtered = data.filter((point) => point.value > 0);
  const hasData = filtered.length > 0;

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-card__header">
        <h3 className="dashboard-chart-card__title">{title}</h3>
      </div>

      {loading ? (
        <div className="dashboard-chart-card__empty">Loading chart...</div>
      ) : !hasData ? (
        <div className="dashboard-chart-card__empty">No brief status data for selected filters</div>
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
  );
}

type ChartsSectionHeaderProps = {
  title: string;
  subtitle: string;
  totals?: React.ReactNode;
};

export function ChartsSectionHeader({ title, subtitle, totals }: ChartsSectionHeaderProps) {
  return (
    <div className="dashboard-charts__header">
      <div>
        <h2 className="dashboard-charts__title">{title}</h2>
        <p className="dashboard-charts__subtitle">{subtitle}</p>
      </div>
      {totals ? <div className="dashboard-charts__totals">{totals}</div> : null}
    </div>
  );
}

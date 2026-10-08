/**
 * @file FinanceDashboard.tsx
 * @description Finance dashboard for cost sheets, approvals, and purchase orders.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, FileSpreadsheet, Hourglass, Wallet } from 'lucide-react';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import DashboardMetricCard from '../../components/dashboard/DashboardMetricCard';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getFinanceChartMetrics } from '../../services/DashboardCharts';
import type { FinanceDashboardItem } from '../../services/DashboardCharts';
import { ROUTES } from '../../constants';
import {
  createDefaultDashboardFilters,
  serializeDashboardFilters,
  type DashboardFilterState,
} from '../../utils/dashboardFilters';
import { formatDashboardCurrency } from '../../utils/dashboardFormat';
import type { DashboardView } from '../../utils/dashboardCardVisibility';

const STATUS_BADGE: Record<string, string> = {
  approved: 'dashboard-badge dashboard-badge--success',
  denied: 'dashboard-badge dashboard-badge--danger',
  pending: 'dashboard-badge dashboard-badge--warning',
};

type FinanceDashboardProps = {
  embedded?: boolean;
  filters?: DashboardFilterState;
  isCardVisible?: (view: DashboardView, cardId: string) => boolean;
};

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  embedded = false,
  filters: filtersProp,
  isCardVisible = () => true,
}) => {
  const navigate = useNavigate();
  const [localFilters] = useState(createDefaultDashboardFilters);
  const filters = filtersProp ?? localFilters;
  const filterKey = serializeDashboardFilters(filters);

  const { data, loading, error } = useApiQuery(
    () => getFinanceChartMetrics(filters),
    [filterKey],
  );

  const recent = data?.recent ?? [];

  const renderFinanceCard = (item: FinanceDashboardItem) => {
    const statusKey = item.financeStatus.toLowerCase();
    return (
      <div key={item.id} className="dashboard-planner-brief">
        <div className="dashboard-planner-brief__meta">
          <div className="dashboard-planner-brief__id-row">
            <span className="dashboard-planner-brief__id-label">Cost Sheet</span>
            <span className="dashboard-planner-brief__id">#{item.id}</span>
            <span className={STATUS_BADGE[statusKey] ?? 'dashboard-badge'}>{item.financeStatus}</span>
          </div>
          <p className="dashboard-planner-brief__field">
            <strong>Brief Name:</strong> {item.briefName}
          </p>
          <p className="dashboard-planner-brief__field">
            <strong>Planner:</strong> {item.plannerName}
          </p>
          <p className="dashboard-planner-brief__field">
            <strong>Finance User:</strong> {item.assignUser}
          </p>
        </div>
        <div className="dashboard-planner-brief__aside">
          <span className="dashboard-planner-brief__budget">
            {formatDashboardCurrency(item.purchaseOrderAmount)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-content">
      {error ? (
        <div className="dashboard-error-state">{error}</div>
      ) : (
        <div className="dashboard-stat-grid">
          {isCardVisible('finance', 'finance.cost-sheets') ? (
            <DashboardMetricCard
              title="Cost Sheets"
              value={data?.totals.costSheets ?? 0}
              icon={<FileSpreadsheet />}
              embedded={embedded}
              loading={loading}
              className="dashboard-metric-card--tone-blue"
            />
          ) : null}
          {isCardVisible('finance', 'finance.pending') ? (
            <DashboardMetricCard
              title="Pending Review"
              value={data?.totals.pending ?? 0}
              icon={<Hourglass />}
              embedded={embedded}
              loading={loading}
              className="dashboard-metric-card--tone-amber"
            />
          ) : null}
          {isCardVisible('finance', 'finance.approved') ? (
            <DashboardMetricCard
              title="Approved"
              value={data?.totals.approved ?? 0}
              icon={<BadgeCheck />}
              embedded={embedded}
              loading={loading}
              className="dashboard-metric-card--tone-teal"
            />
          ) : null}
          {isCardVisible('finance', 'finance.purchase-orders') ? (
            <DashboardMetricCard
              title="Purchase Order Amount"
              value={formatDashboardCurrency(data?.totals.purchaseOrderAmount ?? 0)}
              icon={<Wallet />}
              embedded={embedded}
              loading={loading}
            />
          ) : null}
        </div>
      )}

      <DashboardChartsSection variant="finance" filters={filters} isCardVisible={isCardVisible} />

      {isCardVisible('finance', 'finance.recent') ? (
        <div className="dashboard-section-block">
          <div className="flex items-center justify-between mb-3">
            <h3 className="dashboard-section-block__title mb-0">Recent Cost Sheets</h3>
            <button type="button" className="a-tag-button" onClick={() => navigate(ROUTES.COST_SHEETS)}>
              View All
            </button>
          </div>
          <div className="dashboard-planner-briefs">
            {loading ? (
              <div className="dashboard-empty-state">Loading cost sheets...</div>
            ) : error ? (
              <div className="dashboard-error-state">{error}</div>
            ) : recent.length === 0 ? (
              <div className="dashboard-empty-state">No cost sheets in the selected date range.</div>
            ) : (
              recent.map(renderFinanceCard)
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FinanceDashboard;

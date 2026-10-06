/**
 * @file OperationsDashboard.tsx
 * @description Operations dashboard for campaign operations, status, and assignments.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Radio, UserCheck, Clock3 } from 'lucide-react';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import DashboardMetricCard from '../../components/dashboard/DashboardMetricCard';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getOperationsChartMetrics } from '../../services/DashboardCharts';
import type { OperationsDashboardItem } from '../../services/DashboardCharts';
import { ROUTES } from '../../constants';
import {
  createDefaultDashboardFilters,
  serializeDashboardFilters,
  type DashboardFilterState,
} from '../../utils/dashboardFilters';
import type { DashboardView } from '../../utils/dashboardCardVisibility';

const STATUS_BADGE: Record<string, string> = {
  live: 'dashboard-badge dashboard-badge--success',
  pending: 'dashboard-badge dashboard-badge--warning',
};

type OperationsDashboardProps = {
  embedded?: boolean;
  filters?: DashboardFilterState;
  isCardVisible?: (view: DashboardView, cardId: string) => boolean;
};

const OperationsDashboard: React.FC<OperationsDashboardProps> = ({
  embedded = false,
  filters: filtersProp,
  isCardVisible = () => true,
}) => {
  const navigate = useNavigate();
  const [localFilters] = useState(createDefaultDashboardFilters);
  const filters = filtersProp ?? localFilters;
  const filterKey = serializeDashboardFilters(filters);

  const { data, loading, error } = useApiQuery(
    () => getOperationsChartMetrics(filters),
    [filterKey],
  );

  const recent = data?.recent ?? [];

  const renderOperationCard = (item: OperationsDashboardItem) => {
    const statusKey = item.status.toLowerCase();
    return (
      <div key={item.id} className="dashboard-planner-brief">
        <div className="dashboard-planner-brief__meta">
          <div className="dashboard-planner-brief__id-row">
            <span className="dashboard-planner-brief__id-label">Operation</span>
            <span className="dashboard-planner-brief__id">#{item.id}</span>
            {item.status && item.status !== '-' ? (
              <span className={STATUS_BADGE[statusKey] ?? 'dashboard-badge'}>{item.status}</span>
            ) : null}
          </div>
          <p className="dashboard-planner-brief__field">
            <strong>Brief Name:</strong> {item.briefName}
          </p>
          <p className="dashboard-planner-brief__field">
            <strong>Product Name:</strong> {item.productName}
          </p>
          <p className="dashboard-planner-brief__field">
            <strong>Assign User:</strong> {item.assignUser}
          </p>
          <p className="dashboard-planner-brief__field">
            <strong>Campaign Start:</strong> {item.campaignStartDate}
          </p>
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
          {isCardVisible('operations', 'operations.total') ? (
            <DashboardMetricCard
              title="Total Operations"
              value={data?.totals.operations ?? 0}
              icon={<ClipboardList />}
              embedded={embedded}
              loading={loading}
              className="dashboard-metric-card--tone-blue"
            />
          ) : null}
          {isCardVisible('operations', 'operations.pending') ? (
            <DashboardMetricCard
              title="Pending"
              value={data?.totals.pendingOperations ?? 0}
              icon={<Clock3 />}
              embedded={embedded}
              loading={loading}
              className="dashboard-metric-card--tone-amber"
            />
          ) : null}
          {isCardVisible('operations', 'operations.live') ? (
            <DashboardMetricCard
              title="Live"
              value={data?.totals.liveOperations ?? 0}
              icon={<Radio />}
              embedded={embedded}
              loading={loading}
              className="dashboard-metric-card--tone-teal"
            />
          ) : null}
          {isCardVisible('operations', 'operations.assigned') ? (
            <DashboardMetricCard
              title="Assigned"
              value={data?.totals.assignedOperations ?? 0}
              icon={<UserCheck />}
              embedded={embedded}
              loading={loading}
            />
          ) : null}
        </div>
      )}

      <DashboardChartsSection variant="operations" filters={filters} isCardVisible={isCardVisible} />

      {isCardVisible('operations', 'operations.recent') ? (
        <div className="dashboard-section-block">
          <div className="flex items-center justify-between mb-3">
            <h3 className="dashboard-section-block__title mb-0">Recent Operations</h3>
            <button type="button" className="a-tag-button" onClick={() => navigate(ROUTES.BACKUP_PLAN)}>
              View All
            </button>
          </div>
          <div className="dashboard-planner-briefs">
            {loading ? (
              <div className="dashboard-empty-state">Loading operations...</div>
            ) : error ? (
              <div className="dashboard-error-state">{error}</div>
            ) : recent.length === 0 ? (
              <div className="dashboard-empty-state">No operations in the selected date range.</div>
            ) : (
              recent.map(renderOperationCard)
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OperationsDashboard;

/**
 * @file OperationsDashboard.tsx
 * @description Operations dashboard for campaign operations, status, and assignments.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Eye, Radio, UserCheck, Clock3 } from 'lucide-react';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import DashboardMetricCard from '../../components/dashboard/DashboardMetricCard';
import Badge from '../../components/ui/Badge';
import Table, { type Column } from '../../components/ui/Table';
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

type OperationsDashboardProps = {
  embedded?: boolean;
  filters?: DashboardFilterState;
  isCardVisible?: (view: DashboardView, cardId: string) => boolean;
};

const dash = (value: unknown) => (value == null || value === '' ? '-' : String(value));

const OPERATIONS_COLUMNS: Column<OperationsDashboardItem>[] = [
  {
    key: 'id',
    header: 'ID',
    className: 'whitespace-nowrap',
    render: (row) => dash(row.id),
  },
  {
    key: 'briefName',
    header: 'Brief Name',
    className: 'whitespace-nowrap overflow-hidden truncate',
    render: (row) => dash(row.briefName),
  },
  {
    key: 'productName',
    header: 'Product Name',
    className: 'whitespace-nowrap overflow-hidden truncate',
    render: (row) => dash(row.productName),
  },
  {
    key: 'campaignStartDate',
    header: 'Campaign Start Date',
    className: 'whitespace-nowrap',
    render: (row) => dash(row.campaignStartDate),
  },
  {
    key: 'assignUser',
    header: 'Assign User',
    className: 'whitespace-nowrap overflow-hidden truncate',
    render: (row) => dash(row.assignUser),
  },
  {
    key: 'status',
    header: 'Campaign Status',
    minWidth: 140,
    className: 'min-w-[140px] align-middle',
    allowOverflow: true,
    render: (row) =>
      row.status && row.status !== '-' ? <Badge status={row.status}>{row.status}</Badge> : '-',
  },
];

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

  const tableColumns = useMemo<Column<OperationsDashboardItem>[]>(
    () => [
      ...OPERATIONS_COLUMNS,
      {
        key: 'view',
        header: 'View',
        className: 'text-center',
        allowOverflow: true,
        disableTooltip: true,
        render: () => (
          <button
            type="button"
            onClick={() => navigate(ROUTES.BACKUP_PLAN)}
            className="inline-flex items-center justify-center w-8 h-8 !p-0 border-0 !bg-transparent rounded-full hover:!bg-orange-50 transition-colors"
            title="View Operation"
            aria-label="View operation"
          >
            <Eye className="w-5 h-5 shrink-0 !text-orange-700" strokeWidth={2} />
          </button>
        ),
      },
    ],
    [navigate],
  );

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
              className="dashboard-metric-card--tone-violet"
            />
          ) : null}
        </div>
      )}

      <DashboardChartsSection variant="operations" filters={filters} isCardVisible={isCardVisible} />

      {isCardVisible('operations', 'operations.recent') ? (
        <div className={`dashboard-table-panel ${embedded ? 'is-embedded' : ''}`}>
          <div className="dashboard-table-panel__header dashboard-table-panel__header--plain">
            <h3 className="dashboard-section-block__title mb-0">Recent Operations</h3>
            <button type="button" className="a-tag-button shrink-0" onClick={() => navigate(ROUTES.BACKUP_PLAN)}>
              View All
            </button>
          </div>
          {error ? (
            <div className="dashboard-error-state px-4 py-6">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                data={recent}
                columns={tableColumns}
                compact
                desktopOnMobile
                loading={loading}
                emptyMessage="No operations in the selected date range."
                keyExtractor={(item, index) => String(item.id ?? index)}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default OperationsDashboard;

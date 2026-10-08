/**
 * @file FinanceDashboard.tsx
 * @description Finance dashboard for cost sheets, approvals, and purchase orders.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Eye, FileSpreadsheet, FileText, Hourglass, Receipt, Wallet } from 'lucide-react';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import DashboardMetricCard from '../../components/dashboard/DashboardMetricCard';
import Badge from '../../components/ui/Badge';
import Table, { type Column } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getFinanceChartMetrics, getFinanceSummary } from '../../services/DashboardCharts';
import type { FinanceDashboardItem } from '../../services/DashboardCharts';
import { ROUTES } from '../../constants';
import {
  createDefaultDashboardFilters,
  serializeDashboardFilters,
  type DashboardFilterState,
} from '../../utils/dashboardFilters';
import { formatDashboardCurrency } from '../../utils/dashboardFormat';
import type { DashboardView } from '../../utils/dashboardCardVisibility';

type FinanceDashboardProps = {
  embedded?: boolean;
  filters?: DashboardFilterState;
  isCardVisible?: (view: DashboardView, cardId: string) => boolean;
};

const dash = (value: unknown) => (value == null || value === '' ? '-' : String(value));

const FINANCE_COLUMNS: Column<FinanceDashboardItem>[] = [
  {
    key: 'id',
    header: 'Cost Sheet ID',
    className: 'whitespace-nowrap',
    render: (row) => dash(row.id),
  },
  {
    key: 'briefId',
    header: 'Brief ID',
    className: 'whitespace-nowrap',
    render: (row) => dash(row.briefId),
  },
  {
    key: 'briefName',
    header: 'Brief Name',
    className: 'whitespace-nowrap overflow-hidden truncate',
    render: (row) => dash(row.briefName),
  },
  {
    key: 'plannerName',
    header: 'Planner Name',
    className: 'whitespace-nowrap overflow-hidden truncate',
    render: (row) => dash(row.plannerName),
  },
  {
    key: 'assignUser',
    header: 'Finance User',
    className: 'whitespace-nowrap overflow-hidden truncate',
    render: (row) => dash(row.assignUser),
  },
  {
    key: 'financeStatus',
    header: 'Finance Status',
    minWidth: 140,
    className: 'min-w-[140px] align-middle',
    allowOverflow: true,
    render: (row) =>
      row.financeStatus ? (
        <Badge status={row.financeStatus}>{row.financeStatus}</Badge>
      ) : (
        '-'
      ),
  },
  {
    key: 'purchaseOrderAmount',
    header: 'PO Amount',
    className: 'whitespace-nowrap',
    render: (row) => formatDashboardCurrency(row.purchaseOrderAmount),
  },
];

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
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useApiQuery(getFinanceSummary);

  const recent = data?.recent ?? [];

  const tableColumns = useMemo<Column<FinanceDashboardItem>[]>(
    () => [
      ...FINANCE_COLUMNS,
      {
        key: 'view',
        header: 'View',
        className: 'text-center',
        allowOverflow: true,
        disableTooltip: true,
        render: () => (
          <button
            type="button"
            onClick={() => navigate(ROUTES.COST_SHEETS)}
            className="inline-flex items-center justify-center w-8 h-8 !p-0 border-0 !bg-transparent rounded-full hover:!bg-orange-50 transition-colors"
            title="View Cost Sheet"
            aria-label="View cost sheet"
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
      {error ? <div className="dashboard-error-state">{error}</div> : null}
      {summaryError ? <div className="dashboard-error-state">{summaryError}</div> : null}
      <div className="dashboard-stat-grid dashboard-stat-grid--3">
        {!error && isCardVisible('finance', 'finance.cost-sheets') ? (
          <DashboardMetricCard
            title="Cost Sheets"
            value={data?.totals.costSheets ?? 0}
            icon={<FileSpreadsheet />}
            embedded={embedded}
            loading={loading}
            className="dashboard-metric-card--tone-blue"
          />
        ) : null}
        {!error && isCardVisible('finance', 'finance.pending') ? (
          <DashboardMetricCard
            title="Pending Review"
            value={data?.totals.pending ?? 0}
            icon={<Hourglass />}
            embedded={embedded}
            loading={loading}
            className="dashboard-metric-card--tone-amber"
          />
        ) : null}
        {!error && isCardVisible('finance', 'finance.approved') ? (
          <DashboardMetricCard
            title="Approved"
            value={data?.totals.approved ?? 0}
            icon={<BadgeCheck />}
            embedded={embedded}
            loading={loading}
            className="dashboard-metric-card--tone-teal"
          />
        ) : null}
        {!error && isCardVisible('finance', 'finance.purchase-orders') ? (
          <DashboardMetricCard
            title="Purchase Order Amount"
            value={formatDashboardCurrency(data?.totals.purchaseOrderAmount ?? 0)}
            icon={<Wallet />}
            embedded={embedded}
            loading={loading}
          />
        ) : null}
        {isCardVisible('finance', 'finance.voucher-total') ? (
          <DashboardMetricCard
            title="Voucher Total Amount"
            value={summaryError ? '--' : formatDashboardCurrency(summary?.voucherTotalAmount ?? 0)}
            icon={<Receipt />}
            embedded={embedded}
            loading={summaryLoading}
            className="dashboard-metric-card--tone-violet"
          />
        ) : null}
        {isCardVisible('finance', 'finance.proforma-invoice-total') ? (
          <DashboardMetricCard
            title="Proforma Invoice Total Amount"
            value={summaryError ? '--' : formatDashboardCurrency(summary?.proformaInvoiceTotalAmount ?? 0)}
            icon={<FileText />}
            embedded={embedded}
            loading={summaryLoading}
            className="dashboard-metric-card--tone-rose"
          />
        ) : null}
      </div>

      <DashboardChartsSection variant="finance" filters={filters} isCardVisible={isCardVisible} />

      {isCardVisible('finance', 'finance.recent') ? (
        <div className={`dashboard-table-panel ${embedded ? 'is-embedded' : ''}`}>
          <div className="dashboard-table-panel__header dashboard-table-panel__header--plain">
            <h3 className="dashboard-section-block__title mb-0">Recent Cost Sheets</h3>
            <button type="button" className="a-tag-button shrink-0" onClick={() => navigate(ROUTES.COST_SHEETS)}>
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
                emptyMessage="No cost sheets in the selected date range."
                keyExtractor={(item, index) => String(item.id ?? index)}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default FinanceDashboard;

/**
 * @file FinanceDashboard.tsx
 * @description Finance dashboard for cost sheets, approvals, and purchase orders.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Eye, FileSpreadsheet, FileText, Hourglass, Receipt } from 'lucide-react';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import PlannerKpiCard from '../../components/dashboard/PlannerKpiCard';
import PendingAssignmentsCard from '../../components/dashboard/PendingAssignmentsCard';
import Badge from '../../components/ui/Badge';
import Table, { type Column } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getFinanceChartMetrics, getFinanceSummary } from '../../services/DashboardCharts';
import type { FinanceDashboardItem } from '../../services/DashboardCharts';
import { getPendingAssignmentCounts } from '../../services/Dashboard';
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

  const { data: pendingAssignmentCounts, loading: pendingAssignmentLoading } = useApiQuery(
    () => getPendingAssignmentCounts(filters),
    [filterKey],
  );

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

  const showNotifications = isCardVisible('finance', 'finance.notifications');

  const costSheetsTotal = data?.totals.costSheets ?? 0;
  const pendingReview = data?.totals.pending ?? 0;
  const approvedTotal = data?.totals.approved ?? 0;
  const voucherTotal = summary?.voucherTotalAmount ?? 0;
  const proformaTotal = summary?.proformaInvoiceTotalAmount ?? 0;

  const pendingPercent = costSheetsTotal > 0 ? Math.round((pendingReview / costSheetsTotal) * 100) : 0;
  const approvedPercent = costSheetsTotal > 0 ? Math.round((approvedTotal / costSheetsTotal) * 100) : 100;

  const kpiCards = (
    <>
      {!error && isCardVisible('finance', 'finance.cost-sheets') ? (
        <PlannerKpiCard
          title="Cost Sheets"
          subtitle="Total Sheets"
          value={costSheetsTotal}
          icon={<FileSpreadsheet />}
          tone="blue"
          badge={<span>Total</span>}
          pill={<span>Cost Sheets</span>}
          progressPercent={100}
          footerLeft="Cost sheets portfolio"
          footerRight={`${costSheetsTotal} records`}
          embedded={embedded}
          loading={loading}
        />
      ) : null}

      {!error && isCardVisible('finance', 'finance.pending') ? (
        <PlannerKpiCard
          title="Pending Review"
          subtitle="Under Review"
          value={pendingReview}
          icon={<Hourglass />}
          tone={pendingReview > 0 ? 'orange' : 'emerald'}
          badge={pendingReview > 0 ? <span>Pending</span> : <span>Clear</span>}
          pill={<span>{costSheetsTotal > 0 ? `${pendingPercent}% Pending` : `${pendingReview} Pending`}</span>}
          progressPercent={pendingPercent}
          footerLeft={pendingReview === 0 ? 'All reviews up to date' : `${pendingReview} awaiting review`}
          footerRight={pendingReview === 0 ? '0 Pending' : 'Action Required'}
          embedded={embedded}
          loading={loading}
        />
      ) : null}

      {!error && isCardVisible('finance', 'finance.approved') ? (
        <PlannerKpiCard
          title="Approved"
          subtitle="Finance Approved"
          value={approvedTotal}
          icon={<BadgeCheck />}
          tone="emerald"
          badge={<span>Approved</span>}
          pill={<span>{costSheetsTotal > 0 ? `${approvedPercent}% Approved` : `${approvedTotal} Approved`}</span>}
          progressPercent={approvedPercent}
          footerLeft={`${approvedTotal} cost sheets approved`}
          footerRight="Approved"
          embedded={embedded}
          loading={loading}
        />
      ) : null}


      {isCardVisible('finance', 'finance.voucher-total') ? (
        <PlannerKpiCard
          title="Voucher Total Amount"
          subtitle="Disbursed Vouchers"
          value={summaryError ? '--' : formatDashboardCurrency(voucherTotal)}
          icon={<Receipt />}
          tone="purple"
          badge={<span>Vouchers</span>}
          pill={<span>Disbursed</span>}
          progressPercent={100}
          footerLeft="Processed payment vouchers"
          footerRight="Disbursements"
          embedded={embedded}
          loading={summaryLoading}
        />
      ) : null}

      {isCardVisible('finance', 'finance.proforma-invoice-total') ? (
        <PlannerKpiCard
          title="Proforma Invoice Total Amount"
          subtitle="Generated Invoices"
          value={summaryError ? '--' : formatDashboardCurrency(proformaTotal)}
          icon={<FileText />}
          tone="rose"
          badge={<span>Invoices</span>}
          pill={<span>Billing</span>}
          progressPercent={100}
          footerLeft="Proforma billing generated"
          footerRight="Receivables"
          embedded={embedded}
          loading={summaryLoading}
        />
      ) : null}
    </>
  );

  return (
    <div className="dashboard-content">
      {error ? <div className="dashboard-error-state">{error}</div> : null}
      {summaryError ? <div className="dashboard-error-state">{summaryError}</div> : null}

      {showNotifications ? (
        <div className="dashboard-finance-performance">
          <PendingAssignmentsCard
            counts={pendingAssignmentCounts}
            loading={pendingAssignmentLoading}
            embedded={embedded}
          />
          <div className="dashboard-finance-kpis">{kpiCards}</div>
        </div>
      ) : (
        <div className="dashboard-stat-grid dashboard-stat-grid--3">{kpiCards}</div>
      )}

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

import React, { useState, useMemo, useCallback } from 'react';

import { useApiQuery } from '../../hooks/useApiQuery';
import { listOrganisationZones } from '../../api/users';

import {

  getDashboardChartMetrics,


  getFinanceChartMetrics,

  getOperationsChartMetrics,

  getPlannerChartMetrics,

  getSalesChartMetrics,

  type DashboardChartMetrics,

  type FinanceChartMetrics,

  type OperationsChartMetrics,

  type PlannerChartMetrics,

  type SalesChartMetrics,

} from '../../services/DashboardCharts';

import type { DashboardFilterState } from '../../utils/dashboardFilters';
import { serializeDashboardFilters } from '../../utils/dashboardFilters';

import { useDashboardPermissions } from '../../utils/dashboardPermissions';
import type { DashboardChartKey } from '../../utils/dashboardPermissions';
import type { DashboardView } from '../../utils/dashboardCardVisibility';
import PlannerOrganisationTable from './PlannerOrganisationTable';
import ZoneLeadPerformanceCards from './ZoneLeadPerformanceCards';

import {
  ChartsSectionHeader,
  MetricChartCard,
  PipelineChartCard,
  StatusPieChartCard,
} from './chartShared';
import { formatCount, formatCurrency, truncateLabel } from '../../utils/dashboardFormat';



type ChartVariant = 'overview' | 'sales' | 'planner' | 'operations' | 'finance';



type DashboardChartsSectionProps = {

  variant: ChartVariant;

  filters: DashboardFilterState;

  isCardVisible: (view: DashboardView, cardId: string) => boolean;

};



type MetricConfig = {
  key: string;
  cardId: string;
  chartKey: DashboardChartKey;
  title: string;
  color: string;
  valueFormatter?: (value: number) => string;
};



const OVERVIEW_METRICS: MetricConfig[] = [

  { key: 'totalLeads', cardId: 'overview.total-leads-analytics', chartKey: 'totalLeads', title: 'Total Leads', color: '#2563eb' },

  { key: 'preLeads', cardId: 'overview.pre-leads-analytics', chartKey: 'preLeads', title: 'Pre Leads', color: '#7c3aed' },

  { key: 'briefs', cardId: 'overview.briefs-analytics', chartKey: 'briefs', title: 'Briefs', color: '#ea580c' },

  { key: 'briefBudget', cardId: 'overview.brief-budget-analytics', chartKey: 'briefBudget', title: 'Brief Budget', color: '#059669', valueFormatter: formatCurrency },

];



const SALES_METRICS: MetricConfig[] = [

  { key: 'totalLeads', cardId: 'sales.total-leads-analytics', chartKey: 'totalLeads', title: 'Total Leads', color: '#2563eb' },

  { key: 'briefs', cardId: 'sales.briefs-analytics', chartKey: 'briefs', title: 'Briefs', color: '#ea580c' },

  { key: 'briefBudget', cardId: 'sales.brief-budget', chartKey: 'briefBudget', title: 'Brief Budget', color: '#059669', valueFormatter: formatCurrency },

];



const formatDays = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} days`;

const PLANNER_METRICS: MetricConfig[] = [
  { key: 'briefs', cardId: 'planner.briefs-analytics', chartKey: 'briefs', title: 'Briefs', color: '#ea580c' },
  { key: 'assignedPlans', cardId: 'planner.assigned-plans-analytics', chartKey: 'assignedPlans', title: 'Plans Assigned', color: '#2563eb' },
  {
    key: 'avgAssignmentDays',
    cardId: 'planner.avg-submission-analytics',
    chartKey: 'avgAssignmentDays',
    title: 'Avg Plan Submission Time',
    color: '#7c3aed',
    valueFormatter: formatDays,
  },
  {
    key: 'briefBudget',
    cardId: 'planner.brief-budget-analytics',
    chartKey: 'briefBudget',
    title: 'Brief Budget',
    color: '#059669',
    valueFormatter: formatCurrency,
  },
];

const OPERATIONS_METRICS: MetricConfig[] = [
  { key: 'operations', cardId: 'operations.operations-analytics', chartKey: 'operations', title: 'Operations', color: '#2563eb' },
  { key: 'pendingOperations', cardId: 'operations.pending-analytics', chartKey: 'pendingOperations', title: 'Pending', color: '#d97706' },
  { key: 'liveOperations', cardId: 'operations.live-analytics', chartKey: 'liveOperations', title: 'Live', color: '#059669' },
  { key: 'assignedOperations', cardId: 'operations.assigned-analytics', chartKey: 'assignedOperations', title: 'Assigned', color: '#7c3aed' },
];

const FINANCE_METRICS: MetricConfig[] = [
  { key: 'costSheets', cardId: 'finance.cost-sheets-analytics', chartKey: 'costSheets', title: 'Cost Sheets', color: '#2563eb' },
  { key: 'approved', cardId: 'finance.approved-analytics', chartKey: 'approvedFinance', title: 'Approved', color: '#059669' },
  { key: 'denied', cardId: 'finance.denied-analytics', chartKey: 'deniedFinance', title: 'Denied', color: '#dc2626' },
  {
    key: 'purchaseOrderAmount',
    cardId: 'finance.purchase-order-analytics',
    chartKey: 'purchaseOrderAmount',
    title: 'Purchase Order Amount',
    color: '#0891b2',
    valueFormatter: formatCurrency,
  },
];



const PIPELINE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'];

const STATUS_COLORS = ['#2563eb', '#16a34a', '#dc2626'];



const SECTION_COPY: Record<

  ChartVariant,

  { title: string; subtitle?: string; gridClass: string }

> = {

  overview: {

    title: 'Organisation Metrics',

    subtitle: 'Total leads, pre leads, briefs, and brief budget by organisation.',

    gridClass: 'dashboard-charts__grid',

  },

  sales: {

    title: 'Sales Analytics',

    gridClass: 'dashboard-charts__grid dashboard-charts__grid--2',

  },

  planner: {

    title: 'Planner Analytics',

    gridClass: 'dashboard-charts__grid dashboard-charts__grid--2',

  },

  operations: {
    title: 'Operations Analytics',
    gridClass: 'dashboard-charts__grid dashboard-charts__grid--2',
  },
  finance: {
    title: 'Finance Analytics',
    gridClass: 'dashboard-charts__grid dashboard-charts__grid--2',
  },

};




function buildOrgChartData(

  rows: Array<Record<string, string | number>>,

  metrics: MetricConfig[],

) {

  return metrics.reduce<Record<string, { name: string; value: number }[]>>((acc, chart) => {

    acc[chart.key] = rows.map((row) => ({

      name: truncateLabel(String(row.organisationName)),

      value: Number(row[chart.key] ?? 0),

    }));

    return acc;

  }, {});

}



function renderTotals(

  variant: ChartVariant,

  metrics: unknown,

  loading: boolean,

  visibleMetrics: MetricConfig[],

) {

  if (loading || !metrics) return null;



  if (variant === 'overview') {

    const data = metrics as DashboardChartMetrics;

    return (

      <>

        {visibleMetrics.some((item) => item.chartKey === 'totalLeads') ? (

          <span>Leads: {formatCount(data.totals.totalLeads)}</span>

        ) : null}

        {visibleMetrics.some((item) => item.chartKey === 'preLeads') ? (

          <span>Pre Leads: {formatCount(data.totals.preLeads)}</span>

        ) : null}

        {visibleMetrics.some((item) => item.chartKey === 'briefs') ? (

          <span>Briefs: {formatCount(data.totals.briefs)}</span>

        ) : null}

        {visibleMetrics.some((item) => item.chartKey === 'briefBudget') ? (

          <span>Budget: {formatCurrency(data.totals.briefBudget)}</span>

        ) : null}

      </>

    );

  }



  if (variant === 'sales') {

    const data = metrics as SalesChartMetrics;

    return (

      <>

        {visibleMetrics.some((item) => item.chartKey === 'totalLeads') ? (

          <span>Leads: {formatCount(data.totals.totalLeads)}</span>

        ) : null}

        {visibleMetrics.some((item) => item.chartKey === 'briefs') ? (

          <span>Briefs: {formatCount(data.totals.briefs)}</span>

        ) : null}

        {visibleMetrics.some((item) => item.chartKey === 'briefBudget') ? (

          <span>Budget: {formatCurrency(data.totals.briefBudget)}</span>

        ) : null}

      </>

    );

  }



  if (variant === 'operations') {
    const data = metrics as OperationsChartMetrics;
    return (
      <>
        {visibleMetrics.some((item) => item.chartKey === 'operations') ? (
          <span>Operations: {formatCount(data.totals.operations)}</span>
        ) : null}
        {visibleMetrics.some((item) => item.chartKey === 'pendingOperations') ? (
          <span>Pending: {formatCount(data.totals.pendingOperations)}</span>
        ) : null}
        {visibleMetrics.some((item) => item.chartKey === 'liveOperations') ? (
          <span>Live: {formatCount(data.totals.liveOperations)}</span>
        ) : null}
        {visibleMetrics.some((item) => item.chartKey === 'assignedOperations') ? (
          <span>Assigned: {formatCount(data.totals.assignedOperations)}</span>
        ) : null}
      </>
    );
  }

  if (variant === 'finance') {
    const data = metrics as FinanceChartMetrics;
    return (
      <>
        {visibleMetrics.some((item) => item.chartKey === 'costSheets') ? (
          <span>Cost Sheets: {formatCount(data.totals.costSheets)}</span>
        ) : null}
        {visibleMetrics.some((item) => item.chartKey === 'approvedFinance') ? (
          <span>Approved: {formatCount(data.totals.approved)}</span>
        ) : null}
        {visibleMetrics.some((item) => item.chartKey === 'deniedFinance') ? (
          <span>Denied: {formatCount(data.totals.denied)}</span>
        ) : null}
        {visibleMetrics.some((item) => item.chartKey === 'purchaseOrderAmount') ? (
          <span>PO Amount: {formatCurrency(data.totals.purchaseOrderAmount)}</span>
        ) : null}
      </>
    );
  }

  const data = metrics as PlannerChartMetrics;

  return (
    <>
      {visibleMetrics.some((item) => item.chartKey === 'briefs') ? (
        <span>Briefs: {formatCount(data.totals.briefs)}</span>
      ) : null}
      {visibleMetrics.some((item) => item.chartKey === 'assignedPlans') ? (
        <span>Plans: {formatCount(data.totals.assignedPlans)}</span>
      ) : null}
      {visibleMetrics.some((item) => item.chartKey === 'avgAssignmentDays') ? (
        <span>Avg Submit: {formatDays(data.totals.avgAssignmentDays)}</span>
      ) : null}
      {visibleMetrics.some((item) => item.chartKey === 'briefBudget') ? (
        <span>Budget: {formatCurrency(data.totals.briefBudget)}</span>
      ) : null}
    </>
  );
}



const DashboardChartsSection: React.FC<DashboardChartsSectionProps> = ({ variant, filters, isCardVisible }) => {

  const dashboardPermissions = useDashboardPermissions();
  const allMetricConfigs =
    variant === 'overview'
      ? OVERVIEW_METRICS
      : variant === 'sales'
        ? SALES_METRICS
        : variant === 'operations'
          ? OPERATIONS_METRICS
          : variant === 'finance'
            ? FINANCE_METRICS
            : PLANNER_METRICS;



  const permittedMetrics = useMemo(

    () => allMetricConfigs.filter((chart) => dashboardPermissions.canViewChart(chart.chartKey)),

    [allMetricConfigs, dashboardPermissions],

  );

  const visibleMetrics = useMemo(
    () => permittedMetrics.filter((chart) => isCardVisible(variant, chart.cardId)),
    [isCardVisible, permittedMetrics, variant],
  );

  const [salesExpandedCards, setSalesExpandedCards] = useState<Record<string, boolean>>({
    totalLeads: false,
    briefs: false,
    briefBudget: false,
    pipeline: false,
  });

  const toggleSalesCard = useCallback((cardKey: string) => {
    setSalesExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  }, []);

  const [plannerExpandedCards, setPlannerExpandedCards] = useState<Record<string, boolean>>({
    briefs: false,
    assignedPlans: false,
    avgAssignmentDays: false,
    briefBudget: false,
    briefStatus: false,
  });

  const togglePlannerCard = useCallback((cardKey: string) => {
    setPlannerExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  }, []);

  const [operationsExpandedCards, setOperationsExpandedCards] = useState<Record<string, boolean>>({
    operations: false,
    pendingOperations: false,
    liveOperations: false,
    assignedOperations: false,
    operationStatus: false,
  });

  const toggleOperationsCard = useCallback((cardKey: string) => {
    setOperationsExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  }, []);

  const [financeExpandedCards, setFinanceExpandedCards] = useState<Record<string, boolean>>({
    costSheets: false,
    approved: false,
    denied: false,
    purchaseOrderAmount: false,
    financeStatus: false,
  });

  const toggleFinanceCard = useCallback((cardKey: string) => {
    setFinanceExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  }, []);



  const canFetch =
    variant === 'overview'
      ? dashboardPermissions.canViewOverviewTab()
      : variant === 'sales'
        ? dashboardPermissions.canViewSalesTab()
        : variant === 'operations'
          ? dashboardPermissions.canViewOperationsTab()
          : variant === 'finance'
            ? dashboardPermissions.canViewFinanceTab()
            : dashboardPermissions.canViewPlannerTab();



  const showPipeline = variant === 'sales'
    && dashboardPermissions.canViewPipelineChart()
    && isCardVisible('sales', 'sales.sales-pipeline');

  const showBriefStatus = variant === 'planner'
    && dashboardPermissions.canViewBriefStatusChart()
    && isCardVisible('planner', 'planner.brief-status');

  const showOperationStatus = variant === 'operations'
    && dashboardPermissions.canViewOperationsTab()
    && isCardVisible('operations', 'operations.status');

  const showFinanceStatus = variant === 'finance'
    && dashboardPermissions.canViewFinanceTab()
    && isCardVisible('finance', 'finance.status');

  const showStatusMix = showBriefStatus || showOperationStatus || showFinanceStatus;



  const filterKey = serializeDashboardFilters(filters);
  const fetchEnabled = canFetch
    && (permittedMetrics.length > 0 || showPipeline || showStatusMix || dashboardPermissions.canViewPipelineChart() || dashboardPermissions.canViewBriefStatusChart());

  const overviewQuery = useApiQuery(
    () => getDashboardChartMetrics(filters),
    ['overview', filterKey],
    { enabled: variant === 'overview' && fetchEnabled },
  );

  const salesQuery = useApiQuery(
    () => getSalesChartMetrics(filters),
    ['sales', filterKey],
    { enabled: variant === 'sales' && fetchEnabled },
  );

  const organisationZonesQuery = useApiQuery(
    () => listOrganisationZones(filters.organisationIds),
    ['organisation-zones', filterKey],
    { enabled: variant === 'sales' && showPipeline && filters.organisationIds.length > 0 },
  );

  const plannerQuery = useApiQuery(
    () => getPlannerChartMetrics(filters),
    ['planner', filterKey],
    { enabled: variant === 'planner' && fetchEnabled },
  );

  const operationsQuery = useApiQuery(
    () => getOperationsChartMetrics(filters),
    ['operations', filterKey],
    { enabled: variant === 'operations' && fetchEnabled },
  );

  const financeQuery = useApiQuery(
    () => getFinanceChartMetrics(filters),
    ['finance', filterKey],
    { enabled: variant === 'finance' && fetchEnabled },
  );

  const activeQuery =
    variant === 'overview'
      ? overviewQuery
      : variant === 'sales'
        ? salesQuery
        : variant === 'operations'
          ? operationsQuery
          : variant === 'finance'
            ? financeQuery
            : plannerQuery;

  const { data, loading, error } = activeQuery;
  const salesData = salesQuery.data;
  const zonePerformanceData = useMemo(
    () =>
      (organisationZonesQuery.data ?? []).map((zone) => ({
        zoneId: String(zone.zone_id),
        zoneName: zone.zone_name,
        assignedLeads: zone.assigned_leads_count,
      })),
    [organisationZonesQuery.data],
  );
  const plannerData = plannerQuery.data;
  const operationsData = operationsQuery.data;
  const financeData = financeQuery.data;

  const orgChartData = useMemo(() => {
    const rows = (data?.rows ?? []) as Array<Record<string, string | number>>;
    return buildOrgChartData(rows, visibleMetrics);
  }, [data, visibleMetrics]);

  const pipelineData = useMemo(() => {
    if (!showPipeline || !salesData) return [];
    const pipeline = salesData.pipeline;
    return [
      { name: 'New Leads', value: pipeline.newLeads },
      { name: 'Follow Up', value: pipeline.followUp },
      { name: 'Meetings', value: pipeline.meetingScheduled },
      { name: 'Briefs', value: pipeline.briefs },
    ];
  }, [showPipeline, salesData]);

  const statusData = useMemo(() => {
    if (showBriefStatus && plannerData) {
      const status = plannerData.briefStatus;
      return [
        { name: 'Active', value: status.activeBriefs },
        { name: 'Closed', value: status.closedBriefs },
        { name: 'Overdue', value: status.overdueBriefs },
      ];
    }
    if (showOperationStatus && operationsData) {
      return [
        { name: 'Pending', value: operationsData.operationStatus.pending },
        { name: 'Live', value: operationsData.operationStatus.live },
      ];
    }
    if (showFinanceStatus && financeData) {
      return [
        { name: 'Approved', value: financeData.financeStatus.approved },
        { name: 'Denied', value: financeData.financeStatus.denied },
        { name: 'Pending', value: financeData.financeStatus.pending },
      ];
    }
    return [];
  }, [financeData, operationsData, plannerData, showBriefStatus, showFinanceStatus, showOperationStatus]);

  const statusColors = showFinanceStatus
    ? ['#059669', '#dc2626', '#d97706']
    : showOperationStatus
      ? ['#d97706', '#059669']
      : STATUS_COLORS;

  const statusTitle = showFinanceStatus
    ? 'Finance Status Mix'
    : showOperationStatus
      ? 'Operation Status Mix'
      : 'Brief Status Mix';



  if (!canFetch || (visibleMetrics.length === 0 && !showPipeline && !showStatusMix)) {

    return null;

  }



  const copy = SECTION_COPY[variant];



  return (

    <section className="dashboard-charts">

      <ChartsSectionHeader

        title={copy.title}

        subtitle={copy.subtitle}

        totals={renderTotals(variant, data, loading, visibleMetrics)}

      />



      {error ? <div className="dashboard-charts__error">{error}</div> : null}



      {variant === 'sales' ? (
        <>
          <div className="dashboard-charts__grid dashboard-charts__grid--2">
            {isCardVisible('sales', 'sales.total-leads-analytics') ? (
              <MetricChartCard
                key="totalLeads"
                title="Total Leads"
                color="#2563eb"
                data={orgChartData['totalLeads'] ?? []}
                loading={loading}
                collapsible
                isExpanded={!!salesExpandedCards['totalLeads']}
                onToggle={() => toggleSalesCard('totalLeads')}
              />
            ) : null}

            {isCardVisible('sales', 'sales.briefs-analytics') ? (
              <MetricChartCard
                key="briefs"
                title="Briefs"
                color="#ea580c"
                data={orgChartData['briefs'] ?? []}
                loading={loading}
                collapsible
                isExpanded={!!salesExpandedCards['briefs']}
                onToggle={() => toggleSalesCard('briefs')}
              />
            ) : null}

            {isCardVisible('sales', 'sales.brief-budget') ? (
              <MetricChartCard
                key="briefBudget"
                title="Brief Budget"
                color="#059669"
                data={orgChartData['briefBudget'] ?? []}
                loading={loading}
                valueFormatter={formatCurrency}
                collapsible
                isExpanded={!!salesExpandedCards['briefBudget']}
                onToggle={() => toggleSalesCard('briefBudget')}
              />
            ) : null}

            {showPipeline ? (
              <PipelineChartCard
                title="Sales Pipeline"
                data={pipelineData}
                loading={loading}
                colors={PIPELINE_COLORS}
                collapsible
                isExpanded={!!salesExpandedCards['pipeline']}
                onToggle={() => toggleSalesCard('pipeline')}
              />
            ) : null}
          </div>

          {showPipeline && filters.organisationIds.length > 0 ? (
            <div className="dashboard-charts__grid dashboard-charts__grid--1">
              <ZoneLeadPerformanceCards
                data={zonePerformanceData}
                loading={organisationZonesQuery.loading}
                organisationIds={filters.organisationIds}
              />
            </div>
          ) : null}
        </>
      ) : variant === 'planner' ? (
        <>
          <div className="dashboard-charts__grid dashboard-charts__grid--2">
            {isCardVisible('planner', 'planner.briefs-analytics') ? (
              <MetricChartCard
                key="briefs"
                title="Briefs"
                color="#ea580c"
                data={orgChartData['briefs'] ?? []}
                loading={loading}
                collapsible
                isExpanded={!!plannerExpandedCards['briefs']}
                onToggle={() => togglePlannerCard('briefs')}
              />
            ) : null}

            {isCardVisible('planner', 'planner.assigned-plans-analytics') ? (
              <MetricChartCard
                key="assignedPlans"
                title="Plans Assigned"
                color="#2563eb"
                data={orgChartData['assignedPlans'] ?? []}
                loading={loading}
                collapsible
                isExpanded={!!plannerExpandedCards['assignedPlans']}
                onToggle={() => togglePlannerCard('assignedPlans')}
              />
            ) : null}

            {isCardVisible('planner', 'planner.avg-submission-analytics') ? (
              <MetricChartCard
                key="avgAssignmentDays"
                title="Avg Plan Submission Time"
                color="#7c3aed"
                data={orgChartData['avgAssignmentDays'] ?? []}
                loading={loading}
                valueFormatter={formatDays}
                collapsible
                isExpanded={!!plannerExpandedCards['avgAssignmentDays']}
                onToggle={() => togglePlannerCard('avgAssignmentDays')}
              />
            ) : null}

            {isCardVisible('planner', 'planner.brief-budget-analytics') ? (
              <MetricChartCard
                key="briefBudget"
                title="Brief Budget"
                color="#059669"
                data={orgChartData['briefBudget'] ?? []}
                loading={loading}
                valueFormatter={formatCurrency}
                collapsible
                isExpanded={!!plannerExpandedCards['briefBudget']}
                onToggle={() => togglePlannerCard('briefBudget')}
              />
            ) : null}

            {showBriefStatus ? (
              <StatusPieChartCard
                title={statusTitle}
                data={statusData}
                loading={loading}
                colors={statusColors}
                collapsible
                isExpanded={!!plannerExpandedCards['briefStatus']}
                onToggle={() => togglePlannerCard('briefStatus')}
              />
            ) : null}
          </div>

          {plannerData ? (
            <PlannerOrganisationTable rows={plannerData.rows} loading={loading} />
          ) : null}
        </>
      ) : variant === 'operations' ? (
        <div className="dashboard-charts__grid dashboard-charts__grid--2">
          {isCardVisible('operations', 'operations.operations-analytics') && dashboardPermissions.canViewChart('operations') ? (
            <MetricChartCard
              key="operations"
              title="Operations"
              color="#2563eb"
              data={orgChartData['operations'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!operationsExpandedCards['operations']}
              onToggle={() => toggleOperationsCard('operations')}
            />
          ) : null}

          {isCardVisible('operations', 'operations.pending-analytics') && dashboardPermissions.canViewChart('pendingOperations') ? (
            <MetricChartCard
              key="pendingOperations"
              title="Pending"
              color="#d97706"
              data={orgChartData['pendingOperations'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!operationsExpandedCards['pendingOperations']}
              onToggle={() => toggleOperationsCard('pendingOperations')}
            />
          ) : null}

          {isCardVisible('operations', 'operations.live-analytics') && dashboardPermissions.canViewChart('liveOperations') ? (
            <MetricChartCard
              key="liveOperations"
              title="Live"
              color="#059669"
              data={orgChartData['liveOperations'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!operationsExpandedCards['liveOperations']}
              onToggle={() => toggleOperationsCard('liveOperations')}
            />
          ) : null}

          {isCardVisible('operations', 'operations.assigned-analytics') && dashboardPermissions.canViewChart('assignedOperations') ? (
            <MetricChartCard
              key="assignedOperations"
              title="Assigned"
              color="#7c3aed"
              data={orgChartData['assignedOperations'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!operationsExpandedCards['assignedOperations']}
              onToggle={() => toggleOperationsCard('assignedOperations')}
            />
          ) : null}

          {showOperationStatus ? (
            <StatusPieChartCard
              title={statusTitle}
              data={statusData}
              loading={loading}
              colors={statusColors}
              collapsible
              isExpanded={!!operationsExpandedCards['operationStatus']}
              onToggle={() => toggleOperationsCard('operationStatus')}
            />
          ) : null}
        </div>
      ) : variant === 'finance' ? (
        <div className="dashboard-charts__grid dashboard-charts__grid--2">
          {isCardVisible('finance', 'finance.cost-sheets-analytics') && dashboardPermissions.canViewChart('costSheets') ? (
            <MetricChartCard
              key="costSheets"
              title="Cost Sheets"
              color="#2563eb"
              data={orgChartData['costSheets'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!financeExpandedCards['costSheets']}
              onToggle={() => toggleFinanceCard('costSheets')}
            />
          ) : null}

          {isCardVisible('finance', 'finance.approved-analytics') && dashboardPermissions.canViewChart('approvedFinance') ? (
            <MetricChartCard
              key="approved"
              title="Approved"
              color="#059669"
              data={orgChartData['approved'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!financeExpandedCards['approved']}
              onToggle={() => toggleFinanceCard('approved')}
            />
          ) : null}

          {isCardVisible('finance', 'finance.denied-analytics') && dashboardPermissions.canViewChart('deniedFinance') ? (
            <MetricChartCard
              key="denied"
              title="Denied"
              color="#dc2626"
              data={orgChartData['denied'] ?? []}
              loading={loading}
              collapsible
              isExpanded={!!financeExpandedCards['denied']}
              onToggle={() => toggleFinanceCard('denied')}
            />
          ) : null}

          {isCardVisible('finance', 'finance.purchase-order-analytics') && dashboardPermissions.canViewChart('purchaseOrderAmount') ? (
            <MetricChartCard
              key="purchaseOrderAmount"
              title="Purchase Order Amount"
              color="#0891b2"
              data={orgChartData['purchaseOrderAmount'] ?? []}
              loading={loading}
              valueFormatter={formatCurrency}
              collapsible
              isExpanded={!!financeExpandedCards['purchaseOrderAmount']}
              onToggle={() => toggleFinanceCard('purchaseOrderAmount')}
            />
          ) : null}

          {showFinanceStatus ? (
            <StatusPieChartCard
              title={statusTitle}
              data={statusData}
              loading={loading}
              colors={statusColors}
              collapsible
              isExpanded={!!financeExpandedCards['financeStatus']}
              onToggle={() => toggleFinanceCard('financeStatus')}
            />
          ) : null}
        </div>
      ) : (
        <>
          {visibleMetrics.length > 0 || showStatusMix ? (
            <div className={copy.gridClass}>
              {visibleMetrics.map((chart) => (
                <MetricChartCard
                  key={chart.key}
                  title={chart.title}
                  color={chart.color}
                  data={orgChartData[chart.key] ?? []}
                  loading={loading}
                  valueFormatter={chart.valueFormatter}
                />
              ))}

              {showStatusMix ? (
                <StatusPieChartCard
                  title={statusTitle}
                  data={statusData}
                  loading={loading}
                  colors={statusColors}
                />
              ) : null}
            </div>
          ) : null}

          {showPipeline ? (
            <div className="dashboard-charts__grid dashboard-charts__grid--1">
              <PipelineChartCard
                title="Sales Pipeline"
                data={pipelineData}
                loading={loading}
                colors={PIPELINE_COLORS}
              />
              <ZoneLeadPerformanceCards
                data={zonePerformanceData}
                loading={organisationZonesQuery.loading}
                organisationIds={filters.organisationIds}
              />
            </div>
          ) : null}
        </>
      )}


    </section>

  );

};



export default DashboardChartsSection;



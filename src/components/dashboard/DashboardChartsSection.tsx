import React, { useMemo } from 'react';

import { useApiQuery } from '../../hooks/useApiQuery';
import { listOrganisationZones } from '../../api/users';

import {

  getDashboardChartMetrics,


  getPlannerChartMetrics,

  getSalesChartMetrics,

  type DashboardChartMetrics,

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



type ChartVariant = 'overview' | 'sales' | 'planner';



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



const PIPELINE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'];

const STATUS_COLORS = ['#2563eb', '#16a34a', '#dc2626'];



const SECTION_COPY: Record<

  ChartVariant,

  { title: string; subtitle: string; gridClass: string }

> = {

  overview: {

    title: 'Organisation Metrics',

    subtitle: 'Total leads, pre leads, briefs, and brief budget by organisation.',

    gridClass: 'dashboard-charts__grid',

  },

  sales: {

    title: 'Sales Analytics',

    subtitle: 'Lead and brief performance by organisation, plus sales pipeline.',

    gridClass: 'dashboard-charts__grid dashboard-charts__grid--3',

  },

  planner: {

    title: 'Planner Analytics',

    subtitle: 'Briefs, assigned plans, plan submission time (assign → submit), and budget by organisation.',

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

    variant === 'overview' ? OVERVIEW_METRICS : variant === 'sales' ? SALES_METRICS : PLANNER_METRICS;



  const permittedMetrics = useMemo(

    () => allMetricConfigs.filter((chart) => dashboardPermissions.canViewChart(chart.chartKey)),

    [allMetricConfigs, dashboardPermissions],

  );

  const visibleMetrics = useMemo(
    () => permittedMetrics.filter((chart) => isCardVisible(variant, chart.cardId)),
    [isCardVisible, permittedMetrics, variant],
  );



  const canFetch =

    variant === 'overview'

      ? dashboardPermissions.canViewOverviewTab()

      : variant === 'sales'

        ? dashboardPermissions.canViewSalesTab()

        : dashboardPermissions.canViewPlannerTab();



  const showPipeline = variant === 'sales'
    && dashboardPermissions.canViewPipelineChart()
    && isCardVisible('sales', 'sales.sales-pipeline');

  const showBriefStatus = variant === 'planner'
    && dashboardPermissions.canViewBriefStatusChart()
    && isCardVisible('planner', 'planner.brief-status');



  const filterKey = serializeDashboardFilters(filters);
  const fetchEnabled = canFetch
    && (permittedMetrics.length > 0 || dashboardPermissions.canViewPipelineChart() || dashboardPermissions.canViewBriefStatusChart());

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

  const activeQuery =
    variant === 'overview' ? overviewQuery : variant === 'sales' ? salesQuery : plannerQuery;

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
    if (!showBriefStatus || !plannerData) return [];
    const status = plannerData.briefStatus;
    return [
      { name: 'Active', value: status.activeBriefs },
      { name: 'Closed', value: status.closedBriefs },
      { name: 'Overdue', value: status.overdueBriefs },
    ];
  }, [showBriefStatus, plannerData]);



  if (!canFetch || (visibleMetrics.length === 0 && !showPipeline && !showBriefStatus)) {

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



      {visibleMetrics.length > 0 || showBriefStatus ? (

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



          {showBriefStatus ? (

            <StatusPieChartCard

              title="Brief Status Mix"

              data={statusData}

              loading={loading}

              colors={STATUS_COLORS}

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

      {variant === 'planner' && plannerData ? (
        <PlannerOrganisationTable rows={plannerData.rows} loading={loading} />
      ) : null}

    </section>

  );

};



export default DashboardChartsSection;



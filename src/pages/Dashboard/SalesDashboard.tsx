/**
 * @file SalesDashboard.tsx
 * @description Sales role dashboard with leads, briefs, and KPI widgets.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Users, FileText, Building2, Clock, ChevronRight } from 'lucide-react';
import Table, { type Column } from '../../components/ui/Table';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import BusinessForecastCard from '../../components/dashboard/BusinessForecastCard';
import BusinessWeightageCard from '../../components/dashboard/BusinessWeightageCard';
import DashboardTabNav, { type DashboardTabItem } from '../../components/dashboard/DashboardTabNav';
import PendingAssignmentsCard from '../../components/dashboard/PendingAssignmentsCard';
import PriorityMetricCard from '../../components/dashboard/PriorityMetricCard';
import { ROUTES } from '../../constants';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getPendingAssignmentCounts } from '../../services/Dashboard';
import {
  getLatestTwoBriefs,
  getRecentActivities,
  getLatestTwoLeads,
  getLatestFollowUpTwoLeads,
  getLatestMeetingScheduledTwoLeads,
  getRecentBriefs,
  getBusinessForecast,
  getPriorities,
  getLeadCountByPriority,
  getBriefCountByPriority,
} from '../../services/SalesDashboard';
import {
  createDefaultDashboardFilters,
  serializeDashboardFilters,
  type DashboardFilterState,
} from '../../utils/dashboardFilters';
import type { DashboardView } from '../../utils/dashboardCardVisibility';

type DashboardTab = 'new' | 'brief' | 'follow' | 'meeting';

const dash = (value: unknown) => (value == null || value === '' ? '-' : String(value));

const TypeBadge = ({ label }: { label: string }) => {
  const isBrief = label.toLowerCase().includes('brief');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
        isBrief
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50'
          : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50'
      }`}
    >
      {label}
    </span>
  );
};

const getPriorityBadgeMeta = (priorityName?: string) => {
  if (!priorityName) return null;
  const p = priorityName.toLowerCase().trim();
  if (/\b(high|urgent|critical|hot)\b/.test(p)) {
    return {
      className:
        'border-rose-200/90 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 border',
      dotColor: '#ef4444',
    };
  }
  if (/\b(medium|moderate)\b/.test(p)) {
    return {
      className:
        'border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 border',
      dotColor: '#f59e0b',
    };
  }
  return {
    className:
      'border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 border',
    dotColor: '#3b82f6',
  };
};

const getBrandName = (row: { brand?: { name?: string }; agency?: { name?: string } }) =>
  dash(row.brand?.name ?? row.agency?.name);

const getMobile = (row: { mobile_number?: { number?: string }[] }) => dash(row.mobile_number?.[0]?.number);

const getActivityStatusMeta = (status?: string) => {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  if (/\b(meeting|schedule|scheduled)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-emerald-200/90 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 border',
      dotColor: '#10b981',
    };
  }
  if (/\b(interested|hot|qualified)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-teal-200/90 bg-teal-50 text-teal-700 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300 border',
      dotColor: '#0d9488',
    };
  }
  if (/\b(follow up|follow-up|follow)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 border',
      dotColor: '#3b82f6',
    };
  }
  if (/\b(pending|hold|new)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 border',
      dotColor: '#f59e0b',
    };
  }
  if (/\b(busy|not interested|lost|rejected|cancel|cancelled)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-rose-200/90 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 border',
      dotColor: '#ef4444',
    };
  }
  return {
    label: status,
    className:
      'border-slate-200/90 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 border',
    dotColor: '#64748b',
  };
};

const getRecentBriefStatusMeta = (status?: string) => {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  if (/\b(approve|approved|complete|completed)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-emerald-200/90 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 border',
      dotColor: '#10b981',
    };
  }
  if (/\b(closed|close)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 border',
      dotColor: '#f59e0b',
    };
  }
  if (/\b(pending|submission|submitted|in progress)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 border',
      dotColor: '#3b82f6',
    };
  }
  if (/\b(reject|rejected|denied|cancel|cancelled)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-rose-200/90 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 border',
      dotColor: '#ef4444',
    };
  }
  return {
    label: status,
    className:
      'border-slate-200/90 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 border',
    dotColor: '#64748b',
  };
};

const getProgressRingColor = (percent: number) => {
  if (percent >= 100) return '#10b981';
  if (percent >= 60) return '#0284c7';
  if (percent > 0) return '#f97316';
  return '#cbd5e1';
};

const formatBudget = (budget: unknown) => {
  if (budget == null || budget === '') return '-';
  const num = Number(budget);
  if (Number.isNaN(num)) return `₹${budget}`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const LEAD_COLUMNS: Column<any>[] = [
  { key: 'type', header: 'Type', render: () => <TypeBadge label="Brand" /> },
  {
    key: 'brand',
    header: 'Brand Name',
    render: (l) => (
      <span className="font-semibold text-slate-800 dark:text-slate-100">
        {getBrandName(l)}
      </span>
    ),
  },
  {
    key: 'name',
    header: 'Contact Person',
    render: (l) => <span className="font-medium text-slate-700 dark:text-slate-300">{dash(l.name)}</span>,
  },
  {
    key: 'email',
    header: 'Email',
    className: 'max-w-[200px] truncate',
    render: (l) => <span className="text-slate-600 dark:text-slate-400">{dash(l.email)}</span>,
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (l) => {
      const pName = (l.priority as { name?: string })?.name;
      if (!pName) return '-';
      const meta = getPriorityBadgeMeta(pName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {pName}
        </span>
      );
    },
  },
  {
    key: 'call_status',
    header: 'Call Status',
    render: (l) => {
      const statusName = (l.call_status_relation as { name?: string })?.name;
      if (!statusName) return '-';
      const meta = getActivityStatusMeta(statusName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {statusName}
        </span>
      );
    },
  },
  {
    key: 'lead_status',
    header: 'Lead Status',
    render: (l) => {
      const statusName = (l.lead_status_relation as { name?: string })?.name;
      if (!statusName) return '-';
      const meta = getActivityStatusMeta(statusName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {statusName}
        </span>
      );
    },
  },
  {
    key: 'call_attempt',
    header: 'Call Attempts',
    className: 'text-center',
    render: (l) => (
      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {dash(l.call_attempt)}
      </span>
    ),
  },
];

const LEAD_FOLLOW_COLUMNS: Column<any>[] = [
  { key: 'type', header: 'Type', render: (l) => <TypeBadge label={String(l.type ?? 'Lead')} /> },
  {
    key: 'brand',
    header: 'Brand Name',
    render: (l) => (
      <span className="font-semibold text-slate-800 dark:text-slate-100">
        {getBrandName(l)}
      </span>
    ),
  },
  {
    key: 'name',
    header: 'Contact Person',
    render: (l) => <span className="font-medium text-slate-700 dark:text-slate-300">{dash(l.name)}</span>,
  },
  {
    key: 'email',
    header: 'Email',
    className: 'max-w-[200px] truncate',
    render: (l) => <span className="text-slate-600 dark:text-slate-400">{dash(l.email)}</span>,
  },
  {
    key: 'mobile',
    header: 'Mobile',
    render: (l) => <span className="text-slate-600 dark:text-slate-400">{getMobile(l)}</span>,
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (l) => {
      const pName = (l.priority as { name?: string })?.name;
      if (!pName) return '-';
      const meta = getPriorityBadgeMeta(pName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {pName}
        </span>
      );
    },
  },
  {
    key: 'call_status',
    header: 'Call Status',
    render: (l) => {
      const statusName = (l.call_status_relation as { name?: string })?.name;
      if (!statusName) return '-';
      const meta = getActivityStatusMeta(statusName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {statusName}
        </span>
      );
    },
  },
  {
    key: 'lead_status',
    header: 'Lead Status',
    render: (l) => {
      const statusName = (l.lead_status_relation as { name?: string })?.name;
      if (!statusName) return '-';
      const meta = getActivityStatusMeta(statusName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {statusName}
        </span>
      );
    },
  },
  {
    key: 'call_attempt',
    header: 'Call Attempts',
    className: 'text-center',
    render: (l) => (
      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {dash(l.call_attempt)}
      </span>
    ),
  },
];

const BRIEF_COLUMNS: Column<any>[] = [
  { key: 'type', header: 'Type', render: () => <TypeBadge label="Brief" /> },
  {
    key: 'name',
    header: 'Brief Name',
    render: (b) => (
      <span className="font-semibold text-slate-800 dark:text-slate-100">
        {dash(b.name)}
      </span>
    ),
  },
  {
    key: 'brand',
    header: 'Brand Name',
    render: (b) => (
      <span className="font-medium text-slate-700 dark:text-slate-300">
        {dash((b.brand as { name?: string })?.name)}
      </span>
    ),
  },
  {
    key: 'product_name',
    header: 'Product',
    render: (b) => <span className="text-slate-700 dark:text-slate-300">{dash(b.product_name)}</span>,
  },
  {
    key: 'budget',
    header: 'Budget',
    render: (b) => (
      <span className="font-bold text-slate-900 dark:text-slate-100">
        {formatBudget(b.budget)}
      </span>
    ),
  },
  {
    key: 'brief_status',
    header: 'Brief Status',
    render: (b) => {
      const statusName = (b.brief_status as { name?: string })?.name;
      if (!statusName) return '-';
      const meta = getRecentBriefStatusMeta(statusName);
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.className || ''}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.dotColor }} />
          {statusName}
        </span>
      );
    },
  },
  {
    key: 'contact',
    header: 'Contact Person',
    render: (b) => <span className="text-slate-700 dark:text-slate-300">{dash((b.contact_person as { name?: string })?.name)}</span>,
  },
];

type SalesDashboardProps = {
  embedded?: boolean;
  filters?: DashboardFilterState;
  isCardVisible?: (view: DashboardView, cardId: string) => boolean;
};

const SalesDashboard: React.FC<SalesDashboardProps> = ({
  embedded = false,
  filters: filtersProp,
  isCardVisible = () => true,
}) => {
  const navigate = useNavigate();
  const [localFilters] = useState(createDefaultDashboardFilters);
  const filters = filtersProp ?? localFilters;
  const [activeTab, setActiveTab] = useState<DashboardTab>('new');
  const [selectedPriorityLeadId, setSelectedPriorityLeadId] = useState<number | null>(null);
  const [selectedPriorityBriefId, setSelectedPriorityBriefId] = useState<number | null>(null);

  const { data: prioritiesData } = useApiQuery(getPriorities, []);
  const priorities = useMemo(() => prioritiesData ?? [], [prioritiesData]);

  useEffect(() => {
    if (priorities.length === 0) return;
    setSelectedPriorityLeadId((current) => current ?? priorities[0].id);
    setSelectedPriorityBriefId((current) => current ?? priorities[0].id);
  }, [priorities]);

  const filterKey = serializeDashboardFilters(filters);

  const { data: salesData } = useApiQuery(
    async () => {
      const [
        leads,
        briefs,
        followUpLeads,
        meetingLeads,
        activities,
        recentBriefs,
        businessForecast,
      ] = await Promise.all([
        getLatestTwoLeads(filters),
        getLatestTwoBriefs(filters),
        getLatestFollowUpTwoLeads(filters),
        getLatestMeetingScheduledTwoLeads(filters),
        getRecentActivities(filters),
        getRecentBriefs(filters),
        getBusinessForecast(filters),
      ]);

      return { leads, briefs, followUpLeads, meetingLeads, activities, recentBriefs, businessForecast };
    },
    [filterKey],
  );

  const { data: leadCount } = useApiQuery(
    () => getLeadCountByPriority(selectedPriorityLeadId!, filters),
    [selectedPriorityLeadId, filterKey],
    { enabled: selectedPriorityLeadId != null },
  );

  const { data: briefCount } = useApiQuery(
    () => getBriefCountByPriority(selectedPriorityBriefId!, filters),
    [selectedPriorityBriefId, filterKey],
    { enabled: selectedPriorityBriefId != null },
  );

  const { data: pendingAssignmentCounts, loading: pendingAssignmentLoading } = useApiQuery(
    () => getPendingAssignmentCounts(filters),
    [filterKey],
  );

  const { tableData, tableColumns } = useMemo(() => {
    switch (activeTab) {
      case 'brief':
        return { tableData: salesData?.briefs ?? [], tableColumns: BRIEF_COLUMNS };
      case 'follow':
        return { tableData: salesData?.followUpLeads ?? [], tableColumns: LEAD_FOLLOW_COLUMNS };
      case 'meeting':
        return { tableData: salesData?.meetingLeads ?? [], tableColumns: LEAD_FOLLOW_COLUMNS };
      default:
        return { tableData: salesData?.leads ?? [], tableColumns: LEAD_COLUMNS };
    }
  }, [activeTab, salesData]);

  const handleViewAll = () => {
    navigate(activeTab === 'brief' ? ROUTES.BRIEF.PIPELINE : ROUTES.LEAD.ALL);
  };

  const handleRowView = useCallback(
    (item: { id?: string | number }) => {
      const rowId = String(item.id ?? '');
      navigate(activeTab === 'brief' ? ROUTES.BRIEF.EDIT(rowId) : ROUTES.LEAD.EDIT(rowId));
    },
    [activeTab, navigate],
  );

  const tableColumnsWithView = useMemo<Column<any>[]>(
    () => [
      ...tableColumns,
      {
        key: 'view',
        header: 'Action',
        className: 'text-center',
        render: (item) => (
          <button
            type="button"
            onClick={() => handleRowView(item)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:text-slate-400 dark:hover:text-orange-400 dark:hover:bg-orange-950/40 transition-colors"
            title={activeTab === 'brief' ? 'View Brief' : 'View Lead'}
            aria-label={activeTab === 'brief' ? 'View brief' : 'View lead'}
          >
            <Eye className="w-4 h-4" strokeWidth={2} />
          </button>
        ),
      },
    ],
    [tableColumns, activeTab, handleRowView],
  );

  const tabsWithCounts = useMemo<DashboardTabItem<DashboardTab>[]>(
    () => [
      { id: 'new', label: 'Leads', count: salesData?.leads?.length ?? 0 },
      { id: 'brief', label: 'Brief', count: salesData?.briefs?.length ?? 0 },
      { id: 'follow', label: 'Follow Up', count: salesData?.followUpLeads?.length ?? 0 },
      { id: 'meeting', label: 'Meeting Scheduled', count: salesData?.meetingLeads?.length ?? 0 },
    ],
    [salesData],
  );

  const activeTabLabel = useMemo(() => {
    switch (activeTab) {
      case 'brief':
        return 'Briefs';
      case 'follow':
        return 'Follow Ups';
      case 'meeting':
        return 'Meetings';
      default:
        return 'Leads';
    }
  }, [activeTab]);

  const forecast = salesData?.businessForecast;
  const showNotifications = isCardVisible('sales', 'sales.notifications');

  const kpiCards = (
    <>
      {isCardVisible('sales', 'sales.total-leads') ? (
        <PriorityMetricCard
          title="Total Leads"
          subtitle="Active Lead Pipeline"
          total={leadCount?.total_leads ?? null}
          priorityCount={leadCount?.priority_lead_count ?? null}
          options={priorities}
          selectedId={selectedPriorityLeadId}
          onSelect={(option) => setSelectedPriorityLeadId(option.id)}
          embedded={embedded}
          icon={<Users />}
          tone="blue"
        />
      ) : null}

      {isCardVisible('sales', 'sales.total-briefs') ? (
        <PriorityMetricCard
          title="Total Briefs"
          subtitle="Campaign Briefs"
          total={briefCount?.total_briefs ?? null}
          priorityCount={briefCount?.priority_brief_count ?? null}
          options={priorities}
          selectedId={selectedPriorityBriefId}
          onSelect={(option) => setSelectedPriorityBriefId(option.id)}
          embedded={embedded}
          icon={<FileText />}
          tone="orange"
        />
      ) : null}

      {isCardVisible('sales', 'sales.business-forecast') ? (
        <BusinessForecastCard
          forecast={forecast ?? null}
          embedded={embedded}
        />
      ) : null}

      {isCardVisible('sales', 'sales.business-weightage') ? (
        <BusinessWeightageCard
          forecast={forecast ?? null}
          embedded={embedded}
        />
      ) : null}
    </>
  );

  return (
    <div className="dashboard-content">
      {showNotifications ? (
        <div className="dashboard-sales-performance">
          <PendingAssignmentsCard
            counts={pendingAssignmentCounts}
            loading={pendingAssignmentLoading}
            embedded={embedded}
          />
          <div className="dashboard-sales-kpis">{kpiCards}</div>
        </div>
      ) : (
        <div className="dashboard-stat-grid">{kpiCards}</div>
      )}

      <DashboardChartsSection variant="sales" filters={filters} isCardVisible={isCardVisible} />

      {isCardVisible('sales', 'sales.lead-table') ? (
        <div className={`dashboard-table-panel ${embedded ? 'is-embedded' : ''}`}>
          <div className="dashboard-table-panel__header">
            <DashboardTabNav
              tabs={tabsWithCounts}
              activeTab={activeTab}
              onChange={setActiveTab}
              className="dashboard-tabs--inner"
            />
            <button
              type="button"
              className="dashboard-table-panel__view-all-btn shrink-0"
              onClick={handleViewAll}
            >
              <span>View All {activeTabLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <Table
              data={tableData}
              columns={tableColumnsWithView}
              compact
              desktopOnMobile
              keyExtractor={(item, index) => String(item.id ?? index)}
            />
          </div>
        </div>
      ) : null}

      {isCardVisible('sales', 'sales.recent-activities') ? (
        <div className="dashboard-section-block">
          <h3 className="dashboard-section-block__title">Recent Activities</h3>
          {(salesData?.activities ?? []).length === 0 ? (
            <div className="dashboard-empty-state">No recent activities found</div>
          ) : (
            <div className="dashboard-activity-grid">
              {(salesData?.activities ?? []).map((activity) => {
                const activityMeta = getActivityStatusMeta(activity.lead_status);
                const brandDisplay = activity.brand_name || activity.agency_name || 'Unnamed Brand';
                return (
                  <div key={activity.id} className="dashboard-activity-card">
                    <div className="dashboard-activity-card__header">
                      <div className="dashboard-activity-card__brand-wrap">
                        <div className="dashboard-activity-card__icon">
                          <Building2 className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h4 className="dashboard-activity-card__brand" title={brandDisplay}>
                          {brandDisplay}
                        </h4>
                      </div>
                      {activityMeta ? (
                        <span className={`dashboard-activity-card__badge ${activityMeta.className}`}>
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: activityMeta.dotColor }}
                          />
                          {activityMeta.label}
                        </span>
                      ) : null}
                    </div>

                    <div className="dashboard-activity-card__meta">
                      <div className="dashboard-activity-card__row">
                        <span className="dashboard-activity-card__label">Assign To:</span>
                        <span className="dashboard-activity-card__value dashboard-activity-card__value--highlight">
                          {dash(activity.assign_to)}
                        </span>
                      </div>
                      <div className="dashboard-activity-card__row">
                        <span className="dashboard-activity-card__label">Contact Person:</span>
                        <span className="dashboard-activity-card__value">
                          {dash(activity.contact_person_name || activity.name)}
                        </span>
                      </div>
                      <div className="dashboard-activity-card__row">
                        <span className="dashboard-activity-card__label">Call Status:</span>
                        <span className="dashboard-activity-card__value">
                          {dash(activity.call_status)}
                        </span>
                      </div>
                      <div className="dashboard-activity-card__row">
                        <span className="dashboard-activity-card__label">Created At:</span>
                        <span className="dashboard-activity-card__value dashboard-activity-card__value--date">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                          {dash(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {isCardVisible('sales', 'sales.recent-briefs') ? (
        <div className="dashboard-section-block">
          <h3 className="dashboard-section-block__title">Recent Brief</h3>
          {(salesData?.recentBriefs ?? []).length === 0 ? (
            <div className="dashboard-empty-state">No recent briefs found</div>
          ) : (
            <div className="dashboard-activity-grid">
              {(salesData?.recentBriefs ?? []).map((brief) => {
                const briefMeta = getRecentBriefStatusMeta(brief.brief_status?.name);
                const percent = Math.round(Number(brief.brief_status?.percentage || 0));
                const progressColor = getProgressRingColor(percent);
                const circumference = 2 * Math.PI * 18;
                const strokeDashoffset = circumference * (1 - Math.min(percent, 100) / 100);

                return (
                  <div key={brief.id} className="dashboard-brief-card">
                    <div className="dashboard-brief-card__header">
                      <div className="dashboard-brief-card__title-wrap">
                        <div className="dashboard-brief-card__icon">
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="dashboard-brief-card__title" title={brief.name || 'Untitled Brief'}>
                          {brief.name || 'Untitled Brief'}
                        </h4>
                      </div>
                      {briefMeta ? (
                        <span className={`dashboard-brief-card__badge ${briefMeta.className}`}>
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: briefMeta.dotColor }}
                          />
                          {briefMeta.label}
                        </span>
                      ) : null}
                    </div>

                    <div className="dashboard-brief-card__body">
                      <div className="dashboard-brief-card__meta">
                        <div className="dashboard-brief-card__row">
                          <span className="dashboard-brief-card__label">Brand Name:</span>
                          <span className="dashboard-brief-card__value dashboard-brief-card__value--highlight">
                            {dash(brief.brand_name)}
                          </span>
                        </div>
                        <div className="dashboard-brief-card__row">
                          <span className="dashboard-brief-card__label">Product Name:</span>
                          <span className="dashboard-brief-card__value">
                            {dash(brief.product_name)}
                          </span>
                        </div>
                        <div className="dashboard-brief-card__row">
                          <span className="dashboard-brief-card__label">Budget:</span>
                          <span className="dashboard-brief-card__value dashboard-brief-card__value--budget">
                            {formatBudget(brief.budget)}
                          </span>
                        </div>
                        <div className="dashboard-brief-card__row">
                          <span className="dashboard-brief-card__label">Contact Person:</span>
                          <span className="dashboard-brief-card__value">
                            {dash(brief.contact_person_name)}
                          </span>
                        </div>
                      </div>

                      <div className="dashboard-brief-card__progress-wrap">
                        <div className="relative flex items-center justify-center w-14 h-14">
                          <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 44 44">
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              fill="transparent"
                              className="text-slate-100 dark:text-slate-700/60"
                            />
                            {percent > 0 ? (
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                stroke={progressColor}
                                strokeWidth="3.2"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-500 ease-out"
                              />
                            ) : null}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-none">
                              {percent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SalesDashboard;

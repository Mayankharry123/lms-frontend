/**
 * @file SalesDashboard.tsx
 * @description Sales role dashboard with leads, briefs, and KPI widgets.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Table, { type Column } from '../../components/ui/Table';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import DashboardMetricCard from '../../components/dashboard/DashboardMetricCard';
import DashboardTabNav from '../../components/dashboard/DashboardTabNav';
import PriorityMetricCard from '../../components/dashboard/PriorityMetricCard';
import { ROUTES } from '../../constants';
import { useApiQuery } from '../../hooks/useApiQuery';
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
import { formatDashboardCurrency } from '../../utils/dashboardFormat';
import type { DashboardView } from '../../utils/dashboardCardVisibility';

type DashboardTab = 'new' | 'brief' | 'follow' | 'meeting';

const DASHBOARD_TABS = [
  { id: 'new' as const, label: 'Leads' },
  { id: 'brief' as const, label: 'Brief' },
  { id: 'follow' as const, label: 'Follow Up' },
  { id: 'meeting' as const, label: 'Meeting Scheduled' },
];

const dash = (value: unknown) => (value == null || value === '' ? '-' : String(value));

const TypeBadge = ({ label }: { label: string }) => (
  <span className="dashboard-badge dashboard-badge--warning">{label}</span>
);

const getBrandName = (row: { brand?: { name?: string }; agency?: { name?: string } }) =>
  dash(row.brand?.name ?? row.agency?.name);

const getMobile = (row: { mobile_number?: { number?: string }[] }) => dash(row.mobile_number?.[0]?.number);

const LEAD_COLUMNS: Column<any>[] = [
  { key: 'type', header: 'Type', render: () => <TypeBadge label="Brand" /> },
  { key: 'brand', header: 'Brand Name', render: (l) => getBrandName(l) },
  { key: 'name', header: 'Contact Person', render: (l) => dash(l.name) },
  { key: 'email', header: 'Email', className: 'max-w-[200px] truncate', render: (l) => dash(l.email) },
  { key: 'priority', header: 'Priority', render: (l) => dash((l.priority as { name?: string })?.name) },
  { key: 'call_status', header: 'Call Status', render: (l) => dash((l.call_status_relation as { name?: string })?.name) },
  { key: 'lead_status', header: 'Lead Status', render: (l) => dash((l.lead_status_relation as { name?: string })?.name) },
  { key: 'call_attempt', header: 'Call Attempts', render: (l) => dash(l.call_attempt) },
];

const LEAD_FOLLOW_COLUMNS: Column<any>[] = [
  { key: 'type', header: 'Type', render: (l) => <TypeBadge label={String(l.type ?? 'Lead')} /> },
  { key: 'name', header: 'Contact Person', render: (l) => dash(l.name) },
  { key: 'brand', header: 'Brand Name', render: (l) => getBrandName(l) },
  { key: 'email', header: 'Email', className: 'max-w-[200px] truncate', render: (l) => dash(l.email) },
  { key: 'mobile', header: 'Mobile', render: (l) => getMobile(l) },
  { key: 'priority', header: 'Priority', render: (l) => dash((l.priority as { name?: string })?.name) },
  { key: 'call_status', header: 'Call Status', render: (l) => dash((l.call_status_relation as { name?: string })?.name) },
  { key: 'lead_status', header: 'Lead Status', render: (l) => dash((l.lead_status_relation as { name?: string })?.name) },
  { key: 'call_attempt', header: 'Call Attempts', render: (l) => dash(l.call_attempt) },
];

const BRIEF_COLUMNS: Column<any>[] = [
  { key: 'type', header: 'Type', render: () => <TypeBadge label="Brief" /> },
  { key: 'name', header: 'Brief Name', render: (b) => dash(b.name) },
  { key: 'brand', header: 'Brand Name', render: (b) => dash((b.brand as { name?: string })?.name) },
  { key: 'product_name', header: 'Product', render: (b) => dash(b.product_name) },
  { key: 'budget', header: 'Budget', render: (b) => (b.budget != null ? `₹${b.budget}` : '-') },
  { key: 'brief_status', header: 'Brief Status', render: (b) => dash((b.brief_status as { name?: string })?.name) },
  { key: 'contact', header: 'Contact Person', render: (b) => dash((b.contact_person as { name?: string })?.name) },
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
  const priorities = prioritiesData ?? [];

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
        header: 'View',
        className: 'text-center',
        render: (item) => (
          <button
            type="button"
            onClick={() => handleRowView(item)}
            className="inline-flex items-center justify-center w-8 h-8 !p-0 border-0 !bg-transparent rounded-full hover:!bg-orange-50 transition-colors"
            title={activeTab === 'brief' ? 'View Brief' : 'View Lead'}
            aria-label={activeTab === 'brief' ? 'View brief' : 'View lead'}
          >
            <Eye className="w-5 h-5 shrink-0 !text-orange-700" strokeWidth={2} />
          </button>
        ),
      },
    ],
    [tableColumns, activeTab, handleRowView],
  );

  const forecast = salesData?.businessForecast;

  return (
    <div className="dashboard-content">
      <div className="dashboard-stat-grid">
        {isCardVisible('sales', 'sales.total-leads') ? <PriorityMetricCard
          title="Total Leads"
          total={leadCount?.total_leads ?? null}
          priorityCount={leadCount?.priority_lead_count ?? null}
          options={priorities}
          selectedId={selectedPriorityLeadId}
          onSelect={(option) => setSelectedPriorityLeadId(option.id)}
          embedded={embedded}
        /> : null}

        {isCardVisible('sales', 'sales.total-briefs') ? <PriorityMetricCard
          title="Total Briefs"
          total={briefCount?.total_briefs ?? null}
          priorityCount={briefCount?.priority_brief_count ?? null}
          options={priorities}
          selectedId={selectedPriorityBriefId}
          onSelect={(option) => setSelectedPriorityBriefId(option.id)}
          embedded={embedded}
        /> : null}

        {isCardVisible('sales', 'sales.business-forecast') ? <DashboardMetricCard
          title="Business Forecast"
          value={forecast ? formatDashboardCurrency(forecast.total_budget) : '--'}
          embedded={embedded}
        /> : null}

        {isCardVisible('sales', 'sales.business-weightage') ? <DashboardMetricCard
          title="Business Weightage"
          value={forecast ? `${forecast.business_weightage}%` : '--'}
          embedded={embedded}
        /> : null}
      </div>

      <DashboardChartsSection variant="sales" filters={filters} isCardVisible={isCardVisible} />

      {isCardVisible('sales', 'sales.lead-table') ? <div className={`dashboard-table-panel ${embedded ? 'is-embedded' : ''}`}>
        <div className="dashboard-table-panel__header">
          <DashboardTabNav
            tabs={DASHBOARD_TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="dashboard-tabs--inner"
          />
          <button type="button" className="a-tag-button shrink-0" onClick={handleViewAll}>
            View All
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
      </div> : null}

      {isCardVisible('sales', 'sales.recent-activities') ? <div className="dashboard-section-block">
        <h3 className="dashboard-section-block__title">Recent Activities</h3>
        <div className="dashboard-activity-grid">
          {(salesData?.activities ?? []).map((activity) => (
            <div key={activity.id} className="dashboard-activity-card">
              <div className="dashboard-activity-card__row">
                <div className="dashboard-activity-card__details">
                  <p><span className="dashboard-activity-card__label">Brand Name:</span> {activity.brand_name}</p>
                  <p><span className="dashboard-activity-card__label">Assign To:</span> {activity.assign_to}</p>
                  <p><span className="dashboard-activity-card__label">Contact Person:</span> {activity.contact_person_name}</p>
                  <p><span className="dashboard-activity-card__label">Call Status:</span> {activity.call_status}</p>
                  <p><span className="dashboard-activity-card__label">Created At:</span> {activity.created_at}</p>
                </div>
                {activity.lead_status ? (
                  <span className="dashboard-badge dashboard-badge--success">{activity.lead_status}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div> : null}

      {isCardVisible('sales', 'sales.recent-briefs') ? <div className="dashboard-section-block">
        <h3 className="dashboard-section-block__title">Recent Brief</h3>
        <div className="dashboard-activity-grid">
          {(salesData?.recentBriefs ?? []).map((brief) => (
            <div key={brief.id} className="dashboard-brief-card">
              <div className="dashboard-brief-card__row">
                <div className="dashboard-brief-card__details">
                  <p><span className="dashboard-brief-card__label">Brief Name:</span> {brief.name}</p>
                  <p><span className="dashboard-brief-card__label">Brand Name:</span> {brief.brand_name || '-'}</p>
                  <p><span className="dashboard-brief-card__label">Product Name:</span> {brief.product_name}</p>
                  <p><span className="dashboard-brief-card__label">Budget:</span> ₹{brief.budget}</p>
                  <p><span className="dashboard-brief-card__label">Contact Person:</span> {brief.contact_person_name || '-'}</p>
                </div>

                <div className="dashboard-brief-card__progress">
                  {brief.brief_status?.name ? (
                    <span className="dashboard-brief-card__status">{brief.brief_status.name}</span>
                  ) : null}
                  <svg viewBox="0 0 36 36" className="dashboard-brief-card__ring">
                    <path d="M18 2a16 16 0 1 0 0 32 16 16 0 1 0 0-32z" fill="#e6eef6" />
                    <path
                      d="M18 2a16 16 0 1 0 0 32"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      strokeDasharray={`${Number(brief.brief_status?.percentage || 0)},100`}
                      strokeLinecap="round"
                    />
                    <text x="18" y="20" fontSize="7" textAnchor="middle" fill="#111827">
                      {brief.brief_status?.percentage || 0}%
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div> : null}
    </div>
  );
};

export default SalesDashboard;

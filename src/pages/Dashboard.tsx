/**
 * @file Dashboard.tsx
 * @description Unified dashboard with overview, sales, and planner views.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Users, FileCheck } from 'lucide-react';
import { BsGraphUpArrow } from 'react-icons/bs';
import DashboardMetricCard from '../components/dashboard/DashboardMetricCard';
import DashboardFilterBar from '../components/dashboard/DashboardFilterBar';
import DashboardSection from '../components/dashboard/DashboardSection';
import DashboardChartsSection from '../components/dashboard/DashboardChartsSection';
import DashboardTabNav from '../components/dashboard/DashboardTabNav';
import OverviewPanels from '../components/dashboard/OverviewPanels';
import SalesDashboard from './Dashboard/SalesDashboard';
import PlannerDashboard from './Dashboard/PlannerDashboard';
import {
  getPendingAssignments,
  getDashboardStats,
  getMeetings,
} from '../services/Dashboard';
import { getBusinessForecast } from '../services/BusinessForecast';
import {
  createDefaultDashboardFilters,
  serializeDashboardFilters,
  type DashboardFilterState,
} from '../utils/dashboardFilters';
import { formatDashboardCurrency } from '../utils/dashboardFormat';
import {
  getDefaultDashboardOrganisationIds,
  sanitizeDashboardOrganisationIds,
} from '../utils/dashboardUserScope';
import { useDashboardPermissions } from '../utils/dashboardPermissions';
import { useDashboardCardVisibility } from '../hooks/useDashboardCardVisibility';
import type { DashboardView } from '../utils/dashboardCardVisibility';
import type { RootState } from '../redux/store';
import '../components/dashboard/dashboard.css';

const ALL_DASHBOARD_TABS: { id: DashboardView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'planner', label: 'Planner' },
];

const Dashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthInitialized = useSelector((state: RootState) => state.auth.isInitialized);
  const dashboardPermissions = useDashboardPermissions();
  const filtersInitialized = useRef(false);
  const { preferences: cardPreferences, isCardVisible, toggleCard, resetCards } = useDashboardCardVisibility();

  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [meetingsPage, setMeetingsPage] = useState(1);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof getPendingAssignments>>['data']>([]);
  const [meetings, setMeetings] = useState<Awaited<ReturnType<typeof getMeetings>>['data']>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingAssignments: 0,
    teamPerformance: '0%',
    openAlerts: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [draftFilters, setDraftFilters] = useState<DashboardFilterState>(createDefaultDashboardFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterState | null>(null);

  const visibleTabs = useMemo(
    () =>
      ALL_DASHBOARD_TABS.filter((tab) => {
        if (tab.id === 'overview') return dashboardPermissions.canViewOverviewTab();
        if (tab.id === 'sales') return dashboardPermissions.canViewSalesTab();
        if (tab.id === 'planner') return dashboardPermissions.canViewPlannerTab();
        return false;
      }),
    [dashboardPermissions],
  );

  const hasPendingFilterChanges = useMemo(() => {
    if (!appliedFilters) return false;
    return serializeDashboardFilters(draftFilters) !== serializeDashboardFilters(appliedFilters);
  }, [draftFilters, appliedFilters]);

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === activeView)) {
      setActiveView(visibleTabs[0].id);
    }
  }, [visibleTabs, activeView]);

  useEffect(() => {
    if (!isAuthInitialized || !user) return;
    if (filtersInitialized.current) return;

    filtersInitialized.current = true;
    const orgIds = getDefaultDashboardOrganisationIds(user);
    const initialFilters: DashboardFilterState = {
      ...createDefaultDashboardFilters(),
      organisationIds: orgIds,
    };

    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, [isAuthInitialized, user]);

  useEffect(() => {
    if (!user || !appliedFilters) return;

    const scopedOrgIds = sanitizeDashboardOrganisationIds(user, appliedFilters.organisationIds);
    const currentKey = [...appliedFilters.organisationIds].sort().join(',');
    const scopedKey = [...scopedOrgIds].sort().join(',');

    if (currentKey === scopedKey) return;

    const nextFilters = { ...appliedFilters, organisationIds: scopedOrgIds };
    setAppliedFilters(nextFilters);
    setDraftFilters((prev) => ({ ...prev, organisationIds: scopedOrgIds }));
  }, [user, appliedFilters]);

  const fetchOverviewData = useCallback(async (activeFilters: DashboardFilterState) => {
    if (!dashboardPermissions.canViewOverviewTab()) return;

    setLoading(true);
    try {
      const requests: Promise<unknown>[] = [];
      const requestMap: Array<'assignments' | 'stats' | 'meetings' | 'forecast'> = [];

      if (dashboardPermissions.canViewPendingAssignments()) {
        requests.push(getPendingAssignments(activeFilters));
        requestMap.push('assignments');
      }
      if (dashboardPermissions.canViewOverviewStats()) {
        requests.push(getDashboardStats(activeFilters));
        requestMap.push('stats');
        requests.push(getBusinessForecast(activeFilters));
        requestMap.push('forecast');
      }
      if (dashboardPermissions.canViewMeetings()) {
        requests.push(getMeetings(activeFilters));
        requestMap.push('meetings');
      }

      const results = await Promise.allSettled(requests);

      results.forEach((result, index) => {
        const type = requestMap[index];
        if (result.status !== 'fulfilled') return;

        if (type === 'assignments') {
          setAssignments((result.value as Awaited<ReturnType<typeof getPendingAssignments>>).data);
        }
        if (type === 'stats') {
          setStats((result.value as Awaited<ReturnType<typeof getDashboardStats>>).data);
        }
        if (type === 'meetings') {
          setMeetings((result.value as Awaited<ReturnType<typeof getMeetings>>).data);
        }
        if (type === 'forecast') {
          const forecast = result.value as Awaited<ReturnType<typeof getBusinessForecast>>;
          setMonthlyRevenue(typeof forecast?.total_budget === 'number' ? forecast.total_budget : 0);
        }
      });
    } catch (error) {
      console.error('Unexpected error loading overview dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [dashboardPermissions]);

  useEffect(() => {
    if (!appliedFilters || activeView !== 'overview') return;
    fetchOverviewData(appliedFilters);
    setAssignmentsPage(1);
    setMeetingsPage(1);
  }, [appliedFilters, activeView, fetchOverviewData]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({
      ...draftFilters,
      organisationIds: sanitizeDashboardOrganisationIds(user, draftFilters.organisationIds),
    });
  }, [draftFilters, user]);

  const handleDateApply = useCallback(
    (dateValue: Pick<DashboardFilterState, 'preset' | 'dateFrom' | 'dateTo'>) => {
      const nextFilters = {
        ...draftFilters,
        ...dateValue,
        organisationIds: sanitizeDashboardOrganisationIds(user, draftFilters.organisationIds),
      };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    },
    [draftFilters, user],
  );

  const handlePriorityChange = (priority: 'all' | 'High' | 'Medium' | 'Low') => {
    const nextPriority = priority === 'all' ? undefined : priority;
    setDraftFilters((prev) => ({ ...prev, priority: nextPriority }));
    setAppliedFilters((prev) => (prev ? { ...prev, priority: nextPriority } : prev));
  };

  const renderOverview = () => {
    if (!appliedFilters) return null;

    return (
      <div className="dashboard-content">
        {dashboardPermissions.canViewOverviewStats() ? (
          <div className="dashboard-stat-grid dashboard-stat-grid--3">
            {isCardVisible('overview', 'overview.total-users') ? <DashboardMetricCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<Users />}
              loading={loading}
              className="dashboard-metric-card--tone-blue"
            /> : null}
            {isCardVisible('overview', 'overview.pending-assignments') ? <DashboardMetricCard
              title="Pending Assignments"
              value={stats.pendingAssignments}
              icon={<FileCheck />}
              loading={loading}
              className="dashboard-metric-card--tone-amber"
            /> : null}
            {/* Team Performance hidden until metric is finalized */}
            {isCardVisible('overview', 'overview.monthly-revenue') ? <DashboardMetricCard
              title="Monthly Revenue"
              value={formatDashboardCurrency(monthlyRevenue)}
              icon={<BsGraphUpArrow />}
              loading={loading}
              className="dashboard-metric-card--tone-teal"
            /> : null}
          </div>
        ) : null}

        <DashboardChartsSection variant="overview" filters={appliedFilters} isCardVisible={isCardVisible} />

        {dashboardPermissions.canViewPendingAssignments() || dashboardPermissions.canViewMeetings() ? (
          <OverviewPanels
            assignments={dashboardPermissions.canViewPendingAssignments() ? assignments : []}
            meetings={dashboardPermissions.canViewMeetings() ? meetings : []}
            loading={loading}
            assignmentsPage={assignmentsPage}
            meetingsPage={meetingsPage}
            priority={appliedFilters.priority ?? 'all'}
            onAssignmentsPageChange={setAssignmentsPage}
            onMeetingsPageChange={setMeetingsPage}
            onPriorityChange={handlePriorityChange}
            onCompleteAssignment={(id) => setAssignments((prev) => prev.filter((item) => item.id !== id))}
            onDismissMeeting={(id) => setMeetings((prev) => prev.filter((item) => item.id !== id))}
            showAssignments={dashboardPermissions.canViewPendingAssignments() && isCardVisible('overview', 'overview.pending-assignments-list')}
            showMeetings={dashboardPermissions.canViewMeetings() && isCardVisible('overview', 'overview.meetings')}
          />
        ) : null}
      </div>
    );
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-panel">
          <div className="dashboard-panel__body">
            <div className="dashboard-empty-state">
              You do not have permission to view any dashboard sections.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <DashboardFilterBar
          value={draftFilters}
          onChange={setDraftFilters}
          onApply={handleApplyFilters}
          onDateApply={handleDateApply}
          hasPendingChanges={hasPendingFilterChanges}
          activeView={activeView}
          cardPreferences={cardPreferences}
          onToggleCard={toggleCard}
          onResetCards={resetCards}
        />
      </div>

      <div className="dashboard-panel">
        <DashboardTabNav
          tabs={visibleTabs}
          activeTab={activeView}
          onChange={setActiveView}
          ariaLabel="Dashboard views"
        />

        <div className="dashboard-panel__body">
          {activeView === 'overview' && dashboardPermissions.canViewOverviewTab() && renderOverview()}

          {activeView === 'sales' && dashboardPermissions.canViewSalesTab() && appliedFilters && (
            <DashboardSection
              title="Sales Performance"
              description="Leads, briefs, follow-ups, and recent activity."
            >
              <SalesDashboard embedded filters={appliedFilters} isCardVisible={isCardVisible} />
            </DashboardSection>
          )}

          {activeView === 'planner' && dashboardPermissions.canViewPlannerTab() && appliedFilters && (
            <DashboardSection
              title="Planner Workspace"
              description="Active briefs, planning metrics, and assigned submissions."
            >
              <PlannerDashboard embedded filters={appliedFilters} isCardVisible={isCardVisible} />
            </DashboardSection>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

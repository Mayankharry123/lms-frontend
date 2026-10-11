/**
 * @file PlannerDashboard.tsx
 * @description Planner role dashboard with brief submission and plan tasks.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiFileList3Line,
  RiTimerLine,
  RiErrorWarningLine,
  RiClipboardLine,
} from 'react-icons/ri';
import { Clock, Calendar, Upload, ClipboardList, AlertCircle } from 'lucide-react';
import DashboardChartsSection from '../../components/dashboard/DashboardChartsSection';
import PlannerKpiCard from '../../components/dashboard/PlannerKpiCard';
import PendingAssignmentsCard from '../../components/dashboard/PendingAssignmentsCard';
import { formatAssignmentDays } from '../../utils/dashboardFormat';
import Pagination from '../../components/ui/Pagination';
import StatusDropdown from '../../components/ui/StatusDropdown';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getPlannerChartMetrics } from '../../services/DashboardCharts';
import { getPendingAssignmentCounts } from '../../services/Dashboard';
import { getPlannerStatuses } from '../../services/BriefLog';
import { updatePlannerStatus } from '../../services/UpdatePlannerStatus';
import {
  getPlannerDashboardCard,
  getLatestFiveBriefs,
  getRecentSubmittedPlans,
} from '../../services/PlannerDashboard';
import type {
  PlannerDashboardBrief,
  RecentSubmittedPlan,
} from '../../services/PlannerDashboard';
import {
  createDefaultDashboardFilters,
  serializeDashboardFilters,
  type DashboardFilterState,
} from '../../utils/dashboardFilters';
import type { DashboardView } from '../../utils/dashboardCardVisibility';
import SweetAlert from '../../utils/SweetAlert';

const getBriefStatusMeta = (status?: string) => {
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
        'border-slate-200/90 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 border',
      dotColor: '#64748b',
    };
  }
  if (/\b(pending|submission|submitted|in progress)\b/.test(s)) {
    return {
      label: status,
      className:
        'border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 border',
      dotColor: '#f59e0b',
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
      'border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 border',
    dotColor: '#3b82f6',
  };
};

const getTimerBadgeMeta = (leftTime?: string) => {
  const val = (leftTime || '').trim();
  if (!val || val.toLowerCase() === 'no deadline') {
    return {
      label: val || 'No deadline',
      className:
        'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 border',
    };
  }
  const lower = val.toLowerCase();
  if (lower.includes('expired') || lower.includes('overdue')) {
    return {
      label: val,
      className:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 border',
    };
  }
  return {
    label: val,
    className:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-300 border',
  };
};

const SUBMITTED_PLANS_PER_PAGE = 5;

const getPlannerInitials = (name?: string) => {
  if (!name || name === '—') return 'PL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'PL').toUpperCase();
};

const getSubmittedPlanStatusMeta = (status: string) => {
  const normalized = status.toLowerCase().trim();
  if (/\b(approve|approved|complete|completed)\b/.test(normalized)) {
    return {
      dotColor: '#10b981',
      className:
        'border-emerald-200/90 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 border',
    };
  }
  if (/\b(denied|declined|rejected|cancel|cancelled)\b/.test(normalized)) {
    return {
      dotColor: '#ef4444',
      className:
        'border-rose-200/90 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300 border',
    };
  }
  if (/\b(pending|submission|submitted|in progress|review)\b/.test(normalized)) {
    return {
      dotColor: '#f59e0b',
      className:
        'border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 border',
    };
  }
  return {
    dotColor: '#3b82f6',
    className:
      'border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 border',
  };
};


type PlannerDashboardProps = {
  embedded?: boolean;
  filters?: DashboardFilterState;
  isCardVisible?: (view: DashboardView, cardId: string) => boolean;
};

const PlannerDashboard: React.FC<PlannerDashboardProps> = ({
  embedded = false,
  filters: filtersProp,
  isCardVisible = () => true,
}) => {
  const navigate = useNavigate();
  const [localFilters] = useState(createDefaultDashboardFilters);
  const filters = filtersProp ?? localFilters;
  const filterKey = serializeDashboardFilters(filters);

  const { data: cardData, loading: cardLoading, error: cardError } = useApiQuery(
    () => getPlannerDashboardCard(filters),
    [filterKey],
  );

  const { data: plannerCharts, loading: plannerChartsLoading } = useApiQuery(
    () => getPlannerChartMetrics(filters),
    [filterKey],
  );

  const { data: pendingAssignmentCounts, loading: pendingAssignmentLoading } = useApiQuery(
    () => getPendingAssignmentCounts(filters),
    [filterKey],
  );

  const { data: assignedBriefsData, loading: briefsLoading, error: briefsError } = useApiQuery(
    () => getLatestFiveBriefs(filters),
    [filterKey],
  );
  const assignedBriefs = assignedBriefsData ?? [];

  const {
    data: submittedPlansData,
    loading: submittedPlansLoading,
    error: submittedPlansError,
    refetch: refetchSubmittedPlans,
    setData: setSubmittedPlansData,
  } = useApiQuery(() => getRecentSubmittedPlans());
  const { data: plannerStatusesData } = useApiQuery(() => getPlannerStatuses());
  const [submittedPlansPage, setSubmittedPlansPage] = useState(1);
  const submittedPlans = useMemo(() => submittedPlansData ?? [], [submittedPlansData]);
  const plannerStatusOptions = useMemo(
    () => plannerStatusesData?.data.map((status) => status.name) ?? [],
    [plannerStatusesData]
  );
  const visibleSubmittedPlans = useMemo(
    () =>
      submittedPlans.slice(
        (submittedPlansPage - 1) * SUBMITTED_PLANS_PER_PAGE,
        submittedPlansPage * SUBMITTED_PLANS_PER_PAGE
      ),
    [submittedPlans, submittedPlansPage]
  );

  const handleSubmittedPlanStatusChange = async (planId: string, newStatus: string) => {
    const plan = submittedPlans.find((item) => item.id === planId);
    const status = plannerStatusesData?.data.find((item) => item.name === newStatus);
    if (!plan?.plannerId || !status) {
      SweetAlert.showError('Unable to update status. Planner or status details are missing.');
      return;
    }

    try {
      await updatePlannerStatus(plan.plannerId, status.id);
      setSubmittedPlansData((current) =>
        current?.map((item) =>
          item.id === planId ? { ...item, planStatus: newStatus } : item
        ) ?? current
      );
      void refetchSubmittedPlans();
      SweetAlert.showUpdateSuccess();
    } catch (error) {
      console.error('Failed to update submitted plan status:', error);
      SweetAlert.showError('Failed to update status. Please try again.');
    }
  };

  const renderBriefCard = (brief: PlannerDashboardBrief) => {
    const statusMeta = getBriefStatusMeta(brief.status);
    const timerMeta = getTimerBadgeMeta(brief.left_time);
    const budget = brief.budget
      ? `₹${Number(brief.budget).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '—';

    return (
      <div key={brief.id} className="dashboard-planner-brief">
        {/* Card Header: Brief ID, Status Badge & Deadline Badge */}
        <div className="dashboard-planner-brief__header">
          <div className="dashboard-planner-brief__id-group">
            <span className="dashboard-planner-brief__id-label">Brief ID</span>
            <span className="dashboard-planner-brief__id-badge">#{brief.id}</span>
            {statusMeta ? (
              <span className={`dashboard-planner-brief__status-badge ${statusMeta.className}`}>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: statusMeta.dotColor }}
                  aria-hidden="true"
                />
                <span>{statusMeta.label}</span>
              </span>
            ) : null}
          </div>

          <div className="dashboard-planner-brief__timer-wrap">
            <span className={`dashboard-planner-brief__timer-badge ${timerMeta.className}`}>
              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{timerMeta.label}</span>
            </span>
          </div>
        </div>

        {/* Card Body: Aligned Details & Right-Side Price + Action */}
        <div className="dashboard-planner-brief__body">
          <div className="dashboard-planner-brief__meta">
            <div className="dashboard-planner-brief__row">
              <span className="dashboard-planner-brief__row-label">Product Name:</span>
              <span className="dashboard-planner-brief__row-val dashboard-planner-brief__row-val--primary" title={brief.product_name || ''}>
                {brief.product_name || '—'}
              </span>
            </div>

            <div className="dashboard-planner-brief__row">
              <span className="dashboard-planner-brief__row-label">Brand Name:</span>
              <span className="dashboard-planner-brief__row-val" title={brief.brand_name || ''}>
                {brief.brand_name || '—'}
              </span>
            </div>

            <div className="dashboard-planner-brief__row">
              <span className="dashboard-planner-brief__row-label">Brief Name:</span>
              <span className="dashboard-planner-brief__row-val" title={brief.brief_name || ''}>
                {brief.brief_name || '—'}
              </span>
            </div>

            <div className="dashboard-planner-brief__row" title={`Submission: ${brief.submission_date || '—'}`}>
              <span className="dashboard-planner-brief__row-label">Submission:</span>
              <span className="dashboard-planner-brief__row-val dashboard-planner-brief__row-val--date">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>{brief.submission_date || '—'}</span>
              </span>
            </div>
          </div>

          <div className="dashboard-planner-brief__aside">
            <div className="dashboard-planner-brief__price-box">
              <span className="dashboard-planner-brief__price-label">Price</span>
              <span className="dashboard-planner-brief__budget">{budget}</span>
            </div>

            <button
              type="button"
              className="dashboard-planner-brief__action-btn"
              title="Upload Plan"
              aria-label={`Upload plan for Brief #${brief.id}`}
              onClick={() => navigate(`/brief/plan-submission/${brief.id}`)}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const showNotifications = isCardVisible('planner', 'planner.notifications');

  const kpiCards = (
    <>
      {isCardVisible('planner', 'planner.total-plan') ? (
        <PlannerKpiCard
          title="Total Brief"
          subtitle="Assigned Briefs"
          value={cardData?.total_plans ?? cardData?.assigned_plans ?? 0}
          icon={<RiClipboardLine />}
          tone="blue"
          badge={<span>Total</span>}
          pill={<span>Assigned</span>}
          progressPercent={100}
          footerLeft="Total planning portfolio"
          footerRight={`${cardData?.total_plans ?? cardData?.assigned_plans ?? 0} briefs`}
          embedded={embedded}
          loading={cardLoading}
        />
      ) : null}

      {isCardVisible('planner', 'planner.active-briefs') ? (
        <PlannerKpiCard
          title="Active Briefs"
          subtitle="In Progress"
          value={cardData?.active_briefs ?? 0}
          icon={<RiFileList3Line />}
          tone="orange"
          badge={<span>Active</span>}
          pill={
            <span>
              {(cardData?.total_plans ?? cardData?.assigned_plans ?? 0) > 0
                ? `${Math.round(
                    ((cardData?.active_briefs ?? 0) /
                      (cardData?.total_plans ?? cardData?.assigned_plans ?? 1)) *
                      100,
                  )}% Active`
                : 'Active'}
            </span>
          }
          progressPercent={
            (cardData?.total_plans ?? cardData?.assigned_plans ?? 0) > 0
              ? Math.round(
                  ((cardData?.active_briefs ?? 0) /
                    (cardData?.total_plans ?? cardData?.assigned_plans ?? 1)) *
                    100,
                )
              : 0
          }
          footerLeft={`${cardData?.active_briefs ?? 0} of ${
            cardData?.total_plans ?? cardData?.assigned_plans ?? 0
          } briefs in planning`}
          footerRight="Pipeline"
          embedded={embedded}
          loading={cardLoading}
        />
      ) : null}

      {isCardVisible('planner', 'planner.avg-plan-submission-time') ? (
        <PlannerKpiCard
          title="Avg Plan Submission Time"
          subtitle="Turnaround Time"
          value={formatAssignmentDays(plannerCharts?.totals.avgAssignmentDays)}
          icon={<RiTimerLine />}
          tone="purple"
          badge={<span>Speed</span>}
          pill={<span>Assign → Submit</span>}
          progressPercent={100}
          footerLeft="Average submission duration"
          footerRight="Target: < 2 days"
          embedded={embedded}
          loading={plannerChartsLoading}
        />
      ) : null}

      {isCardVisible('planner', 'planner.overdue-briefs') ? (
        <PlannerKpiCard
          title="Expired Brief"
          subtitle="Overdue Submissions"
          value={cardData?.overdue_briefs ?? 0}
          icon={<RiErrorWarningLine />}
          tone={(cardData?.overdue_briefs ?? 0) > 0 ? 'rose' : 'emerald'}
          badge={(cardData?.overdue_briefs ?? 0) > 0 ? <span>Overdue</span> : <span>On Track</span>}
          pill={(cardData?.overdue_briefs ?? 0) > 0 ? <span>Action Required</span> : <span>0 Overdue</span>}
          progressPercent={(cardData?.overdue_briefs ?? 0) > 0 ? 100 : 0}
          footerLeft={
            (cardData?.overdue_briefs ?? 0) === 0
              ? 'All submissions on schedule'
              : `${cardData?.overdue_briefs ?? 0} require attention`
          }
          footerRight="SLA Status"
          embedded={embedded}
          loading={cardLoading}
        />
      ) : null}
    </>
  );

  return (
    <div className="dashboard-content">
      {cardError ? (
        <div className="dashboard-error-state">{cardError}</div>
      ) : showNotifications ? (
        <div className="dashboard-planner-performance">
          <PendingAssignmentsCard
            counts={pendingAssignmentCounts}
            loading={pendingAssignmentLoading}
            embedded={embedded}
          />
          <div className="dashboard-planner-kpis">{kpiCards}</div>
        </div>
      ) : (
        <div className="dashboard-stat-grid">{kpiCards}</div>
      )}

      <DashboardChartsSection variant="planner" filters={filters} isCardVisible={isCardVisible} />

      <section className="dashboard-table-panel mb-6" aria-label="Recent Submitted Plans">
        <div className="dashboard-table-panel__header">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9.5 h-9.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/40 shrink-0"
              aria-hidden="true"
            >
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-0">
                Recent Submitted Plans
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                Review and update planner submissions in real-time.
              </p>
            </div>
          </div>

          {!submittedPlansLoading && submittedPlans.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <strong>{submittedPlans.length}</strong> Plans Submitted
              </span>
            </div>
          ) : null}
        </div>

        {submittedPlansLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-32"
                  >
                    Brief ID
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Brief Details
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-44"
                  >
                    Plan Status
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-52"
                  >
                    Planner Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={`plan-skeleton-${idx}`} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : submittedPlansError ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submittedPlansError}</span>
            </div>
          </div>
        ) : submittedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No submitted plans found
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-1 mb-0">
              Recent plans submitted by planners will appear here for review and status updates.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    <th
                      scope="col"
                      className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-32"
                    >
                      Brief ID
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Brief Details
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-44"
                    >
                      Plan Status
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-52"
                    >
                      Planner Name
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                  {visibleSubmittedPlans.map((plan: RecentSubmittedPlan) => {
                    const statusMeta = getSubmittedPlanStatusMeta(plan.planStatus);
                    const formattedDate =
                      plan.submittedAt > 0
                        ? new Date(plan.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : null;

                    return (
                      <tr
                        key={plan.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            #{plan.briefId}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="text-sm font-semibold text-slate-900 dark:text-slate-100 block max-w-sm truncate"
                            title={plan.briefName}
                          >
                            {plan.briefName}
                          </span>
                          {formattedDate ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Submitted {formattedDate}</span>
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {plan.plannerId && plannerStatusOptions.length > 0 ? (
                            <StatusDropdown
                              value={plan.planStatus}
                              options={plannerStatusOptions}
                              onChange={() => undefined}
                              onConfirm={(newStatus) =>
                                handleSubmittedPlanStatusChange(plan.id, newStatus)
                              }
                            />
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: statusMeta.dotColor }}
                                aria-hidden="true"
                              />
                              <span>{plan.planStatus}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 font-semibold text-xs flex items-center justify-center shrink-0"
                              aria-hidden="true"
                            >
                              {getPlannerInitials(plan.plannerName)}
                            </span>
                            <span
                              className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]"
                              title={plan.plannerName}
                            >
                              {plan.plannerName}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {submittedPlans.length >= SUBMITTED_PLANS_PER_PAGE ? (
              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-2">
                <Pagination
                  currentPage={submittedPlansPage}
                  totalItems={submittedPlans.length}
                  itemsPerPage={SUBMITTED_PLANS_PER_PAGE}
                  onPageChange={setSubmittedPlansPage}
                />
              </div>
            ) : null}
          </>
        )}
      </section>

      {isCardVisible('planner', 'planner.assigned-briefs') ? (
        <section className="dashboard-section-block">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="dashboard-section-block__title mb-0">My Assigned Briefs</h3>
            <button
              type="button"
              className="a-tag-button"
              onClick={() => navigate('/brief/log')}
            >
              View All
            </button>
          </div>

          <div className="dashboard-planner-briefs">
            {briefsLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="dashboard-planner-brief dashboard-planner-brief--skeleton animate-pulse"
                  aria-hidden="true"
                >
                  <div className="dashboard-planner-brief__header">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </div>
                  <div className="dashboard-planner-brief__body">
                    <div className="dashboard-planner-brief__meta space-y-2.5">
                      <div className="w-3/4 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-1/2 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-2/3 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-1/3 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="dashboard-planner-brief__aside">
                      <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))
            ) : briefsError ? (
              <div className="dashboard-error-state col-span-full">{briefsError}</div>
            ) : assignedBriefs.length === 0 ? (
              <div className="dashboard-empty-state col-span-full">No assigned briefs found.</div>
            ) : (
              assignedBriefs.map(renderBriefCard)
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default PlannerDashboard;

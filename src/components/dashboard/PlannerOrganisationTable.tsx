import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Timer } from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import type { PlannerChartOrganisationRow } from '../../services/DashboardCharts';
import { formatAssignmentDays, formatCount, formatCurrency } from '../../utils/dashboardFormat';

type PlannerOrganisationTableProps = {
  rows: PlannerChartOrganisationRow[];
  loading?: boolean;
};

const PlannerOrganisationTable: React.FC<PlannerOrganisationTableProps> = ({
  rows,
  loading = false,
}) => {
  const { totalBriefs, totalBudget, totalAssignedPlans } = useMemo(() => {
    let briefs = 0;
    let budget = 0;
    let assignedPlans = 0;
    for (const row of rows) {
      briefs += Number(row.briefs) || 0;
      budget += Number(row.briefBudget) || 0;
      assignedPlans += Number(row.assignedPlans) || 0;
    }
    return {
      totalBriefs: briefs,
      totalBudget: budget,
      totalAssignedPlans: assignedPlans,
    };
  }, [rows]);

  return (
    <section className="dashboard-planner-org-panel" aria-label="Organisation Planner Summary">
      <div className="dashboard-planner-org-panel__header">
        <div className="dashboard-planner-org-panel__title-wrap">
          <div className="dashboard-planner-org-panel__icon-badge" aria-hidden="true">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="dashboard-planner-org-panel__title">Organisation Planner Summary</h3>
            <p className="dashboard-planner-org-panel__subtitle">
              Briefs, budget, and plans assigned by organisation.
            </p>
          </div>
        </div>

        {!loading && rows.length > 0 ? (
          <div className="dashboard-planner-org-panel__stats">
            <span className="dashboard-planner-org-chip">
              <span className="dashboard-planner-org-chip__value">{rows.length}</span>
              <span>Organisations</span>
            </span>
            <span className="dashboard-planner-org-chip">
              <span className="dashboard-planner-org-chip__value dashboard-planner-org-chip__value--emerald">
                {formatCurrency(totalBudget)}
              </span>
              <span>Total Budget</span>
            </span>
            <span className="dashboard-planner-org-chip">
              <span className="dashboard-planner-org-chip__value dashboard-planner-org-chip__value--blue">
                {formatCount(totalAssignedPlans)}
              </span>
              <span>Plans Assigned</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="dashboard-planner-org-table-wrap">
        <table className="dashboard-planner-org-table">
          <thead>
            <tr>
              <th scope="col">Organisation</th>
              <th scope="col">Briefs</th>
              <th scope="col">Budget</th>
              <th scope="col">Plans Assigned</th>
              <th scope="col">Avg. Planning Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map((idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </td>
                  <td>
                    <div className="h-5 w-10 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  </td>
                  <td>
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  </td>
                  <td>
                    <div className="h-5 w-10 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  </td>
                  <td>
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="dashboard-planner-org-table__empty">
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No organisation planner data
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      No records found for the selected filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.organisationId}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40 flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </span>
                      {row.organisationId ? (
                        <Link
                          className="dashboard-planner-org-table__org-link group"
                          aria-label={`Open organisation planner for ${row.organisationName}`}
                          to={ROUTES.DASHBOARD_ORGANISATION_PLANNER(
                            row.organisationId,
                            row.organisationName,
                          )}
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {row.organisationName}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-all shrink-0" />
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {row.organisationName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                      {formatCount(row.briefs)}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 font-mono">
                      {formatCurrency(row.briefBudget)}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/50">
                      {formatCount(row.assignedPlans)}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <Timer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatAssignmentDays(row.avgAssignmentDays)}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && rows.length > 1 ? (
            <tfoot>
              <tr>
                <td>
                  <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total ({rows.length} Orgs)
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                    {formatCount(totalBriefs)}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-mono">
                    {formatCurrency(totalBudget)}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                    {formatCount(totalAssignedPlans)}
                  </span>
                </td>
                <td className="text-slate-400 dark:text-slate-500 text-xs">—</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
};

export default PlannerOrganisationTable;

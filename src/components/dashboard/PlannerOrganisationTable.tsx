import React from 'react';
import type { PlannerChartOrganisationRow } from '../../services/DashboardCharts';
import { formatCount, formatCurrency } from '../../utils/dashboardFormat';

type PlannerOrganisationTableProps = {
  rows: PlannerChartOrganisationRow[];
  loading?: boolean;
};

function formatDays(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} days`;
}

const PlannerOrganisationTable: React.FC<PlannerOrganisationTableProps> = ({ rows, loading = false }) => {
  return (
    <div className="dashboard-section-block">
      <div className="dashboard-section-block__header">
        <h3 className="dashboard-section-block__title mb-0">Organisation Planner Summary</h3>
        <p className="dashboard-section-block__subtitle">
          Plans assigned and average time from plan assignment to submission by organisation.
        </p>
      </div>

      <div className="dashboard-planner-org-table-wrap">
        <table className="dashboard-planner-org-table">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Briefs</th>
              <th>Budget</th>
              <th>Plans Assigned</th>
              <th>Avg Plan Submission Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="dashboard-planner-org-table__empty">
                  Loading organisation planner data…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="dashboard-planner-org-table__empty">
                  No organisation planner data for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.organisationId}>
                  <td>{row.organisationName}</td>
                  <td>{formatCount(row.briefs)}</td>
                  <td>{formatCurrency(row.briefBudget)}</td>
                  <td>{formatCount(row.assignedPlans)}</td>
                  <td>{formatDays(row.avgAssignmentDays)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlannerOrganisationTable;

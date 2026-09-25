import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import type { PlannerChartOrganisationRow } from '../../services/DashboardCharts';
import { formatAssignmentDays, formatCount, formatCurrency } from './chartShared';

type PlannerOrganisationTableProps = {
  rows: PlannerChartOrganisationRow[];
  loading?: boolean;
};

const PlannerOrganisationTable: React.FC<PlannerOrganisationTableProps> = ({ rows, loading = false }) => {
  return (
    <div className="dashboard-section-block">
      <div className="dashboard-section-block__header">
        <h3 className="dashboard-section-block__title mb-0">Organisation Planner Summary</h3>
        <p className="dashboard-section-block__subtitle">
          Briefs, budget, and plans assigned by organisation.
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
              <th>Avg. Planning Time</th>
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
                  <td>
                    {row.organisationId ? (
                      <Link
                        className="dashboard-planner-org-table__org-link"
                        aria-label={`Open organisation planner for ${row.organisationName}`}
                        to={ROUTES.DASHBOARD_ORGANISATION_PLANNER(
                          row.organisationId,
                          row.organisationName,
                        )}
                      >
                        {row.organisationName}
                      </Link>
                    ) : (
                      row.organisationName
                    )}
                  </td>
                  <td>{formatCount(row.briefs)}</td>
                  <td>{formatCurrency(row.briefBudget)}</td>
                  <td>{formatCount(row.assignedPlans)}</td>
                  <td>{formatAssignmentDays(row.avgAssignmentDays)}</td>
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

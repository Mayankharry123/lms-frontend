import { useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Fragment, type ReactNode, useMemo } from 'react';
import { useState } from 'react';
import { BarChart3, Filter, Search, Users, X } from 'lucide-react';

import PageBackHeader from '../../components/ui/PageBackHeader';
import { useApiQuery } from '../../hooks/useApiQuery';
import {
  getCallStatuses,
  getChildUsersByOrganisation,
  getLeadPerformance,
  getPriorities,
  getStatuses,
  type LeadPerformanceFilters,
} from '../../services/DashboardCharts';
import type { RootState } from '../../redux/store';
import { getUserOrganisationIds } from '../../utils/dashboardUserScope';
import '../../components/dashboard/dashboard.css';

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

const EMPTY_LEAD_FILTERS: Required<LeadPerformanceFilters> = {
  callStatus: '',
  leadStatus: '',
  priority: '',
};

export default function ZoneLeadPerformanceDetail() {
  const navigate = useNavigate();
  const { zoneId = '' } = useParams<{ zoneId: string }>();
  const [searchParams] = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const organisationIds = searchParams.getAll('organisation_id[]').length > 0
    ? searchParams.getAll('organisation_id[]')
    : getUserOrganisationIds(user);
  const zoneName = searchParams.get('zone_name') || `Zone ${zoneId}`;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadFilterDraft, setLeadFilterDraft] = useState(EMPTY_LEAD_FILTERS);
  const [appliedLeadFilters, setAppliedLeadFilters] = useState(EMPTY_LEAD_FILTERS);
  const [isLeadFilterOpen, setIsLeadFilterOpen] = useState(false);
  const usersQuery = useApiQuery(
    () => getChildUsersByOrganisation(organisationIds, { zoneIds: [zoneId] }),
    ['zone-users', zoneId, organisationIds.join(',')],
    { enabled: Boolean(zoneId) && organisationIds.length > 0 },
  );
  const agents = usersQuery.data ?? [];
  const nestedUserIds = new Set<string>();
  const collectNestedUserIds = (users: typeof agents) => {
    users.forEach((agent) => {
      agent.children?.forEach((child) => {
        nestedUserIds.add(child.userId);
        collectNestedUserIds([child]);
      });
    });
  };
  collectNestedUserIds(agents);

  const rootAgents = agents.filter((agent) => !nestedUserIds.has(agent.userId));
  const flattenAgents = (users: typeof agents): typeof agents =>
    users.flatMap((agent) => [agent, ...flattenAgents(agent.children ?? [])]);
  const hierarchyAgents = flattenAgents(rootAgents);
  const activeAgents = hierarchyAgents.length;
  const assignedLeads = hierarchyAgents.reduce(
    (total, agent) => total + (agent.leadCount ?? agent.leads.length),
    0,
  );
  const selectedAgent = hierarchyAgents.find((agent) => agent.userId === selectedUserId) ?? null;
  const selectedLeadsQuery = useApiQuery(
    () => getLeadPerformance(selectedUserId ?? '', appliedLeadFilters),
    ['selected-user-leads', selectedUserId, appliedLeadFilters.callStatus, appliedLeadFilters.leadStatus, appliedLeadFilters.priority],
    { enabled: selectedUserId !== null },
  );
  const callStatusOptionsQuery = useApiQuery(getCallStatuses, ['selected-user-call-statuses'], { enabled: selectedAgent !== null });
  const leadStatusOptionsQuery = useApiQuery(getStatuses, ['selected-user-lead-statuses'], { enabled: selectedAgent !== null });
  const priorityOptionsQuery = useApiQuery(getPriorities, ['selected-user-priorities'], { enabled: selectedAgent !== null });
  const selectedLeads = useMemo(() => selectedLeadsQuery.data ?? [], [selectedLeadsQuery.data]);
  const callStatusOptions = callStatusOptionsQuery.data?.map((option) => ({ value: option.id, label: option.name })) ?? [];
  const leadStatusOptions = leadStatusOptionsQuery.data?.map((option) => ({ value: option.id, label: option.name })) ?? [];
  const priorityOptions = priorityOptionsQuery.data?.map((option) => ({ value: option.id, label: option.name })) ?? [];
  const visibleSelectedLeads = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();
    return selectedLeads.filter((lead) => {
      const matchesSearch = !query
        || lead.contactPerson.toLowerCase().includes(query)
        || lead.leadStatus.toLowerCase().includes(query)
        || lead.callStatus.toLowerCase().includes(query)
        || lead.priority.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [leadSearch, selectedLeads]);
  const renderAgentRows = (agent: (typeof agents)[number], depth = 0): ReactNode => {
    const leads = agent.leadCount ?? agent.leads.length;
    return (
      <Fragment key={`${agent.userId}-${depth}`}>
        <tr
          className={`${leads > 0 ? 'has-leads ' : ''}${selectedUserId === agent.userId ? 'is-selected' : ''}`}
          onClick={() => {
            setSelectedUserId(agent.userId);
            setLeadSearch('');
            setLeadFilterDraft(EMPTY_LEAD_FILTERS);
            setAppliedLeadFilters(EMPTY_LEAD_FILTERS);
            setIsLeadFilterOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setSelectedUserId(agent.userId);
              setLeadSearch('');
              setLeadFilterDraft(EMPTY_LEAD_FILTERS);
              setAppliedLeadFilters(EMPTY_LEAD_FILTERS);
              setIsLeadFilterOpen(false);
            }
          }}
          tabIndex={0}
          aria-selected={selectedUserId === agent.userId}
        >
          <td>
            <div
              className={`dashboard-zone-detail__user ${depth > 0 ? 'is-child' : ''}`}
              style={depth > 1 ? { paddingLeft: `${depth * 1.25}rem` } : undefined}
            >
              {depth > 0 ? <span className="dashboard-zone-detail__tree">↳</span> : null}
              <span className="dashboard-zone-detail__avatar">{initials(agent.userName)}</span>
              <span><strong>{agent.userName}</strong></span>
            </div>
          </td>
          <td>{agent.email}</td>
          <td>
            <span className={`dashboard-zone-detail__lead-badge ${leads > 0 ? 'has-leads' : ''}`}>
              {leads} {leads === 1 ? 'Lead' : 'Leads'}{leads > 0 ? ' Active' : ''}
            </span>
          </td>
        </tr>
        {agent.children?.map((child) => renderAgentRows(child, depth + 1))}
      </Fragment>
    );
  };

  return (
    <main className="dashboard-zone-detail">
      <PageBackHeader
        onBack={() => navigate(-1)}
        title={zoneName}
        showTitle={false}
        backLabel="Back"
        className="dashboard-zone-detail__back-header"
      />

      <div className="dashboard-zone-detail__intro" aria-hidden="true" />

      <div className="dashboard-zone-detail__stats">
        <div className="dashboard-zone-detail__stat-card">
          <span className="dashboard-zone-detail__stat-icon dashboard-zone-detail__stat-icon--blue"><Users /></span>
          <div><span>ACTIVE DIVISION AGENTS</span><strong>{activeAgents} Users</strong></div>
        </div>
        <div className="dashboard-zone-detail__stat-card">
          <span className="dashboard-zone-detail__stat-icon dashboard-zone-detail__stat-icon--orange"><Users /></span>
          <div><span>TOTAL ACTIVE LEADS</span><strong>{assignedLeads} Assigned</strong></div>
        </div>
      </div>

      <div className={`dashboard-zone-detail__content ${selectedAgent ? 'has-selection' : ''}`}>
        <div className="dashboard-zone-detail__table-wrap">
          <table className="dashboard-zone-detail__table">
            <thead><tr><th scope="col">User</th><th scope="col">Email</th><th scope="col">Assigned Leads</th></tr></thead>
            <tbody>
              {rootAgents.map((agent) => renderAgentRows(agent))}
            </tbody>
          </table>
          {usersQuery.loading ? <div className="dashboard-zone-detail__empty">Loading users...</div> : null}
          {!usersQuery.loading && usersQuery.error ? <div className="dashboard-zone-detail__empty">{usersQuery.error}</div> : null}
          {!usersQuery.loading && !usersQuery.error && agents.length === 0 ? <div className="dashboard-zone-detail__empty">No users found for this zone.</div> : null}
        </div>

        {selectedAgent ? (
          <aside className="dashboard-zone-detail__details" aria-label={`Lead details for ${selectedAgent.userName}`}>
            <div className="dashboard-zone-detail__details-header">
              <div>
                <span className="dashboard-zone-detail__details-eyebrow">SELECTED USER</span>
                <h2>{selectedAgent.userName}</h2>
                <p>{selectedAgent.email || 'No email available'}</p>
              </div>
              <button
                type="button"
                className="dashboard-zone-detail__details-close"
                onClick={() => {
                  setSelectedUserId(null);
                  setLeadSearch('');
                  setLeadFilterDraft(EMPTY_LEAD_FILTERS);
                  setAppliedLeadFilters(EMPTY_LEAD_FILTERS);
                  setIsLeadFilterOpen(false);
                }}
                aria-label="Close user details"
                title="Close user details"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="dashboard-zone-detail__lead-toolbar">
              <label className="dashboard-zone-detail__lead-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search selected user leads</span>
                <input
                  type="search"
                  value={leadSearch}
                  onChange={(event) => setLeadSearch(event.target.value)}
                  placeholder="Search leads"
                />
              </label>
              <button
                type="button"
                className={`dashboard-zone-detail__filter-button ${isLeadFilterOpen || Object.values(appliedLeadFilters).some(Boolean) ? 'is-active' : ''}`}
                onClick={() => setIsLeadFilterOpen((open) => !open)}
                aria-label="Filter selected user leads"
                aria-expanded={isLeadFilterOpen}
                title="Filter leads"
              >
                <Filter aria-hidden="true" />
              </button>
            </div>

            {isLeadFilterOpen ? (
              <div className="dashboard-zone-detail__lead-filter">
                <div className="dashboard-zone-detail__lead-filter-header">
                  <div>
                    <strong>Filter User Leads</strong>
                    <span>Refine the selected user's lead details.</span>
                  </div>
                  <button type="button" onClick={() => setIsLeadFilterOpen(false)} aria-label="Close lead filters">
                    <X aria-hidden="true" />
                  </button>
                </div>
                <label htmlFor="zone-call-status-filter">Call Status</label>
                <select
                  id="zone-call-status-filter"
                  value={leadFilterDraft.callStatus}
                  onChange={(event) => setLeadFilterDraft((current) => ({ ...current, callStatus: event.target.value }))}
                >
                  <option value="">All</option>
                  {callStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <label htmlFor="zone-lead-status-filter">Lead Status</label>
                <select
                  id="zone-lead-status-filter"
                  value={leadFilterDraft.leadStatus}
                  onChange={(event) => setLeadFilterDraft((current) => ({ ...current, leadStatus: event.target.value }))}
                >
                  <option value="">All</option>
                  {leadStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <label htmlFor="zone-priority-filter">Priority</label>
                <select
                  id="zone-priority-filter"
                  value={leadFilterDraft.priority}
                  onChange={(event) => setLeadFilterDraft((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="">All</option>
                  {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className="dashboard-zone-detail__lead-filter-actions">
                  <button
                    type="button"
                    className="dashboard-zone-detail__lead-filter-clear"
                    onClick={() => {
                      setLeadFilterDraft(EMPTY_LEAD_FILTERS);
                      setAppliedLeadFilters(EMPTY_LEAD_FILTERS);
                    }}
                  >
                    Clear filters
                  </button>
                  <button
                    type="button"
                    className="dashboard-zone-detail__lead-filter-apply"
                    onClick={() => {
                      setAppliedLeadFilters(leadFilterDraft);
                      setIsLeadFilterOpen(false);
                    }}
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            ) : null}

            {selectedLeadsQuery.loading ? <div className="dashboard-zone-detail__details-state">Loading lead performance...</div> : null}
            {!selectedLeadsQuery.loading && selectedLeadsQuery.error ? <div className="dashboard-zone-detail__details-state">{selectedLeadsQuery.error}</div> : null}
            {!selectedLeadsQuery.loading && !selectedLeadsQuery.error ? (
              <>
                <div className="dashboard-zone-detail__lead-panel">
                  <div className="dashboard-zone-detail__lead-panel-header">
                    <h3>Lead performance</h3>
                    <BarChart3 aria-hidden="true" />
                  </div>
                  {selectedLeads.length === 0 ? <p className="dashboard-zone-detail__details-state">No lead performance found.</p> : null}
                  {selectedLeads.length > 0 && visibleSelectedLeads.length === 0 ? <p className="dashboard-zone-detail__details-state">No leads match your search.</p> : null}
                  {visibleSelectedLeads.map((lead) => (
                    <div className="dashboard-zone-detail__lead-item" key={lead.leadId}>
                      <div>
                        <strong>{lead.contactPerson}</strong>
                        <span>{lead.leadStatus}</span>
                      </div>
                      <div className="dashboard-zone-detail__lead-item-meta">
                        <span>{lead.callStatus}</span>
                        <b>{lead.priority}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
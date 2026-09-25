import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, ClipboardList, Timer, Users, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PageBackHeader from '../../components/ui/PageBackHeader';
import { ROUTES } from '../../constants/routes';
import { useApiQuery } from '../../hooks/useApiQuery';
import {
  loadAssignmentSubmissionDurations,
  loadOrganisationChildPlanningUsers,
} from '../../services/OrganisationPlanner';
import type { AssignmentSubmissionCycle, ChildPlanningUser } from '../../types/user/user.types';
import '../../components/dashboard/dashboard.css';

function userInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

function collectUniqueUsers(users: ChildPlanningUser[], seen = new Map<number, ChildPlanningUser>()) {
  users.forEach((user) => {
    if (!seen.has(user.id)) seen.set(user.id, user);
    collectUniqueUsers(user.children, seen);
  });
  return seen;
}

function PlannerUserRows({
  user,
  depth,
  nodeKey,
  selectedUserId,
  onSelect,
}: {
  user: ChildPlanningUser;
  depth: number;
  nodeKey: string;
  selectedUserId: number | null;
  onSelect: (user: ChildPlanningUser) => void;
}): ReactNode {
  const hasChildren = user.children.length > 0;
  const [expanded, setExpanded] = useState(hasChildren);
  const briefLabel = `${user.assignedBriefCount} ${user.assignedBriefCount === 1 ? 'Brief' : 'Briefs'}`;
  const isSelected = selectedUserId === user.id;

  return (
    <Fragment>
      <tr
        className={`${user.assignedBriefCount > 0 ? 'has-leads ' : ''}${isSelected ? 'is-selected' : ''}`}
        onClick={() => onSelect(user)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(user);
          }
        }}
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <td>
          <div
            className={`dashboard-zone-detail__user ${depth > 0 ? 'is-child' : ''}`}
            style={depth > 1 ? { paddingLeft: `${(depth - 1) * 1.25}rem` } : undefined}
          >
            {hasChildren ? (
              <button
                type="button"
                className="organisation-planner__toggle"
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${user.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded((open) => !open);
                }}
              >
                {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
              </button>
            ) : (
              <span className="organisation-planner__toggle-spacer" aria-hidden="true" />
            )}
            {depth > 0 ? <span className="dashboard-zone-detail__tree">↳</span> : null}
            <span className="dashboard-zone-detail__avatar" aria-hidden="true">{userInitial(user.name)}</span>
            <span><strong>{user.name}</strong></span>
          </div>
        </td>
        <td>
          <span className={`dashboard-zone-detail__lead-badge ${user.assignedBriefCount > 0 ? 'has-leads' : ''}`}>
            {briefLabel}{user.assignedBriefCount > 0 ? ' Assigned' : ''}
          </span>
        </td>
      </tr>
      {hasChildren && expanded
        ? user.children.map((child, index) => (
          <PlannerUserRows
            key={`${nodeKey}-${child.id}-${index}`}
            user={child}
            depth={depth + 1}
            nodeKey={`${nodeKey}-${child.id}-${index}`}
            selectedUserId={selectedUserId}
            onSelect={onSelect}
          />
        ))
        : null}
    </Fragment>
  );
}

export default function OrganisationPlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const organisationId = searchParams.get('organisation_id')?.trim() ?? '';
  const organisationName = searchParams.get('organisation_name')?.trim() ?? '';
  const displayName = organisationName || (organisationId ? `Organisation ${organisationId}` : 'Organisation');

  const plannerQuery = useApiQuery(
    () => loadOrganisationChildPlanningUsers(organisationId),
    [organisationId],
    { enabled: organisationId.length > 0 },
  );

  const [selectedUser, setSelectedUser] = useState<ChildPlanningUser | null>(null);

  useEffect(() => {
    setSelectedUser(null);
  }, [organisationId]);
  const result = plannerQuery.loading ? null : plannerQuery.data;
  const users = result?.status === 'success' ? result.users : [];
  const uniqueUsers = collectUniqueUsers(users);
  const assignedBriefs = [...uniqueUsers.values()].reduce((total, user) => total + user.assignedBriefCount, 0);
  const [durationCycles, setDurationCycles] = useState<AssignmentSubmissionCycle[]>([]);
  const [durationUserName, setDurationUserName] = useState('');
  const [durationPage, setDurationPage] = useState({ current: 1, last: 1 });
  const [durationsLoading, setDurationsLoading] = useState(false);
  const [durationsLoadingMore, setDurationsLoadingMore] = useState(false);
  const [durationsError, setDurationsError] = useState<{ kind: 'api_error' | 'api_failure'; message: string } | null>(null);
  const durationRequestRef = useRef(0);
  const durationListRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const loadDurationPage = useCallback(async (userId: number, page: number, append: boolean) => {
    const requestId = append ? durationRequestRef.current : ++durationRequestRef.current;
    if (!append) {
      setDurationsLoading(true);
      setDurationsError(null);
      setDurationCycles([]);
    } else {
      loadingMoreRef.current = true;
      setDurationsLoadingMore(true);
    }

    const result = await loadAssignmentSubmissionDurations(userId, page);
    if (requestId !== durationRequestRef.current) return;

    if (result.status !== 'success') {
      loadingMoreRef.current = false;
      setDurationsLoading(false);
      setDurationsLoadingMore(false);
      if (!append) {
        setDurationsError({ kind: result.status, message: result.message });
      }
      return;
    }

    setDurationUserName(result.userName);
    setDurationPage({ current: result.currentPage, last: result.lastPage });
    setDurationCycles((current) => (append ? [...current, ...result.cycles] : result.cycles));
    if (append && result.cycles.length === 0) {
      setDurationPage({ current: result.currentPage, last: result.currentPage });
    }
    setDurationsError(null);
    setDurationsLoading(false);
    setDurationsLoadingMore(false);
    loadingMoreRef.current = false;
  }, []);

  const selectedUserId = selectedUser?.id ?? null;

  useEffect(() => {
    if (selectedUserId == null) {
      durationRequestRef.current += 1;
      setDurationCycles([]);
      setDurationUserName('');
      setDurationPage({ current: 1, last: 1 });
      setDurationsError(null);
      setDurationsLoading(false);
      setDurationsLoadingMore(false);
      loadingMoreRef.current = false;
      return;
    }

    void loadDurationPage(selectedUserId, 1, false);
  }, [loadDurationPage, selectedUserId]);

  const loadNextDurationPage = useCallback(() => {
    if (!selectedUser || loadingMoreRef.current || durationsLoading) return;
    if (durationPage.current >= durationPage.last) return;
    void loadDurationPage(selectedUser.id, durationPage.current + 1, true);
  }, [durationPage, durationsLoading, loadDurationPage, selectedUser]);

  const handleDurationScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom <= 48) loadNextDurationPage();
  };

  useEffect(() => {
    const element = durationListRef.current;
    if (!element || durationsLoading || durationsLoadingMore) return;
    if (durationPage.current >= durationPage.last) return;
    if (element.scrollHeight <= element.clientHeight + 8) loadNextDurationPage();
  }, [durationCycles.length, durationPage, durationsLoading, durationsLoadingMore, loadNextDurationPage]);

  const renderTableBody = () => {
    if (!organisationId) {
      return (
        <tr>
          <td colSpan={2} className="dashboard-zone-detail__empty">
            Select an organisation from the Organisation Planner Summary.
          </td>
        </tr>
      );
    }

    if (plannerQuery.loading) {
      return (
        <tr>
          <td colSpan={2} className="dashboard-zone-detail__empty">Loading organisation planner...</td>
        </tr>
      );
    }

    if (plannerQuery.error || result?.status === 'api_failure') {
      const message = result?.status === 'api_failure'
        ? result.message
        : 'Unable to reach the organisation planner service. Please try again.';

      return (
        <tr>
          <td colSpan={2} className="dashboard-zone-detail__empty organisation-planner__message organisation-planner__message--failure">
            <p role="alert">{message}</p>
            <button type="button" className="organisation-planner__retry" onClick={() => void plannerQuery.refetch()}>
              Try again
            </button>
          </td>
        </tr>
      );
    }

    if (result?.status === 'api_error') {
      return (
        <tr>
          <td colSpan={2} className="dashboard-zone-detail__empty organisation-planner__message organisation-planner__message--error">
            <p role="alert">{result.message}</p>
            <button type="button" className="organisation-planner__retry" onClick={() => void plannerQuery.refetch()}>
              Try again
            </button>
          </td>
        </tr>
      );
    }

    if (users.length === 0) {
      return (
        <tr>
          <td colSpan={2} className="dashboard-zone-detail__empty">
            No planning users found for {displayName}.
          </td>
        </tr>
      );
    }

    return users.map((user, index) => (
      <PlannerUserRows
        key={`${user.id}-${index}`}
        user={user}
        depth={0}
        nodeKey={`${user.id}-${index}`}
        selectedUserId={selectedUser?.id ?? null}
        onSelect={setSelectedUser}
      />
    ));
  };

  const renderDurationCard = () => {
    if (!selectedUser) return null;

    const briefLabel = `${selectedUser.assignedBriefCount} ${selectedUser.assignedBriefCount === 1 ? 'Brief' : 'Briefs'}`;

    return (
      <aside className="dashboard-zone-detail__details" aria-label={`Assignment durations for ${selectedUser.name}`}>
        <div className="dashboard-zone-detail__details-header">
          <div>
            <span className="dashboard-zone-detail__details-eyebrow">SELECTED USER</span>
            <h2>{durationUserName || selectedUser.name}</h2>
            <p>{briefLabel} assigned</p>
          </div>
          <button
            type="button"
            className="dashboard-zone-detail__details-close"
            onClick={() => setSelectedUser(null)}
            aria-label="Close user details"
            title="Close user details"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        {durationsLoading ? (
          <div className="dashboard-zone-detail__details-state">Loading assignment submission durations...</div>
        ) : null}

        {!durationsLoading && durationsError ? (
          <div
            className={`dashboard-zone-detail__details-state ${durationsError.kind === 'api_error' ? 'organisation-planner__message--error' : 'organisation-planner__message--failure'}`}
            role="alert"
          >
            <p>{durationsError.message}</p>
            <button
              type="button"
              className="organisation-planner__retry"
              onClick={() => void loadDurationPage(selectedUser.id, 1, false)}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!durationsLoading && !durationsError ? (
          <div className="dashboard-zone-detail__lead-panel organisation-planner__cycles">
            <div className="dashboard-zone-detail__lead-panel-header">
              <h3>Assignment submission durations</h3>
              <Timer aria-hidden="true" />
            </div>
            <div
              className="organisation-planner__cycles-scroll"
              ref={durationListRef}
              onScroll={handleDurationScroll}
            >
              {durationCycles.length === 0 ? (
                <p className="dashboard-zone-detail__details-state">No assignment submission durations found.</p>
              ) : null}
              {durationCycles.map((cycle, index) => (
                <div className="dashboard-zone-detail__lead-item" key={`${cycle.briefId}-${cycle.assignedAt}-${index}`}>
                  <div>
                    <strong>{cycle.briefName}</strong>
                    <span>Assigned: {cycle.assignedAt}</span>
                    <span>Submitted: {cycle.planSubmittedAt ?? 'Not submitted'}</span>
                  </div>
                  <div className="dashboard-zone-detail__lead-item-meta">
                    <b className={cycle.duration ? undefined : 'organisation-planner__duration--pending'}>
                      {cycle.duration ?? 'Pending'}
                    </b>
                  </div>
                </div>
              ))}
              {durationsLoadingMore ? (
                <p className="dashboard-zone-detail__details-state">Loading more...</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    );
  };

  return (
    <main className="dashboard-zone-detail organisation-planner">
      <PageBackHeader
        onBack={() => navigate(ROUTES.DASHBOARD)}
        title="Organisation Planner"
        showTitle={false}
        backLabel="Back"
        className="dashboard-zone-detail__back-header"
      />

      <div className="dashboard-zone-detail__intro">
        <div className="dashboard-zone-detail__title-row">
          <h1>Organisation Planner</h1>
          <span>{displayName}</span>
        </div>
      </div>

      <div className="dashboard-zone-detail__stats">
        <div className="dashboard-zone-detail__stat-card">
          <span className="dashboard-zone-detail__stat-icon dashboard-zone-detail__stat-icon--blue"><Users /></span>
          <div><span>PLANNING USERS</span><strong>{uniqueUsers.size} Users</strong></div>
        </div>
        <div className="dashboard-zone-detail__stat-card">
          <span className="dashboard-zone-detail__stat-icon dashboard-zone-detail__stat-icon--orange"><ClipboardList /></span>
          <div><span>ASSIGNED BRIEFS</span><strong>{assignedBriefs} Assigned</strong></div>
        </div>
      </div>

      <div className={`dashboard-zone-detail__content ${selectedUser ? 'has-selection' : ''}`}>
        <div className="dashboard-zone-detail__table-wrap">
          <table className="dashboard-zone-detail__table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Assigned Briefs</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
        {renderDurationCard()}
      </div>
    </main>
  );
}

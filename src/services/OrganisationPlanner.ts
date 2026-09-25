import { ENDPOINTS } from '../constants/endpoints';
import type {
  AssignmentSubmissionCycle,
  AssignmentSubmissionLoadResult,
  ChildPlanningUser,
  OrganisationPlannerLoadResult,
} from '../types/user/user.types';
import { apiClient } from '../utils/apiClient';
import { extractErrorMessage } from '../utils/extractErrorMessage';

function normalizeChildPlanningUser(raw: unknown): ChildPlanningUser | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  if (record.id === undefined || record.id === null || record.id === '') return null;

  const id = Number(record.id);
  if (!Number.isFinite(id)) return null;

  const name = String(record.name ?? '').trim() || `User ${id}`;
  const assignedBriefCount = Number(record.assigned_brief_count ?? record.assignedBriefCount ?? 0);
  const children = Array.isArray(record.children)
    ? record.children
        .map(normalizeChildPlanningUser)
        .filter((child): child is ChildPlanningUser => child != null)
    : [];

  return {
    id,
    name,
    assignedBriefCount: Number.isFinite(assignedBriefCount) ? assignedBriefCount : 0,
    children,
  };
}

function isApiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const statusCode = Number((error as { statusCode?: number }).statusCode);
  const responseData = (error as { responseData?: { success?: boolean } }).responseData;

  if (responseData?.success === false) return true;
  return Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 500;
}

function isRequestFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (!(error instanceof Error)) return false;

  if (error.name === 'AbortError') return true;

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('request timeout') ||
    message.includes('service temporarily unavailable')
  );
}

function classifyOrganisationPlannerError(error: unknown): Exclude<OrganisationPlannerLoadResult, { status: 'success' }> {
  const statusCode =
    error && typeof error === 'object' ? Number((error as { statusCode?: number }).statusCode) : NaN;
  const serverMessage = extractErrorMessage(error);
  const failureMessage = 'Unable to reach the organisation planner service. Please try again.';

  if (Number.isFinite(statusCode) && statusCode >= 500) {
    return {
      status: 'api_failure',
      message: serverMessage && !serverMessage.startsWith('Request failed') ? serverMessage : failureMessage,
    };
  }

  if (isRequestFailure(error)) {
    return { status: 'api_failure', message: failureMessage };
  }

  if (isApiError(error) || error instanceof Error) {
    return {
      status: 'api_error',
      message: serverMessage || 'The organisation planner request could not be completed.',
    };
  }

  return { status: 'api_failure', message: failureMessage };
}

export async function loadOrganisationChildPlanningUsers(
  organisationId: string,
): Promise<OrganisationPlannerLoadResult> {
  const id = organisationId.trim();
  if (!id) {
    return { status: 'api_error', message: 'Organisation is required.' };
  }

  try {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.USERS.CHILD_PLANING_USERS_BY_ORGANISATION(id),
    );

    if (!res?.success) {
      return {
        status: 'api_error',
        message: res?.message || 'The organisation planner request could not be completed.',
      };
    }

    if (!Array.isArray(res.data)) {
      return {
        status: 'api_error',
        message: 'Organisation planner response was not in the expected format.',
      };
    }

    return {
      status: 'success',
      users: res.data
        .map(normalizeChildPlanningUser)
        .filter((user): user is ChildPlanningUser => user != null),
    };
  } catch (error) {
    return classifyOrganisationPlannerError(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function textOrNull(value: unknown) {
  if (value == null || value === '') return null;
  return String(value);
}

function normalizeAssignmentCycle(raw: unknown): AssignmentSubmissionCycle | null {
  if (!isRecord(raw)) return null;

  const briefId = Number(raw.brief_id ?? raw.briefId);
  if (!Number.isFinite(briefId)) return null;

  return {
    briefId,
    briefName: String(raw.brief_name ?? raw.briefName ?? '').trim() || `Brief ${briefId}`,
    assignedAt: textOrNull(raw.assigned_at ?? raw.assignedAt) ?? '-',
    planSubmittedAt: textOrNull(raw.plan_submitted_at ?? raw.planSubmittedAt),
    duration: textOrNull(raw.duration),
  };
}

function readPageNumber(value: unknown, fallback: number) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? page : fallback;
}

export async function loadAssignmentSubmissionDurations(
  userId: number,
  page = 1,
): Promise<AssignmentSubmissionLoadResult> {
  try {
    const params = new URLSearchParams();
    params.set('page', String(page));
    const res = await apiClient.get<unknown>(
      `${ENDPOINTS.USERS.ASSIGNMENT_SUBMISSION_DURATIONS(userId)}?${params.toString()}`,
    );

    if (!res?.success) {
      return {
        status: 'api_error',
        message: res?.message || 'Assignment submission durations could not be loaded.',
      };
    }

    const payload = isRecord(res.data) ? res.data : {};
    const cycles = Array.isArray(payload.assignment_cycles)
      ? payload.assignment_cycles
          .map(normalizeAssignmentCycle)
          .filter((cycle): cycle is AssignmentSubmissionCycle => cycle != null)
      : [];
    const pagination = (isRecord(res.meta?.pagination) ? res.meta.pagination : {}) as Record<string, unknown>;
    const currentPage = readPageNumber(pagination.current_page ?? pagination.page, page);
    const lastPage = readPageNumber(pagination.last_page ?? pagination.totalPages, currentPage);

    return {
      status: 'success',
      userName: String(payload.user_name ?? payload.userName ?? '').trim(),
      cycles,
      currentPage,
      lastPage,
    };
  } catch (error) {
    const classified = classifyOrganisationPlannerError(error);
    return {
      status: classified.status,
      message: classified.status === 'api_failure'
        ? 'Unable to reach assignment submission durations. Please try again.'
        : classified.message || 'Assignment submission durations could not be loaded.',
    };
  }
}

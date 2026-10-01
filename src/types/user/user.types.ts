export interface UserParent {
  id: number;
  name: string;
  email?: string;
}

export interface UserOrganisation {
  id?: number | string;
  name: string;
}

export interface UserDepartment {
  id?: number | string;
  name: string;
}

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  zone?: string;
  origination?: string;
  organisations?: UserOrganisation[];
  department?: string;
  departments?: UserDepartment[];
  role?: string;
  roles?: Array<{ id?: number | string; name?: string; display_name?: string; [key: string]: unknown }>;
  status?: 'Active' | 'Inactive';
  lastLogin?: string;
  created?: string;
  created_at_formatted?: string;
  last_login_at?: string;
  parent?: UserParent;
  parents?: UserParent[];
}

export type UserListResponse = {
  data: AppUser[];
  meta?: Record<string, unknown> & {
    pagination?: { total?: number };
    total?: number;
  };
};

/** User node from `/profile/child-planing-users`. */
export interface ChildPlanningUser {
  id: number;
  name: string;
  assignedBriefCount: number;
  children: ChildPlanningUser[];
}

export type OrganisationPlannerLoadResult =
  | { status: 'success'; users: ChildPlanningUser[] }
  | { status: 'api_error'; message: string }
  | { status: 'api_failure'; message: string };

export interface AssignmentSubmissionCycle {
  briefId: number;
  briefName: string;
  assignedAt: string;
  planSubmittedAt: string | null;
  duration: string | null;
}

export type AssignmentSubmissionLoadResult =
  | {
      status: 'success';
      userName: string;
      cycles: AssignmentSubmissionCycle[];
      currentPage: number;
      lastPage: number;
    }
  | { status: 'api_error'; message: string }
  | { status: 'api_failure'; message: string };

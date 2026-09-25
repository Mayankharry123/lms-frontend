/**
 * Central API path registry — import from here instead of hardcoding paths in services.
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    ME: '/auth/me',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id: string | number) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id: string | number) => `/users/${id}`,
    DELETE: (id: string | number) => `/users/${id}`,
    CHILD_USERS: '/profile/child-users',
    // Endpoint for fetching child users filtered by the planning department.
    CHILD_PLANING_USERS: '/profile/child-planing-users',
    CHILD_PLANING_USERS_BY_ORGANISATION: (organisationId: string | number) =>
      `/profile/child-planing-users?Organisation_Id=${encodeURIComponent(String(organisationId))}`,
    ASSIGNMENT_SUBMISSION_DURATIONS: (userId: string | number) =>
      `/users/${encodeURIComponent(String(userId))}/assignment-submission-durations`,
    CHILD_USERS_BY_MISS_CAMPAIGN: (id: string | number) =>
      `/profile/child-users-by-miss-campaign/${id}`,
    CHILD_USERS_BY_LEAD: (id: string | number) => `/profile/child-users-by-lead/${id}`,
    CHILD_PLANNERS_BY_LEAD: (id: string | number) => `/profile/child-planners-by-lead/${id}`,
    CHILD_USERS_BY_BRIEF: (id: string | number) => `/profile/child-users-by-brief/${id}`,
    CHILD_PLANNERS_BY_BRIEF: (id: string | number) => `/profile/child-planners-by-brief/${id}`,
    CHILD_USERS_FOR_BRIEF_CREATION: (id: string | number) =>
      `/profile/child-users-for-brief-creation/${id}`,
  },
  ROLES: {
    LIST: '/roles',
    DETAIL: (id: string | number) => `/roles/${id}`,
    CREATE: '/roles',
    UPDATE: (id: string | number) => `/roles/${id}`,
    DELETE: (id: string | number) => `/roles/${id}`,
    PERMISSION_TREE: '/permissions/all-permission-tree',
  },
  PERMISSIONS: {
    LIST: '/permissions',
    LIST_FLAT: '/permissions/list',
    SIDEBAR: '/permissions/sidebar',
    DETAIL: (id: string | number) => `/permissions/${id}`,
    CREATE: '/permissions',
    UPDATE: (id: string | number) => `/permissions/${id}`,
    DELETE: (id: string | number) => `/permissions/${id}`,
    ALL_TREE: '/permissions/all-permission-tree',
  },
  LEADS: {
    LIST: '/leads',
    // Endpoint for fetching lead contacts used in Brief creation.
    CONTACT_LIST: '/leads/list',
    DETAIL: (id: string | number) => `/leads/${id}`,
    CREATE: '/leads',
    UPDATE: (id: string | number) => `/leads/${id}`,
    DELETE: (id: string | number) => `/leads/${id}`,
    PENDING: '/leads/pending',
    ASSIGN: (id: string | number) => `/leads/${id}/assign`,
    CALL_STATUS: (id: string | number) => `/leads/${id}/call-status`,
    CHAT: (id: string | number) => `/leads/${encodeURIComponent(String(id))}/activity`,
    ASSIGN_HISTORY: (id: string | number) => `/leads/${encodeURIComponent(String(id))}/assign-history`,
    LATEST_MEETING: '/leads/latest/meeting-scheduled-two',
    LATEST_FOLLOW_UP: '/leads/latest/follow-up-two',
    LATEST_TWO: '/leads/latest/two-leads',
    ACTIVITY: '/leads/activity-leads',
    CONTACT_BY_BRAND: (brandId: string) =>
      `/leads/contact-persons/by-brand/${encodeURIComponent(brandId)}`,
    CONTACT_BY_AGENCY: (agencyId: string) =>
      `/leads/contact-persons/by-agency/${encodeURIComponent(agencyId)}`,
    CONTACT_DETAIL: (id: string) => `/leads/contact-persons/${encodeURIComponent(id)}`,
  },
  LEAD_TYPES: {
    LIST: '/lead-types/list',
    CREATE: '/lead-types',
  },
  LEAD_SOURCES: {
    LIST: '/lead-sources',
    SUB_LIST: '/lead-sub-sources',
    SUB_DETAIL: (id: string | number) => `/lead-sub-sources/${encodeURIComponent(String(id))}`,
    SUB_CREATE: '/lead-sub-sources',
    SUB_UPDATE: (id: string | number) => `/lead-sub-sources/${encodeURIComponent(String(id))}`,
    SUB_DELETE: (id: string | number) => `/lead-sub-sources/${encodeURIComponent(String(id))}`,
  },
  CALL_STATUSES: {
    LIST: '/call-statuses',
    PRIORITIES: (callStatusId: string | number) => `/call-statuses/${callStatusId}/priorities`,
  },
  PRIORITIES: {
    LIST: '/priorities',
    BRIEF_COUNT: (id: string | number) => `/priorities/${id}/brief-count`,
    LEAD_COUNT: (id: string | number) => `/priorities/${id}/lead-count`,
  },
  BRIEFS: {
    LIST: '/briefs',
    DETAIL: (id: string | number) => `/briefs/${id}`,
    CREATE: '/briefs',
    UPDATE: (id: string | number) => `/briefs/${id}`,
    DELETE: (id: string | number) => `/briefs/${id}`,
    LOGS: '/briefs/brief-logs',
    BUSINESS_FORECAST: '/briefs/business-forecast',
    LATEST_TWO: '/briefs/latest/two-briefs',
    RECENT: '/briefs/recent',
    STATUSES: '/brief-statuses',
  },
  PLANNERS: {
    UPDATE_STATUS: (plannerId: string | number) => `/planners/${plannerId}/update-status`,
    STATUSES: '/planner-statuses',
  },
  MISS_CAMPAIGNS: {
    LIST: '/miss-campaigns',
    DETAIL: (id: string | number) => `/miss-campaigns/${id}`,
    CREATE: '/miss-campaigns',
    UPDATE: (id: string | number) => `/miss-campaigns/${id}`,
    DELETE: (id: string | number) => `/miss-campaigns/${id}`,
    EXPORT: '/miss-campaigns/export',
  },
  MEETINGS: {
    LIST: '/meetings',
    DETAIL: (id: string | number) => `/meetings/${id}`,
    CREATE: '/meetings',
    UPDATE: (id: string | number) => `/meetings/${id}`,
    DELETE: (id: string | number) => `/meetings/${id}`,
  },
  BRANDS: {
    LIST: '/brands',
    LIST_FLAT: '/brands/list',
    DETAIL: (id: string | number) => `/brands/${encodeURIComponent(String(id))}`,
    CREATE: '/brands',
    UPDATE: (id: string | number) => `/brands/${encodeURIComponent(String(id))}`,
    DELETE: (id: string | number) => `/brands/${encodeURIComponent(String(id))}`,
    IMPORT: '/brands/import',
    IMPORT_TEMPLATE: '/brands/import-template',
    TYPES: {
      LIST: '/brand-types',
      DETAIL: (id: string | number) => `/brand-types/${id}`,
    },
  },
  AGENCIES: {
    LIST: '/agencies',
    LIST_FLAT: '/agencies/list',
    DETAIL: (id: string | number) => `/agencies/${encodeURIComponent(String(id))}`,
    CREATE: '/agencies',
    UPDATE: (id: string | number) => `/agencies/${encodeURIComponent(String(id))}`,
    DELETE: (id: string | number) => `/agencies/${encodeURIComponent(String(id))}`,
    TYPES: {
      LIST: '/agency-types',
      DETAIL: (id: string | number) => `/agency-types/${id}`,
    },
  },
  MASTER: {
    DEPARTMENTS: {
      LIST: '/departments',
      DETAIL: (id: string | number) => `/departments/${encodeURIComponent(String(id))}`,
      CREATE: '/departments',
      UPDATE: (id: string | number) => `/departments/${encodeURIComponent(String(id))}`,
      DELETE: (id: string | number) => `/departments/${encodeURIComponent(String(id))}`,
    },
    DESIGNATIONS: {
      LIST: '/designations',
      DETAIL: (id: string | number) => `/designations/${encodeURIComponent(String(id))}`,
      CREATE: '/designations',
      UPDATE: (id: string | number) => `/designations/${encodeURIComponent(String(id))}`,
      DELETE: (id: string | number) => `/designations/${encodeURIComponent(String(id))}`,
    },
    INDUSTRIES: {
      LIST: '/industries',
      LIST_FLAT: '/industries/list',
      DETAIL: (id: string | number) => `/industries/${encodeURIComponent(String(id))}`,
      CREATE: '/industries',
      UPDATE: (id: string | number) => `/industries/${encodeURIComponent(String(id))}`,
      DELETE: (id: string | number) => `/industries/${encodeURIComponent(String(id))}`,
    },
  },
  ORGANISATIONS: {
    LIST: '/organisations/list',
    ZONES: '/profile/organisation-zone',
  },
  MEDIA_TYPES: {
    LIST: '/media-types',
  },
  GEO: {
    ZONES: {
      LIST: '/zones',
      DETAIL: (id: string | number) => `/zones/${id}`,
    },
    CITIES: {
      LIST: '/cities/list',
      DETAIL: (id: string | number) => `/cities/${id}`,
    },
    STATES: {
      LIST: '/states/list',
      DETAIL: (id: string | number) => `/states/${id}`,
    },
    COUNTRIES: {
      LIST: '/countries/list',
      DETAIL: (id: string | number) => `/countries/${id}`,
    },
  },
  DASHBOARD: {
    STATS: '/dashboard',
    CHARTS: '/dashboard/charts',
    SALES_CHARTS: '/dashboard/sales-charts',
    PLANNER_CHARTS: '/dashboard/planner-charts',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    READ: (id: string | number) => `/notifications/${id}/read`,
    MARK_READ: '/notifications/mark-read',
    READ_ALL: '/notifications/read-all',
    CLEAR_ALL: '/notifications/clear-all',
  },
  INVENTORY: '/inventory',
  COURSES: {
    LIST: '/courses',
    DETAIL: (id: string | number) => `/courses/${id}`,
    CREATE: '/courses',
    UPDATE: (id: string | number) => `/courses/${id}`,
    DELETE: (id: string | number) => `/courses/${id}`,
    ENROLL: (id: string | number) => `/courses/${id}/enroll`,
  },
} as const;

/** @deprecated Use ENDPOINTS — kept for backward compatibility with constants/index.ts */
export const API_ENDPOINTS = {
  AUTH: ENDPOINTS.AUTH,
  PERMISSION: {
    ALL_TREE: ENDPOINTS.PERMISSIONS.ALL_TREE,
    LIST: ENDPOINTS.PERMISSIONS.LIST,
    CREATE: ENDPOINTS.PERMISSIONS.CREATE,
    DETAIL: ENDPOINTS.PERMISSIONS.DETAIL,
    UPDATE: ENDPOINTS.PERMISSIONS.UPDATE,
    DELETE: ENDPOINTS.PERMISSIONS.DELETE,
  },
  ROLE: {
    LIST: ENDPOINTS.ROLES.LIST,
    CREATE: ENDPOINTS.ROLES.CREATE,
    VIEW: ENDPOINTS.ROLES.LIST,
    DETAIL: ENDPOINTS.ROLES.DETAIL,
    UPDATE: ENDPOINTS.ROLES.UPDATE,
    DELETE: ENDPOINTS.ROLES.DELETE,
  },
  COURSES: ENDPOINTS.COURSES,
  USERS: {
    LIST: ENDPOINTS.USERS.LIST,
    DETAIL: ENDPOINTS.USERS.DETAIL,
    UPDATE: ENDPOINTS.USERS.UPDATE,
    DELETE: ENDPOINTS.USERS.DELETE,
  },
} as const;

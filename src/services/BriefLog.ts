import { apiClient } from '../utils/apiClient';

export interface ContactPerson {
  id: number;
  name: string;
  email?: string | null;
}

export interface NamedEntity {
  id: number;
  name: string;
}

export interface BriefLogItem {
  id: number;
  brief_id?: number;
  name: string;
  action?: string;
  description?: string;
  user_name?: string;
  product_name?: string;
  mode_of_campaign?: string;
  media_type?: string;
  budget?: string | number;
  comment?: string;
  submission_date?: string;
  status?: string | number;
  left_time?: string;
  contact_person?: ContactPerson | null;
  brand?: NamedEntity | null;
  agency?: NamedEntity | null;
  assigned_user?: NamedEntity | null;
  created_by_user?: NamedEntity | null;
  brief_status?: NamedEntity | null;
  priority?: NamedEntity | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export type BriefLogListResponse = {
  data: BriefLogItem[];
  meta?: any;
};

const ENDPOINTS = {
  LIST: '/briefs/brief-logs',
  DETAIL: (id: string | number) => `/briefs/${id}`,
};

/**
 * Fetch brief logs with optional pagination and filters
 * @param page page number (default 1)
 * @param perPage items per page (default 10)
 * @param filters additional query params
 */
export async function listBriefLogs(
  page = 1,
  perPage = 10,
  filters?: Record<string, any>
): Promise<BriefLogListResponse> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (filters) {
    Object.keys(filters).forEach((k) => {
      const v = filters[k];
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
  }

  try {
    const res = await apiClient.get<any>(`${ENDPOINTS.LIST}?${params.toString()}`);
    const items = (res.data || []) as BriefLogItem[];
    return { data: items, meta: res.meta };
  } catch (err) {
    console.error('Failed to fetch brief logs:', err);
    throw err;
  }
}

export async function getBriefById(id: string | number): Promise<BriefLogItem | null> {
  try {
    const res = await apiClient.get<any>(ENDPOINTS.DETAIL(id));
    return res.data as BriefLogItem;
  } catch (err) {
    console.error('Failed to fetch brief by id:', err);
    return null;
  }
}


/**
 * Fetch planner statuses for dropdown
 */
export async function getPlannerStatuses(): Promise<{ data: { id: number; name: string }[] }> {
  try {
    const res = await apiClient.get<any>('/planner-statuses');
    return { data: res.data || [] };
  } catch (err) {
    console.error('Failed to fetch planner statuses:', err);
    return { data: [] };
  }
}

export default {
  listBriefLogs,
  getBriefById,
  getPlannerStatuses,
};

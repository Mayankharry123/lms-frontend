import { apiClient } from '../utils/apiClient';
import { handleApiError } from '../utils/apiErrorHandler';

export interface EditUserPayload {
  name: string;
  email: string;
  phone?: string | null;
  zone?: string | null;
  zone_id?: string | null;
  zones?: number[];
  zone_ids?: number[];
  zone_name?: string | null;
  origination?: string | null;
  organisation_id?: string | null;
  organisation_ids?: number[];
  organisation_name?: string | null;
  department_ids?: number[];
  password?: string;
  password_confirmation?: string;
  role_ids?: number[];
  manager_ids?: number[];
  is_parent?: string;
}

export interface EditUserDetail {
  id: string | number;
  name: string;
  email: string;
  phone?: string | null;
  role_id?: number;
  role?: {
    id: string | number;
    name: string;
    description?: string;
  };
  roles?: Array<{
    id: string | number;
    name: string;
    description?: string;
  }>;
  managers?: Array<{
    id: string | number;
    name: string;
  }>;
  departments?: Array<{
    id: string | number;
    name: string;
  }>;
  department_ids?: number[];
  parent?: {
    id: string | number;
    name: string;
    email?: string;
  };
  // API may return a `parents` array (list of possible managers / parents)
  parents?: Array<{
    id: string | number;
    name: string;
    email?: string;
    // some responses include nested parents as an empty array
    parents?: any[];
  }>;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  // Optional formatted / human readable fields returned by API
  created_at_formatted?: string;
  updated_at_formatted?: string;
  created_at_human?: string;
  updated_at_human?: string;
  avatar_url?: string;
  full_name?: string;
}

const ENDPOINTS = {
  GET_USER: (id: string) => `/users/${id}`,
  UPDATE_USER: (id: string) => `/users/${id}`,
} as const;

async function handleResponse<T>(res: any): Promise<T> {
  if (!res) {
    const error = new Error('No response from server');
    try { handleApiError(error); } catch {
        // no action needed
    }
    throw error;
  }

  // Support axios-like responses where the useful payload is in `res.data`.
  const payload = res && typeof res === 'object' && 'data' in res ? res.data : res;

  if (!payload) {
    const error = new Error('Empty response payload');
    try { handleApiError(error); } catch {
        // no action needed
    }
    throw error;
  }

  // If API indicates failure explicitly
  if (payload.success === false) {
    const error = new Error(payload.message || 'Request failed');
    try { handleApiError(error); } catch {
        // no action needed
    }
    throw error;
  }

  // If the API wraps the result in `data`, return that, otherwise return payload itself.
  return (payload.data !== undefined ? payload.data : payload) as T;
}

/**
 * Fetch user details by ID for editing
 */
export async function getUserForEdit(id: string): Promise<EditUserDetail> {
  try {
    // Extract numeric ID only from any format
    const numericId = String(id).replace(/\D/g, '');

    console.log('Original ID:', id, 'Numeric ID:', numericId);

    const res = await apiClient.get<any>(ENDPOINTS.GET_USER(numericId));
    console.log('API Response:', res);

    const result = await handleResponse<EditUserDetail>(res);
    console.log('Parsed result:', result);
    return result;
  } catch (err: any) {
    console.error('Error fetching user for edit:', err);
    const error = new Error(err?.message || 'Failed to fetch user');
    try {
      handleApiError(error);
    } catch {
        // no action needed
    }
    throw error;
  }
}

/**
 * Update user details with multiple roles support
 */
export async function updateUserDetails(
  id: string,
  payload: EditUserPayload
): Promise<EditUserDetail> {
  try {
    // Extract numeric ID only from any format
    const numericId = String(id).replace(/\D/g, '');

    console.log('Updating user with ID:', numericId);

    // Build form-data payload
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('email', payload.email);
    if (payload.phone) formData.append('phone', payload.phone);
    if (payload.zone !== undefined && payload.zone !== null) formData.append('zone', String(payload.zone));
    if (payload.zone_id !== undefined && payload.zone_id !== null) formData.append('zone_id', String(payload.zone_id));
    if (payload.zones && Array.isArray(payload.zones)) {
      payload.zones.forEach((zoneId) => formData.append('zones[]', String(zoneId)));
    }
    if (payload.zone_ids && Array.isArray(payload.zone_ids)) {
      payload.zone_ids.forEach((zoneId) => formData.append('zone_ids[]', String(zoneId)));
    }
    if (payload.zone_name !== undefined && payload.zone_name !== null) formData.append('zone_name', String(payload.zone_name));
    if (payload.origination !== undefined && payload.origination !== null) formData.append('origination', String(payload.origination));
    if (payload.organisation_id !== undefined && payload.organisation_id !== null) formData.append('organisation_id', String(payload.organisation_id));
    if (payload.organisation_name !== undefined && payload.organisation_name !== null) formData.append('organisation_name', String(payload.organisation_name));
    if (payload.organisation_ids && Array.isArray(payload.organisation_ids)) {
      payload.organisation_ids.forEach((organisationId) => {
        formData.append('organisation_ids[]', String(organisationId));
      });
    }
    if (payload.department_ids !== undefined) {
      if (payload.department_ids.length === 0) {
        formData.append('department_ids[]', '');
      } else {
        payload.department_ids.forEach((departmentId) => {
          formData.append('department_ids[]', String(departmentId));
        });
      }
    }
    if (payload.password) formData.append('password', payload.password);
    if (payload.password_confirmation) formData.append('password_confirmation', payload.password_confirmation);
    if (payload.role_ids && Array.isArray(payload.role_ids)) {
      payload.role_ids.forEach((roleId) => {
        formData.append('role[]', String(roleId));
      });
    }
    // Attach manager/parent relationship as `is_parent[]` to match API expectations
    if (payload.manager_ids && Array.isArray(payload.manager_ids)) {
      payload.manager_ids.forEach((managerId) => {
        formData.append('is_parent[]', String(managerId));
      });
    } else if (payload.is_parent !== undefined && payload.is_parent !== null) {
      // If single value provided, send as an array element to be consistent
      formData.append('is_parent[]', String(payload.is_parent));
    }
    formData.append('_method', 'Put');

    // Use POST for method override
    const res = await apiClient.post<any>(ENDPOINTS.UPDATE_USER(numericId), formData);
    console.log('Update Response:', res);

    return await handleResponse<EditUserDetail>(res);
  } catch (err: any) {
    console.error('Error updating user:', err);
    const error = new Error(err?.message || 'Failed to update user');
    try {
      handleApiError(error);
    } catch {
        // no action needed
    }
    throw error;
  }
}

// --- API Response Types for /briefs/{id}/planners POST ---
export interface PlanFileInfo {
  path: string;
  url: string;
  name: string;
}

export interface PlanSubmissionResponseData {
  id: number;
  status: string;
  status_label: string;
  submitted_plan: PlanFileInfo[];
  submitted_plan_count: number;
  backup_plan?: string;
  backup_plan_url?: string;
  has_backup_plan: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanSubmissionResponse {
  success: boolean;
  message: string;
  meta: {
    timestamp: string;
    status_code: number;
  };
  data: PlanSubmissionResponseData;
}
/**
 * Uploads plan and backup files for a brief (Plan Submission)
 * @param briefId Brief ID (numeric)
 * @param planFiles Array of plan files (submitted_plan[])
 * @param backupFile Single backup plan file (backup_plan)
 */

export async function uploadPlanSubmission(
  briefId: number,
  planFiles: File[],
  backupFile?: File
): Promise<PlanSubmissionResponse> {
  const formData = new FormData();
  planFiles.forEach((file) => {
    formData.append('submitted_plan[]', file);
  });
  if (backupFile) {
    formData.append('backup_plan', backupFile);
  }

  const response = await api.customRequest<PlanSubmissionResponse>(
    `/briefs/${briefId}/planners`,
    { method: 'POST', data: formData }
  );
  return response.data;
}

/**
 * Uploads a single Excel cost sheet for a brief.
 * The brief id is sent in the URL and again as brief_id.
 */
export async function uploadCostSheet(
  briefId: number,
  file: File
): Promise<PlanSubmissionResponse> {
  const formData = new FormData();
  formData.append('brief_id', String(briefId));
  formData.append('cost_sheet', file);

  const response = await api.customRequest<PlanSubmissionResponse>(
    ENDPOINTS.BRIEFS.COST_SHEET(briefId),
    { method: 'POST', data: formData }
  );
  return response.data;
}

import api from './api';
import { ENDPOINTS } from '../constants/endpoints';

// TypeScript interfaces for API response
export interface BriefDetail {
  id: number;
  name: string;
  product_name: string;
  mode_of_campaign: string;
  media_type: string;
  budget: string;
  comment: string;
  submission_date: string;
  status: string;
  left_time?: string;
  contact_person?: {
    id: number;
    name: string;
    email: string | null;
  };
  brand: {
    id: number;
    name: string;
  };
  agency?: {
    id: number;
    name: string;
  };
  assigned_user: {
    id: number;
    name: string;
    email: string;
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
  };
  sales_user?: {
    id?: number;
    name?: string;
    email?: string;
  } | null;
  sales_person?: {
    id?: number;
    name?: string;
    email?: string;
  } | string | null;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
  brief_status?: {
    id: number;
    name: string;
    percentage?: string | null;
  };
  priority: {
    // Removed duplicate import statement
    name: string;
  };
  planner_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GetBriefByIdResponse {
  success: boolean;
  data: BriefDetail;
}

/**
 * Fetches brief details by ID
 * @param id Brief ID (numeric)
 * @returns BriefDetail object
 */
export async function getBriefById(id: number): Promise<BriefDetail> {
 const response = await api.customRequest<BriefDetail>(`/briefs/${id}`);
console.log('Raw API response:', response);
return response.data;
}

/** Raw lead row from API */
export interface LeadListItem {
  id: string | number;
  name?: string;
  brand_name?: string;
  brand_id?: number | string;
  contact_person?: string;
  mobile_number?: string[];
  number?: string;
  phone?: string;
  email?: string;
  lead_source?: string;
  lead_sub_source?: string;
  priority_id?: number | string;
  current_assign_user?: number | string;
  agencyName?: string;
  brandName?: string;
  contactPerson?: string;
  phoneNumber?: string;
  source?: string;
  subSource?: string;
  assignBy?: string;
  assignTo?: string;
  dateTime?: string;
  status?: string;
  callStatus?: string;
  callAttempt?: number;
  comment?: string;
  leadStatus?: string;
  [key: string]: unknown;
}

/** UI table row shape used by lead list pages */
export interface AllLeadtype {
  id: string;
  agencyName: string;
  brandName: string;
  contactPerson: string;
  phoneNumber: string;
  source: string;
  subSource: string;
  organisation: string;
  assignBy: string;
  assignTo: string;
  dateTime: string;
  status: string;
  leadStatus?: string;
  callStatus: string;
  callAttempt: number;
  comment: string;
  brandId?: string;
  agencyId?: string;
  leadNumericId?: string;
}

/** @deprecated Use AllLeadtype for UI or LeadListItem for API */
export type Lead = AllLeadtype;

export type LeadListResponse = {
  data: LeadListItem[];
  meta?: Record<string, unknown> & {
    pagination?: { total?: number; current_page?: number; per_page?: number };
    total?: number;
  };
};

export interface CallStatusOption {
  id: number;
  name: string;
}

export interface UserOption {
  id: number | string;
  name: string;
}

export type ReminderBeforeUnit = 'minutes' | 'hours' | 'days';

export interface LeadChatPayload {
  lead_id: number;
  call_status_id: number;
  comment: string;
  reminder: boolean;
  reminder_at?: string;
  reminder_before?: number;
  reminder_before_unit?: ReminderBeforeUnit;
}

export interface LeadAssignHistoryItem {
  id?: string;
  clientKey?: string;
  current_user_id: number | string;
  current_user_name: string;
  lead_comment: string;
  created_at?: string;
  timestamp?: string;
}

export type LeadAssignHistoryResponse = LeadAssignHistoryItem[];

export interface EditLeadFormData {
  id: string;
  selectedOption: 'brand' | 'agency';
  brandId?: string;
  agencyId?: string;
  contacts: Array<{
    id: string;
    fullName: string;
    profileUrl: string;
    email: string;
    mobileNo: string;
    mobileNo2: string;
    showSecondMobile: boolean;
    type: string;
    designation: string;
    agencyBrand: string;
    subSource: string;
    department: string;
    country: string;
    state: string;
    city: string;
    zone: string;
    postalCode: string;
  }>;
  assignTo?: string;
  assignToName?: string;
  organisation?: string;
  organisationName?: string;
  priority?: string;
  callFeedback?: string;
  comment?: string;
}

/** @deprecated Use EditLeadFormData */
export type EditLeadtype = EditLeadFormData;

export const MEETING_PIPELINE_STATUS_OPTIONS = ['Meeting Done', 'Meeting Scheduled'] as const;

export type MeetingPipelineStatus = (typeof MEETING_PIPELINE_STATUS_OPTIONS)[number];

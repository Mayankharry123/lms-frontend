export interface BrandItem {
  id: string;
  name: string;
  agencyName?: string;
  brandType?: string;
  address?: string;
  gstNumbers?: string[];
  contactPerson?: string;
  industry?: string;
  country?: string;
  state?: string;
  city?: string;
  zone?: string;
  pinCode?: string;
  dateTime?: string;
  [key: string]: unknown;
}

export interface AgencyItem {
  id: string;
  name: string;
  agencyType?: string;
  contactPerson?: string;
  country?: string;
  state?: string;
  city?: string;
  zone?: string;
  dateTime?: string;
  [key: string]: unknown;
}

/** Shared master list row (designation, department, industry, etc.) */
export interface MasterNameDateRow {
  id: string;
  name: string;
  dateTime: string;
}

export type DesignationTableRow = MasterNameDateRow;
export type DepartmentTableRow = MasterNameDateRow;
export type IndustryTableRow = MasterNameDateRow;

export interface DepartmentItem {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

export interface DesignationItem {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

export interface IndustryItem {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

export interface LeadSourceItem {
  id: string | number;
  name: string;
  lead_source_id?: number | string;
  [key: string]: unknown;
}

export type MasterListResponse<T> = {
  data: T[];
  meta?: Record<string, unknown>;
};

import { handleApiError } from '../utils/apiErrorHandler';
import { apiClient } from '../utils/apiClient';
import type { ApiResponse } from '../utils/apiClient';
import {
  downloadBlobFile,
  downloadFileFromUrl,
  parseContentDispositionFilename,
} from '../utils/downloadFile';
import { API_BASE_URL } from '../constants';
import { http } from './http';
import axios from 'axios';

export interface BrandItem {
  id: string;
  name: string;
  agencyName?: string;
  brandType?: string;
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

const ENDPOINTS = {
  LIST: '/brands',
  DETAIL: (id: string) => `/brands/${id}`,
  CREATE: '/brands',
  UPDATE: (id: string) => `/brands/${id}`,
  DELETE: (id: string) => `/brands/${id}`,
  IMPORT: '/brands/import',
  IMPORT_TEMPLATE: '/brands/import-template',
} as const;

export interface BrandImportFailedRow {
  row?: number | string;
  row_number?: number | string;
  rowNumber?: number | string;
  line?: number | string;
  brand_name?: string;
  brandName?: string;
  errors?: string[] | string;
  error?: string;
  message?: string;
  reason?: string;
  error_reason?: string;
  [key: string]: unknown;
}

export interface BrandImportApiData {
  total_rows?: number;
  total_count?: number;
  success_rows?: number;
  success_count?: number;
  failed_rows?: number;
  failed_count?: number;
  failed_records?: BrandImportFailedRow[];
  failed_file_url?: string | null;
}

export interface BrandImportResult {
  message: string;
  total: number;
  successful: number;
  failed: number;
  failedRows: BrandImportFailedRow[];
  failedFileUrl: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeFailedRows(value: unknown): BrandImportFailedRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') {
      return { message: item };
    }
    const record = asRecord(item);
    return record ? (record as BrandImportFailedRow) : { message: String(item) };
  });
}

function pickCount(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === undefined || value === null || typeof value === 'boolean' || Array.isArray(value)) {
      continue;
    }
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractFailedRecords(source: Record<string, unknown> | null): BrandImportFailedRow[] {
  if (!source) return [];
  const records =
    source['failed_records'] ??
    source['failedRecords'] ??
    (Array.isArray(source['failed_rows']) ? source['failed_rows'] : undefined) ??
    (Array.isArray(source['failedRows']) ? source['failedRows'] : undefined) ??
    source['failures'];
  return normalizeFailedRows(records);
}

function hasImportPayload(value: unknown): boolean {
  const record = asRecord(value);
  if (!record) return false;
  return (
    record['total'] != null ||
    record['total_rows'] != null ||
    record['total_count'] != null ||
    record['success_rows'] != null ||
    record['success_count'] != null ||
    record['successful'] != null ||
    record['imported'] != null ||
    record['failed'] != null ||
    record['failed_rows'] != null ||
    record['failed_count'] != null ||
    record['failed_records'] != null ||
    record['failedRecords'] != null ||
    record['failedRows'] != null ||
    record['failed_file_url'] != null ||
    record['failures'] != null
  );
}

function pickStringUrl(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') continue;
    try {
      if (/^https?:\/\//i.test(trimmed)) {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.href;
        }
        continue;
      }
      if (trimmed.startsWith('/')) {
        if (/^https?:\/\//i.test(API_BASE_URL)) {
          return new URL(trimmed, new URL(API_BASE_URL).origin).href;
        }
        if (typeof window !== 'undefined') {
          return new URL(trimmed, window.location.origin).href;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function normalizeBrandImportResult(
  res: Pick<ApiResponse<unknown>, 'message' | 'data'>
): BrandImportResult {
  const dataRecord = asRecord(res.data);
  const summary = asRecord(dataRecord?.['summary']) ?? dataRecord;
  const summaryFailedRows = extractFailedRecords(summary);
  const failedRows =
    summaryFailedRows.length > 0 ? summaryFailedRows : extractFailedRecords(dataRecord);

  const total =
    pickCount(
      summary?.['total_count'],
      summary?.['total_rows'],
      summary?.['totalRows'],
      summary?.['total'],
      dataRecord?.['total_count'],
      dataRecord?.['total_rows'],
      dataRecord?.['total']
    ) ?? 0;
  const successful =
    pickCount(
      summary?.['success_count'],
      summary?.['success_rows'],
      summary?.['successRows'],
      summary?.['successful'],
      summary?.['imported'],
      dataRecord?.['success_count'],
      dataRecord?.['success_rows'],
      dataRecord?.['successful']
    ) ?? 0;
  const failed =
    pickCount(
      summary?.['failed_count'],
      summary?.['failed_rows'],
      summary?.['failedRows'],
      summary?.['failed'],
      dataRecord?.['failed_count'],
      dataRecord?.['failed_rows'],
      dataRecord?.['failed']
    ) ?? failedRows.length;

  const failedFileUrl = pickStringUrl(
    summary?.['failed_file_url'],
    summary?.['failedFileUrl'],
    dataRecord?.['failed_file_url'],
    dataRecord?.['failedFileUrl']
  );

  return {
    message: res.message || 'Brand import completed.',
    total: total || successful + failed,
    successful,
    failed,
    failedRows,
    failedFileUrl: failed > 0 ? failedFileUrl : null,
  };
}

async function handleResponse<T>(res: any): Promise<T> {
  const json = res;
    if (!json || !json.success) {
      const message = (json as any)?.message || (json as any)?.error || 'Request failed';
      const error = new Error(message);
      (error as any).statusCode = (json as any)?.meta?.status_code || (json as any)?.meta?.status || undefined;
      (error as any).responseData = json;
      handleApiError(error);
      throw error;
    }
  return json.data as T;
}

export type BrandListResponse = {
  data: BrandItem[];
  meta?: {
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number | null;
      to: number | null;
    }
  }
};

export async function listBrands(page = 1, perPage = 10, search?: string): Promise<BrandListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  if (search && String(search).trim()) params.set('search', String(search).trim());
  const res = await apiClient.get<BrandItem[]>(ENDPOINTS.LIST + `?${params.toString()}`);
  const json = res;
    if (!json || !json.success) {
      const message = (json as any)?.message || (json as any)?.error || 'Request failed';
      const error = new Error(message);
      (error as any).statusCode = (json as any)?.meta?.status_code || (json as any)?.meta?.status || undefined;
      (error as any).responseData = json;
      handleApiError(error);
      throw error;
    }

  const items = (json.data || []).map((it: unknown, idx: number) => {
    const raw = it as Record<string, unknown>;
    const idVal = raw['id'] ?? raw['uuid'] ?? raw['code'] ?? `BR${String(idx + 1).padStart(3, '0')}`;
    const nameVal = raw['name'] ?? raw['brand_name'] ?? '';
    const agencyRaw = raw['agency'];
    const agenciesRaw = raw['agencies'];
    const agencyNameVal = raw['agency_name'] ?? 
      (Array.isArray(agenciesRaw) && agenciesRaw.length > 0 ? (agenciesRaw[0] as any)?.name ?? '' : '') ??
      (agencyRaw && typeof agencyRaw === 'object' && 'name' in (agencyRaw as Record<string, unknown>) ? String((agencyRaw as Record<string, unknown>)['name']) : agencyRaw ?? '');
    const brandTypeVal = (raw['brand_type'] as any)?.name ?? raw['type'] ?? '';
    const contactPersonVal = raw['contact_person'] ?? raw['contact'] ?? '';
    const industryVal = (raw['industry'] as any)?.name ?? '';
    const countryVal = (raw['country'] as any)?.name ?? '';
    const stateVal = (raw['state'] as any)?.name ?? '';
    const cityVal = (raw['city'] as any)?.name ?? '';
    const zoneVal = (raw['zone'] as any)?.name ?? '';
    const pinCodeVal = raw['pin_code'] ?? raw['postal_code'] ?? raw['postalCode'] ?? '';
    const dateTimeVal = raw['created_at'] ?? raw['date_time'] ?? raw['dateTime'] ?? '';

    return {
      id: String(idVal),
      name: String(nameVal ?? ''),
      agencyName: String(agencyNameVal ?? ''),
      brandType: String(brandTypeVal ?? ''),
      contactPerson: String(contactPersonVal ?? ''),
      industry: String(industryVal ?? ''),
      country: String(countryVal ?? ''),
      state: String(stateVal ?? ''),
      city: String(cityVal ?? ''),
      zone: String(zoneVal ?? ''),
      pinCode: String(pinCodeVal ?? ''),
      dateTime: String(dateTimeVal ?? ''),
      // keep original raw object for callers that need extra fields
      _raw: raw,
    } as BrandItem;
  });

  return {
    data: items,
    meta: (json.meta as any) || {},
  };
}

export async function getBrand(id: string): Promise<BrandItem> {
  const res = await apiClient.get<BrandItem>(ENDPOINTS.DETAIL(encodeURIComponent(id)));
  return handleResponse<BrandItem>(res);
}

export async function createBrand(payload: Partial<BrandItem>): Promise<BrandItem> {
  const res = await apiClient.post<BrandItem>(ENDPOINTS.CREATE, payload);
  return handleResponse<BrandItem>(res);
}

export async function updateBrand(id: string, payload: Partial<BrandItem>): Promise<BrandItem> {
  const res = await apiClient.put<BrandItem>(ENDPOINTS.UPDATE(encodeURIComponent(id)), payload);
  return handleResponse<BrandItem>(res);
}

export async function deleteBrand(id: string): Promise<void> {
  const res = await apiClient.delete<unknown>(ENDPOINTS.DELETE(encodeURIComponent(id)));
  await handleResponse<unknown>(res);
}

export async function importBrandsFromExcel(file: File): Promise<BrandImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await apiClient.post<BrandImportApiData>(ENDPOINTS.IMPORT, formData, { timeout: 120000 });
    return normalizeBrandImportResult(res);
  } catch (error: unknown) {
    const responseData = (error as { responseData?: ApiResponse<unknown> })?.responseData;
    if (responseData && hasImportPayload(responseData.data)) {
      return normalizeBrandImportResult({
        message: responseData.message || (error instanceof Error ? error.message : 'Import completed with errors'),
        data: responseData.data,
      });
    }
    handleApiError(error);
    throw error;
  }
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function isZipOrExcelBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function withXlsxExtension(filename: string): string {
  const trimmed = filename.trim();
  if (/\.(xlsx|xls)$/i.test(trimmed)) return trimmed;
  return `${trimmed || 'brand-import-template'}.xlsx`;
}

async function readTemplateErrorMessage(buffer: ArrayBuffer): Promise<string> {
  const text = new TextDecoder().decode(buffer).trim();
  if (!text) return 'Failed to download Excel template.';

  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message || json.error || 'Failed to download Excel template.';
  } catch {
    return 'Failed to download Excel template.';
  }
}

function resolveTemplateDownloadRequest(endpoint: string): { url: string; baseURL?: string } {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    /^https?:\/\//i.test(API_BASE_URL)
  ) {
    try {
      if (new URL(API_BASE_URL).origin !== window.location.origin) {
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return { url: `/api${path}`, baseURL: window.location.origin };
      }
    } catch {
      // Fall through to the configured API base URL.
    }
  }

  return { url: endpoint };
}

export async function downloadBrandImportTemplate(): Promise<void> {
  try {
    const { url, baseURL } = resolveTemplateDownloadRequest(ENDPOINTS.IMPORT_TEMPLATE);
    const resp = await http.get(url, {
      ...(baseURL ? { baseURL } : {}),
      responseType: 'blob',
      timeout: 60000,
      headers: {
        Accept: `${XLSX_MIME}, application/vnd.ms-excel, application/octet-stream, */*`,
      },
    });

    const blob = resp.data as Blob;
    if (!blob || blob.size === 0) {
      throw new Error('Excel template file was empty.');
    }

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!isZipOrExcelBytes(bytes)) {
      throw new Error(await readTemplateErrorMessage(buffer));
    }

    const filename = withXlsxExtension(
      parseContentDispositionFilename(String(resp.headers['content-disposition'] ?? '')) ??
        'brand-import-template.xlsx'
    );

    downloadBlobFile(filename, new Blob([buffer], { type: XLSX_MIME }));
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const message = await readTemplateErrorMessage(await error.response.data.arrayBuffer());
      const wrapped = new Error(message);
      handleApiError(wrapped);
      throw wrapped;
    }
    handleApiError(error);
    throw error;
  }
}

function filenameFromFailedFileUrl(fileUrl: string): string {
  try {
    const name = decodeURIComponent(new URL(fileUrl, window.location.origin).pathname.split('/').pop() || '');
    if (name) return withXlsxExtension(name);
  } catch {
    // ignore invalid URLs and use the fallback name
  }
  return 'brand-import-failed-records.xlsx';
}

function toSameOriginExportUrl(fileUrl: string): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') return fileUrl;

  try {
    const parsed = new URL(fileUrl, window.location.origin);
    const apiOrigin = /^https?:\/\//i.test(API_BASE_URL) ? new URL(API_BASE_URL).origin : '';
    if (
      parsed.origin !== window.location.origin &&
      apiOrigin &&
      parsed.origin === apiOrigin &&
      parsed.pathname.startsWith('/exports/')
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return fileUrl;
  }

  return fileUrl;
}

export async function downloadFailedBrandImportFile(fileUrl: string): Promise<void> {
  const resolved = pickStringUrl(fileUrl);
  if (!resolved) {
    throw new Error('Failed records file is not available.');
  }

  try {
    await downloadFileFromUrl(toSameOriginExportUrl(resolved), filenameFromFailedFileUrl(resolved));
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
}

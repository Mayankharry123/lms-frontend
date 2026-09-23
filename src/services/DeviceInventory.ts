import { handleApiError } from '../utils/apiErrorHandler';
import { isAbortError, serializeRequestKey } from '../utils/requestControl';
import sspHttp from './sspHttp';
import type {
  DeviceData,
  DeviceInventoryResponse,
  DeviceMapMarker,
  ListDeviceInventoryParams,
} from '../types/inventory.types';
import { exportDeviceInventoryExcel } from '../utils/deviceInventoryExcel';

export type { DeviceData, DeviceMapMarker };

const INVENTORY_ENDPOINT = '/inventory';

function normalizeFilterValues(value?: string): string[] {
  // UI multi-selects use CSV while the inventory API expects distinct values.
  if (!value) return [];

  const normalized = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function buildInventoryQueryParams(
  params: ListDeviceInventoryParams,
  options?: { includePagination?: boolean }
): Record<string, string | number | Array<string | number>> {
  const includePagination = options?.includePagination ?? true;
  const query: Record<string, string | number | Array<string | number>> = {};

  if (includePagination) {
    query.page = params.page ?? 1;
    query.per_page = params.per_page ?? 10;
  }

  const appendScalar = (key: string, value?: string) => {
    const trimmed = value?.trim();
    if (trimmed) query[key] = trimmed;
  };

  const appendMulti = (key: string, value?: string) => {
    // Send repeated bracketed query keys so all selected filter values reach the API.
    const values = normalizeFilterValues(value);
    if (!values.length) return;
    query[`${key}[]`] = values;
  };

  appendScalar('fields', params.fields);
  appendScalar('search', params.search);
  appendScalar('country', params.country);
  appendMulti('state', params.state);
  appendScalar('city', params.city);
  appendMulti('zone', params.zone);
  appendMulti('sub_zone_area', params.subZoneArea);
  appendMulti('pincode', params.pincode);
  appendMulti('arterial_route', params.arterialRoute);
  appendMulti('mode_of_media', params.modeOfMedia);
  appendScalar('publisher', params.publisher);
  appendMulti('main_category_name', params.mainCategory);
  appendMulti('sub_category_name', params.categorySub);
  appendMulti('category_name', params.category);
  appendMulti('location_type', params.locationType);
  appendMulti('orientation', params.orientation);
  appendMulti('resolution', params.resolution);
  appendMulti('screen_location', params.screenLocation);
  appendMulti('stretch', params.stretch);
  appendMulti('property', params.property);

  return query;
}

export type DeviceInventoryFilterParams = Omit<ListDeviceInventoryParams, 'page' | 'per_page' | 'fields'>;

export type DeviceInventoryExportKind = 'excel' | 'ppt';

/** Build a filter-only query string shared by Excel and PPT export endpoints. */
export function buildDeviceInventoryExportQuery(
  filters: DeviceInventoryFilterParams = {}
): string {
  const params = buildInventoryQueryParams(
    { ...filters, page: 1, per_page: 10 },
    { includePagination: false }
  );
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // Preserve multi-select filters as repeated query parameters instead of one comma-joined value.
      value.forEach((item) => {
        if (item !== undefined && item !== null && String(item).trim() !== '') {
          search.append(key, String(item));
        }
      });
      return;
    }

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Dedicated export API path for the current filters (Excel or PPT). */
export function buildDeviceInventoryExportPath(
  filters: DeviceInventoryFilterParams,
  kind: DeviceInventoryExportKind
): string {
  const suffix = buildDeviceInventoryExportQuery(filters);
  return kind === 'excel'
    ? `/inventory/export/excel${suffix}`
    : `/inventory/export/ppt${suffix}`;
}

function normalizeInventoryResponse(json: unknown): DeviceInventoryResponse {
  const body = (json || {}) as Record<string, unknown>;
  const ok = body.status === true || body.success === true;

  if (!ok) {
    const message = String(body.message || body.error || 'Request failed');
    const error = new Error(message);
    (error as Error & { responseData?: unknown }).responseData = json;
    throw error;
  }

  const meta = (body.meta || {}) as Record<string, unknown>;
  const pagination = (meta.pagination || {}) as Record<string, unknown>;
  const rows = Array.isArray(body.data) ? (body.data as DeviceData[]) : [];

  return {
    status: true,
    message: String(body.message || ''),
    total_records: Number(
      body.total_records ?? pagination.total ?? meta.total ?? rows.length
    ),
    current_page: Number(body.current_page ?? pagination.page ?? 1),
    per_page: Number(body.per_page ?? pagination.limit ?? pagination.per_page ?? 10),
    data: rows,
    excel_download_url: body.excel_download_url ? String(body.excel_download_url) : null,
    ppt_download_url: body.ppt_download_url ? String(body.ppt_download_url) : null,
  };
}

export async function listDeviceInventory(
  params: ListDeviceInventoryParams = {},
  options?: { signal?: AbortSignal }
): Promise<DeviceInventoryResponse> {
  try {
    const resp = await sspHttp.get(INVENTORY_ENDPOINT, {
      params: buildInventoryQueryParams(params),
      signal: options?.signal,
    });

    return normalizeInventoryResponse(resp.data);
  } catch (error) {
    if (!isAbortError(error)) {
      handleApiError(error);
    }
    throw error;
  }
}

const MAP_PAGE_SIZE = 2500;
const MAP_MAX_PAGES = 20;
const MAP_CACHE_TTL_MS = 5 * 60 * 1000;
const MAP_FIELDS =
  'device_details_id,device_id,latitude,longitude,status,category_name,main_category_name';

type MapCacheEntry = {
  markers: DeviceMapMarker[];
  timestamp: number;
};

const mapMarkerCache = new Map<string, MapCacheEntry>();
const pendingMapRequests = new Map<string, Promise<DeviceMapMarker[]>>();

function toMapMarker(row: DeviceData): DeviceMapMarker | null {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const id = String(row.device_details_id || row.device_id || '').trim();
  if (!id) return null;

  return {
    id,
    latitude,
    longitude,
    status: row.status?.trim() || undefined,
    category: row.category_name?.trim() || row.main_category_name?.trim() || undefined,
  };
}

/** Lightweight map points for the current server-side filters. Details stay on the list/detail APIs. */
export async function listDeviceInventoryMapMarkers(
  filters: DeviceInventoryFilterParams = {},
  options?: { signal?: AbortSignal }
): Promise<DeviceMapMarker[]> {
  const cacheKey = serializeRequestKey(filters);
  const cached = mapMarkerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MAP_CACHE_TTL_MS) {
    return cached.markers;
  }

  const pending = pendingMapRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const markers: DeviceMapMarker[] = [];
    const seen = new Set<string>();
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (markers.length < total) {
      if (options?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const res = await listDeviceInventory(
        {
          ...filters,
          page,
          per_page: MAP_PAGE_SIZE,
          fields: MAP_FIELDS,
        },
        { signal: options?.signal }
      );
      const rows = Array.isArray(res.data) ? res.data : [];
      const reportedTotal = Number(res.total_records || 0);
      total = reportedTotal > 0 ? reportedTotal : markers.length + rows.length;

      rows.forEach((row) => {
        const marker = toMapMarker(row);
        if (!marker || seen.has(marker.id)) return;
        seen.add(marker.id);
        markers.push(marker);
      });

      if (rows.length === 0) break;
      if (rows.length < MAP_PAGE_SIZE) break;
      page += 1;
      if (page > MAP_MAX_PAGES) break;
    }

    mapMarkerCache.set(cacheKey, { markers, timestamp: Date.now() });
    return markers;
  })();

  pendingMapRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingMapRequests.delete(cacheKey);
  }
}

export async function getDeviceInventoryDetail(
  id: string,
  options?: { signal?: AbortSignal }
): Promise<DeviceData | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const res = await listDeviceInventory(
    { search: trimmed, page: 1, per_page: 20 },
    { signal: options?.signal }
  );
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    rows.find(
      (row) =>
        String(row.device_details_id) === trimmed || String(row.device_id) === trimmed
    ) ||
    rows[0] ||
    null
  );
}

const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_PAGES = 2000;

export type FetchAllDeviceInventoryProgress = {
  loaded: number;
  total: number;
  page: number;
  pageSize: number;
};

export type FetchAllDeviceInventoryOptions = {
  onProgress?: (progress: FetchAllDeviceInventoryProgress) => void;
};

/** Fetch every page for the given filters (PPT export and other full exports). */
export async function fetchAllDeviceInventoryRows(
  filters: Omit<ListDeviceInventoryParams, 'page' | 'per_page'>,
  options: FetchAllDeviceInventoryOptions = {}
): Promise<DeviceData[]> {
  // Exports must bypass the table page size and collect every page matching the active filters.
  const { onProgress } = options;
  let page = 1;
  let all: DeviceData[] = [];
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    const res = await listDeviceInventory({
      ...filters,
      page,
      per_page: EXPORT_PAGE_SIZE,
    });
    const rows = Array.isArray(res.data) ? res.data : [];
    const reportedTotal = Number(res.total_records || 0);
    total = reportedTotal > 0 ? reportedTotal : all.length + rows.length;
    all = all.concat(rows);

    onProgress?.({
      loaded: all.length,
      total,
      page,
      pageSize: EXPORT_PAGE_SIZE,
    });

    if (rows.length === 0) break;
    if (rows.length < EXPORT_PAGE_SIZE && all.length >= total) break;
    page += 1;
    if (page > EXPORT_MAX_PAGES) break;
  }

  return all;
}

const PPT_FETCH_PAGE_SIZE = 100;

/**
 * Stream inventory pages without holding the full result set in memory.
 * Returns total rows processed.
 */
export async function forEachDeviceInventoryPage(
  filters: Omit<ListDeviceInventoryParams, 'page' | 'per_page'>,
  options: {
    pageSize?: number;
    onProgress?: (progress: FetchAllDeviceInventoryProgress) => void;
    onPageRows: (
      rows: DeviceData[],
      progress: FetchAllDeviceInventoryProgress
    ) => void | Promise<void>;
  }
): Promise<number> {
  const pageSize = options.pageSize ?? PPT_FETCH_PAGE_SIZE;
  const { onProgress, onPageRows } = options;
  let page = 1;
  let processed = 0;
  let total = Number.POSITIVE_INFINITY;

  while (processed < total) {
    const res = await listDeviceInventory({
      ...filters,
      page,
      per_page: pageSize,
    });
    const rows = Array.isArray(res.data) ? res.data : [];
    const reportedTotal = Number(res.total_records || 0);
    total = reportedTotal > 0 ? reportedTotal : processed + rows.length;
    processed += rows.length;

    const progress: FetchAllDeviceInventoryProgress = {
      loaded: processed,
      total,
      page,
      pageSize,
    };
    onProgress?.(progress);
    await onPageRows(rows, progress);

    if (rows.length === 0) break;
    if (rows.length < pageSize && processed >= total) break;
    page += 1;
    if (page > EXPORT_MAX_PAGES) break;
  }

  return processed;
}

function resolveSspDownloadPath(downloadUrl: string): string {
  const trimmed = downloadUrl.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return trimmed.replace(/^\/+/, '');
}

async function readExportErrorMessage(data: Blob, status?: number): Promise<string> {
  const text = await data.text();
  const trimmed = text.trim();
  const statusSuffix = status ? ` (${status})` : '';

  if (!trimmed) {
    return `Export failed${statusSuffix}.`;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as { message?: string };
      return json.message || `Export failed${statusSuffix}.`;
    } catch {
      return `Export failed${statusSuffix}.`;
    }
  }

  if (trimmed.startsWith('<')) {
    return `Export failed${statusSuffix}. Please try again with narrower filters.`;
  }

  if (trimmed.startsWith('\u0089PNG') || trimmed.startsWith('PNG')) {
    return `Export failed${statusSuffix}. The server returned an unexpected image response.`;
  }

  const hasUnexpectedControlCharacter = [...trimmed.slice(0, 32)].some((char) => {
    const code = char.charCodeAt(0);
    return code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d;
  });

  if (trimmed.length > 240 || hasUnexpectedControlCharacter) {
    return `Export failed${statusSuffix}. The server returned an unexpected file response.`;
  }

  return trimmed;
}

function isSuccessfulExportBlob(contentType: string, blob: Blob): boolean {
  const type = contentType.toLowerCase();
  if (type.includes('application/json') || type.includes('text/html')) {
    return false;
  }

  return (
    type.includes('spreadsheet') ||
    type.includes('presentation') ||
    type.includes('octet-stream') ||
    type.includes('zip') ||
    blob.size > 0
  );
}

export async function downloadDeviceInventoryExport(
  downloadUrl: string,
  fallbackFilename: string
): Promise<{ notice?: string }> {
  const { downloadBlobFile, defaultDatedXlsxFilename, parseContentDispositionFilename } =
    await import('../utils/downloadFile');

  const target = resolveSspDownloadPath(downloadUrl);
  const isAbsolute = target.startsWith('http://') || target.startsWith('https://');

  if (isAbsolute) {
    const resp = await fetch(target);
    if (!resp.ok) {
      throw new Error(`Failed to download export (${resp.status})`);
    }
    const blob = await resp.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Export file was empty.');
    }
    const filename =
      parseContentDispositionFilename(resp.headers.get('content-disposition')) ??
      fallbackFilename;
    downloadBlobFile(filename, blob);
    return {};
  }

  try {
    const resp = await sspHttp.get(target, { responseType: 'blob' });
    const contentType = String(resp.headers?.['content-type'] ?? '');
    const blob = resp.data as Blob;

    if (!isSuccessfulExportBlob(contentType, blob)) {
      throw new Error(await readExportErrorMessage(blob, resp.status));
    }

    if (!blob || blob.size === 0) {
      throw new Error('Export file was empty.');
    }

    const filename =
      parseContentDispositionFilename(String(resp.headers?.['content-disposition'] ?? '')) ??
      (contentType.includes('presentation') || fallbackFilename.endsWith('.pptx')
        ? `Device_Inventory_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pptx`
        : defaultDatedXlsxFilename('device-inventory'));

    downloadBlobFile(filename, blob);

    const notice = String(resp.headers?.['x-export-notice'] ?? '').trim();

    return notice ? { notice } : {};
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { data?: Blob; status?: number; headers?: Record<string, string> };
      message?: string;
    };

    if (axiosError.response?.data instanceof Blob) {
      throw new Error(
        await readExportErrorMessage(axiosError.response.data, axiosError.response.status)
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(axiosError.message || 'Export failed.');
  }
}

/** Export all filtered inventory rows into a single Excel workbook. */
export async function exportDeviceInventoryExcelFile(
  filters: DeviceInventoryFilterParams
): Promise<void> {
  // Build the workbook from the complete filtered result rather than a single export response row.
  const rows = await fetchAllDeviceInventoryRows(filters);
  exportDeviceInventoryExcel(rows);
}

/** Trigger PPT export for the current inventory filters (dedicated API). */
export async function exportDeviceInventoryPptFile(
  filters: DeviceInventoryFilterParams
): Promise<void> {
  const path = buildDeviceInventoryExportPath(filters, 'ppt');
  await downloadDeviceInventoryExport(path, 'device-inventory.pptx');
}
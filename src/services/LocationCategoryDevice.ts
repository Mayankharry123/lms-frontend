/**
 * Service for handling location, category, and device API calls
 * Uses local HTTP client with proxy to avoid CORS issues
 */

import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance } from 'axios';
import { applySspAuthHeaders, resolveSspBaseUrl } from './sspConfig';
import { isAbortError } from '../utils/requestControl';

const locationApiBaseUrl = resolveSspBaseUrl();

const sspApiClient: AxiosInstance = axios.create({
  baseURL: locationApiBaseUrl,
  timeout: 30000,
  paramsSerializer: {
    // Axios does not consistently serialize array keys with the API's bracket notation.
    serialize: (params) => {
      const query = new URLSearchParams();
      Object.entries(params || {}).forEach(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values.forEach((item) => {
          if (item !== undefined && item !== null && item !== '') {
            query.append(key, String(item));
          }
        });
      });
      return query.toString().replace(/%5B/gi, '[').replace(/%5D/gi, ']');
    },
  },
  headers: AxiosHeaders.from({
    'Content-Type': 'application/json',
    ...applySspAuthHeaders(),
  }),
});

// Add response interceptor for error handling
sspApiClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);
  Object.entries(applySspAuthHeaders()).forEach(([key, value]) => {
    headers.set(key, value);
  });
  config.headers = headers;
  return config;
});

sspApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      console.warn('SSP API request timed out:', error.config?.url || 'unknown endpoint');
    } else {
      console.error('SSP API Error:', error.message);
    }
    throw error;
  }
);

// Types
export interface LocationOption {
  id: string | number;
  name: string;
  label?: string;
  value?: string | number;
}

export interface CascadingFilterOptions {
  countries: LocationOption[];
  states: LocationOption[];
  cities: LocationOption[];
  zones: LocationOption[];
  subZones: LocationOption[];
  pincodes: LocationOption[];
  arterialRoutes: LocationOption[];
  modeOfMedia: LocationOption[];
  publishers: LocationOption[];
  mainCategories: LocationOption[];
  categories: LocationOption[];
  subCategories: LocationOption[];
  locationTypes: LocationOption[];
  orientations: LocationOption[];
  resolutions: LocationOption[];
  screenLocations: LocationOption[];
  stretches: LocationOption[];
  properties: LocationOption[];
}

// ============ CACHE & REQUEST DEDUPLICATION ============
interface CacheEntry {
  data: LocationOption[];
  timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const apiCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<LocationOption[]>>();
let locationRequestSignal: AbortSignal | undefined;

export function setLocationApiSignal(signal?: AbortSignal): void {
  locationRequestSignal = signal;
}

/**
 * Get from cache if valid, otherwise return null
 */
function getFromCache(key: string): LocationOption[] | null {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    console.debug(`Cache hit for ${key}`);
    return entry.data;
  }
  return null;
}

/**
 * Store in cache
 */
function setCache(key: string, data: LocationOption[]): void {
  apiCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Transform API response data to standard format
 */
function transformToOptions(data: any): LocationOption[] {
  // Normalize the API's supported response shapes for all dropdown components.
  if (!data) return [];

  // ✅ handle wrapped API response
  if (data.items && Array.isArray(data.items)) {
    data = data.items;
  }

  // ✅ handle array
  if (Array.isArray(data)) {
    return data.map((item: any, index: number) => {
      // string case
      if (typeof item === 'string') {
        return {
          id: item,
          name: item,
          label: item,
        };
      }

      // object case
      const objectIdKey = Object.keys(item || {}).find((key) => /(^id$|_id$)/i.test(key));
      const objectIdValue = objectIdKey ? item[objectIdKey] : undefined;
      return {
        id: item.id ?? item.value ?? objectIdValue ?? index,
        name: item.name || item.label || item.value || String(item),
        label: item.label || item.name || item.value,
          value: item.value,
      };
    });
  }

  // ✅ handle object map
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]: [string, any]) => ({
      id: key,
      name: value?.name || value?.label || String(value),
      label: value?.label || value?.name,
    }));
  }

  return [];
}

/**
 * Make API request with caching and deduplication
 * Uses local HTTP client routed through Vite proxy
 */
async function makeApiRequest(endpoint: string, payload: any = {}): Promise<LocationOption[]> {
  // Cache and deduplicate identical cascade requests to avoid repeated option loads.
  const cacheKey = `${endpoint}:${JSON.stringify(payload)}`;

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Check for pending request to avoid duplicate API calls
  if (pendingRequests.has(cacheKey)) {
    console.debug(`Waiting for pending request: ${cacheKey}`);
    return pendingRequests.get(cacheKey)!;
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      const buildFormPayload = (): URLSearchParams => {
        const formPayload = new URLSearchParams();
        Object.entries(payload || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v !== undefined && v !== null && v !== '') {
                formPayload.append(key, String(v));
              }
            });
            return;
          }
          formPayload.append(key, String(value));
        });
        return formPayload;
      };

      const buildQueryParams = (): Record<string, string | string[]> => {
        const params: Record<string, string | string[]> = {};
        Object.entries(payload || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;
          if (Array.isArray(value)) {
            const arr = value
              .filter((v) => v !== undefined && v !== null && v !== '')
              .map((v) => String(v));
            if (arr.length) params[key] = arr;
            return;
          }
          params[key] = String(value);
        });
        return params;
      };

      const queryParams = buildQueryParams();
      const formPayload = buildFormPayload();

      // Staging/prod can be GET-only while some local setups accept POST.
      // Use validateStatus to prevent noisy 405 throws during method fallback.
      let response = await sspApiClient.request({
        url: endpoint,
        method: 'get',
        params: queryParams,
        signal: locationRequestSignal,
        validateStatus: () => true,
      });

      if (response.status === 404 || response.status === 405 || response.status === 415) {
        response = await sspApiClient.request({
          url: endpoint,
          method: 'post',
          data: formPayload,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: locationRequestSignal,
          validateStatus: () => true,
        });
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Request failed (${response.status}) for ${endpoint}`);
      }

      const data = response.data;
      if (!data) {
        throw new Error('No data in response');
      }

      // Handle both direct data and wrapped responses
      const resultData = data.data || data;
      const options = transformToOptions(resultData);
      setCache(cacheKey, options);
      return options;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
        console.warn(`API request timed out for ${endpoint}`);
      } else {
        console.error(`API request failed for ${endpoint}:`, error);
      }
      // Return empty array on error so UI doesn't break
      return [];
    } finally {
      // Remove from pending requests after completion
      pendingRequests.delete(cacheKey);
    }
  })();

  // Add to pending requests
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

// ============ LOCATION APIs ============

export async function fetchCountries(): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/location/countries', {});
  } catch (error) {
    console.warn('Warning: Could not fetch countries:', error);
    return [];
  }
}

export async function fetchStates(countryId?: string | number | Array<string | number>): Promise<LocationOption[]> {
  try {
    const countries = Array.isArray(countryId) ? countryId : countryId !== undefined && countryId !== null ? [countryId] : [];
    const validCountries = countries
      .filter((c) => c !== undefined && c !== null && String(c).trim() !== '')
      .map((c) => String(c).trim());

    return await makeApiRequest('/location/states', {
      ...(validCountries.length ? { 'country[]': validCountries } : {}),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch states:', error);
    return [];
  }
}

type LocationHierarchyFilters = {
  country?: Array<string | number>;
  state?: Array<string | number>;
  city?: Array<string | number>;
  zone?: Array<string | number>;
  subZone?: Array<string | number>;
  pincode?: Array<string | number>;
  arterialRoute?: Array<string | number>;
};

const withLocationFilters = (filters: LocationHierarchyFilters): Record<string, Array<string | number>> => {
  // Keep location filters in the same bracketed multi-value format across endpoints.
  const payload: Record<string, Array<string | number>> = {};
  Object.entries(filters).forEach(([key, values]) => {
    if (values?.length) payload[`${key === 'subZone' ? 'sub_zone_area' : key}[]`] = values.map(String);
  });
  return payload;
};

export async function fetchCities(
  stateIds?: string | number | Array<string | number>,
  filters: LocationHierarchyFilters = {}
): Promise<LocationOption[]> {
  try {
    const selectedStates = Array.isArray(stateIds) ? stateIds : [stateIds];
    const stateValues = selectedStates
      .filter((state) => state !== undefined && state !== null && String(state).trim() !== '')
      .map((state) => String(state));

    return await makeApiRequest('/location/cities', {
      ...withLocationFilters(filters),
      ...(stateValues.length ? { 'state[]': stateValues } : {}),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch cities:', error);
    return [];
  }
}

export async function fetchZones(
  cityId?: string | number,
  filters: LocationHierarchyFilters = {}
): Promise<LocationOption[]> {
  try {
    const hasCity = cityId !== undefined && cityId !== null && String(cityId).trim() !== '';
    const payload = {
      ...withLocationFilters(filters),
      ...(hasCity ? { 'city[]': [String(cityId)] } : {}),
    };

    // Some SSP deployments expose this endpoint as `/location/zone` instead of `/location/zones`.
    const primary = await makeApiRequest('/location/zones', payload);
    if (primary.length > 0) return primary;

    const fallback = await makeApiRequest('/location/zone', payload);
    if (fallback.length > 0) return fallback;

    return primary;
  } catch (error) {
    console.warn('Warning: Could not fetch zones:', error);
    return [];
  }
}

export async function fetchSubZones(
  zoneId?: string | number,
  filters: LocationHierarchyFilters = {}
): Promise<LocationOption[]> {
  try {
    const hasZone = zoneId !== undefined && zoneId !== null && String(zoneId).trim() !== '';
    return await makeApiRequest('/location/sub-zones', {
      ...withLocationFilters(filters),
      ...(hasZone ? { 'zone[]': [String(zoneId)] } : {}),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch sub-zones:', error);
    return [];
  }
}

export type PincodeFilterParams = {
  city?: Array<string | number>;
  state?: Array<string | number>;
  country?: Array<string | number>;
  publisher?: Array<string | number>;
  zone?: Array<string | number>;
  subZone?: Array<string | number>;
  arterialRoute?: Array<string | number>;
};

export async function fetchPincodes(
  filters: PincodeFilterParams = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/location/pincodes', {
      ...withLocationFilters(filters),
      ...(filters.subZone ? { 'sub_zone_area[]': filters.subZone } : {}),
      ...(filters.zone ? { 'zone[]': filters.zone } : {}),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch pincodes:', error);
    return [];
  }
}

export async function fetchArterialRoutes(
  cityId?: string | number,
  filters: LocationHierarchyFilters = {}
): Promise<LocationOption[]> {
  try {
    const hasCity = cityId !== undefined && cityId !== null && String(cityId).trim() !== '';
    return await makeApiRequest('/location/arterial-routes', {
      ...withLocationFilters(filters),
      ...(hasCity ? { 'city[]': [String(cityId)] } : {}),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch arterial routes:', error);
    return [];
  }
}

// ============ CATEGORY APIs ============

type CategoryFilters = {
  state?: CategorySelection;
  city?: CategorySelection;
  zone?: CategorySelection;
  subZone?: CategorySelection;
  pincode?: CategorySelection;
  arterialRoute?: CategorySelection;
  mainCategory?: CategorySelection;
  category?: CategorySelection;
  subCategory?: CategorySelection;
};

export async function fetchModeOfMedia(filters: CategoryFilters = {}): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/category/mode-of-media', {
      ...categorySelectionPayload('state', filters.state),
      ...categorySelectionPayload('city', filters.city),
      ...categorySelectionPayload('zone', filters.zone),
      ...categorySelectionPayload('sub_zone_area', filters.subZone),
      ...categorySelectionPayload('pincode', filters.pincode),
      ...categorySelectionPayload('arterial_route', filters.arterialRoute),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch mode of media:', error);
    return [];
  }
}

type CategorySelection = string | number | Array<string | number>;

const categorySelectionPayload = (key: string, selection?: CategorySelection): Record<string, string[]> => {
  // Convert one or many selected values into the query shape expected by category APIs.
  if (selection === undefined || selection === null) return {};
  const values = (Array.isArray(selection) ? selection : [selection])
    .filter((value) => String(value).trim() !== '')
    .map(String);
  return values.length ? { [`${key}[]`]: values } : {};
};

export async function fetchPublishers(
  modeOfMedia?: CategorySelection,
  filters: CategoryFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/category/publishers', {
      ...categorySelectionPayload('mode_of_media', modeOfMedia),
      ...categorySelectionPayload('state', filters.state),
      ...categorySelectionPayload('city', filters.city),
      ...categorySelectionPayload('zone', filters.zone),
      ...categorySelectionPayload('sub_zone_area', filters.subZone),
      ...categorySelectionPayload('pincode', filters.pincode),
      ...categorySelectionPayload('arterial_route', filters.arterialRoute),
      ...categorySelectionPayload('main_category', filters.mainCategory),
      ...categorySelectionPayload('category', filters.category),
      ...categorySelectionPayload('sub_category', filters.subCategory),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch publishers:', error);
    return [];
  }
}

export async function fetchMainCategories(
  publisher?: CategorySelection,
  filters: CategoryFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/category/main', {
      ...categorySelectionPayload('publisher', publisher),
      ...categorySelectionPayload('state', filters.state),
      ...categorySelectionPayload('city', filters.city),
      ...categorySelectionPayload('zone', filters.zone),
      ...categorySelectionPayload('sub_zone_area', filters.subZone),
      ...categorySelectionPayload('pincode', filters.pincode),
      ...categorySelectionPayload('arterial_route', filters.arterialRoute),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch main categories:', error);
    return [];
  }
}

export async function fetchCategories(
  mainCategory?: CategorySelection,
  publisher?: CategorySelection,
  filters: CategoryFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/category/list', {
      ...categorySelectionPayload('main_category', mainCategory),
      ...categorySelectionPayload('publisher', publisher),
      ...categorySelectionPayload('state', filters.state),
      ...categorySelectionPayload('city', filters.city),
      ...categorySelectionPayload('zone', filters.zone),
      ...categorySelectionPayload('sub_zone_area', filters.subZone),
      ...categorySelectionPayload('pincode', filters.pincode),
      ...categorySelectionPayload('arterial_route', filters.arterialRoute),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch categories:', error);
    return [];
  }
}

export async function fetchSubCategories(
  categoryId?: CategorySelection,
  mainCategory?: CategorySelection,
  publisher?: CategorySelection,
  filters: CategoryFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/category/sub', {
      ...categorySelectionPayload('category', categoryId),
      ...categorySelectionPayload('main_category', mainCategory),
      ...categorySelectionPayload('publisher', publisher),
      ...categorySelectionPayload('state', filters.state),
      ...categorySelectionPayload('city', filters.city),
      ...categorySelectionPayload('zone', filters.zone),
      ...categorySelectionPayload('sub_zone_area', filters.subZone),
      ...categorySelectionPayload('pincode', filters.pincode),
      ...categorySelectionPayload('arterial_route', filters.arterialRoute),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch sub-categories:', error);
    return [];
  }
}

// ============ DEVICE APIs ============

export async function fetchLocationTypes(
  publisher?: DeviceSelection,
  filters: DeviceParentFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/device/location-types', {
      ...deviceSelectionPayload('state', filters.state),
      ...deviceSelectionPayload('city', filters.city),
      ...deviceSelectionPayload('zone', filters.zone),
      ...deviceSelectionPayload('sub_zone_area', filters.subZone),
      ...deviceSelectionPayload('pincode', filters.pincode),
      ...deviceSelectionPayload('arterial_route', filters.arterialRoute),
      ...deviceSelectionPayload('publisher', publisher),
      ...deviceSelectionPayload('main_category_name', filters.mainCategory),
      ...deviceSelectionPayload('category_name', filters.category),
      ...deviceSelectionPayload('sub_category_name', filters.subCategory),
      ...deviceSelectionPayload('property', filters.property),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch location types:', error);
    return [];
  }
}

type DeviceSelection = string | number | Array<string | number>;
type DeviceParentFilters = {
  state?: DeviceSelection;
  city?: DeviceSelection;
  zone?: DeviceSelection;
  subZone?: DeviceSelection;
  pincode?: DeviceSelection;
  arterialRoute?: DeviceSelection;
  publisher?: DeviceSelection;
  locationType?: DeviceSelection;
  orientation?: DeviceSelection;
  resolution?: DeviceSelection;
  property?: DeviceSelection;
  mainCategory?: DeviceSelection;
  category?: DeviceSelection;
  subCategory?: DeviceSelection;
};

const deviceSelectionPayload = (key: string, selection?: DeviceSelection): Record<string, string[]> => {
  // Share multi-value serialization across device option endpoints and cascading filters.
  if (selection === undefined || selection === null) return {};
  const values = (Array.isArray(selection) ? selection : [selection])
    .filter((value) => String(value).trim() !== '')
    .map(String);
  return values.length ? { [`${key}[]`]: values } : {};
};

export async function fetchOrientations(
  locationType?: DeviceSelection,
  filters: DeviceParentFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/device/orientations', {
      ...deviceSelectionPayload('location_type', locationType),
      ...deviceSelectionPayload('state', filters.state),
      ...deviceSelectionPayload('city', filters.city),
      ...deviceSelectionPayload('zone', filters.zone),
      ...deviceSelectionPayload('sub_zone_area', filters.subZone),
      ...deviceSelectionPayload('pincode', filters.pincode),
      ...deviceSelectionPayload('arterial_route', filters.arterialRoute),
      ...deviceSelectionPayload('publisher', filters.publisher),
      ...deviceSelectionPayload('main_category_name', filters.mainCategory),
      ...deviceSelectionPayload('category_name', filters.category),
      ...deviceSelectionPayload('sub_category_name', filters.subCategory),
      ...deviceSelectionPayload('property', filters.property),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch orientations:', error);
    return [];
  }
}

export async function fetchResolutions(
  orientation?: DeviceSelection,
  filters: DeviceParentFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/device/resolutions', {
      ...deviceSelectionPayload('orientation', orientation),
      ...deviceSelectionPayload('state', filters.state),
      ...deviceSelectionPayload('city', filters.city),
      ...deviceSelectionPayload('zone', filters.zone),
      ...deviceSelectionPayload('sub_zone_area', filters.subZone),
      ...deviceSelectionPayload('pincode', filters.pincode),
      ...deviceSelectionPayload('arterial_route', filters.arterialRoute),
      ...deviceSelectionPayload('publisher', filters.publisher),
      ...deviceSelectionPayload('location_type', filters.locationType),
      ...deviceSelectionPayload('main_category_name', filters.mainCategory),
      ...deviceSelectionPayload('category_name', filters.category),
      ...deviceSelectionPayload('sub_category_name', filters.subCategory),
      ...deviceSelectionPayload('property', filters.property),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch resolutions:', error);
    return [];
  }
}

export async function fetchScreenLocations(
  resolution?: DeviceSelection,
  filters: DeviceParentFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/device/screen-locations', {
      ...deviceSelectionPayload('resolution', resolution),
      ...deviceSelectionPayload('state', filters.state),
      ...deviceSelectionPayload('city', filters.city),
      ...deviceSelectionPayload('zone', filters.zone),
      ...deviceSelectionPayload('sub_zone_area', filters.subZone),
      ...deviceSelectionPayload('pincode', filters.pincode),
      ...deviceSelectionPayload('arterial_route', filters.arterialRoute),
      ...deviceSelectionPayload('publisher', filters.publisher),
      ...deviceSelectionPayload('location_type', filters.locationType),
      ...deviceSelectionPayload('orientation', filters.orientation),
      ...deviceSelectionPayload('main_category_name', filters.mainCategory),
      ...deviceSelectionPayload('category_name', filters.category),
      ...deviceSelectionPayload('sub_category_name', filters.subCategory),
      ...deviceSelectionPayload('property', filters.property),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch screen locations:', error);
    return [];
  }
}

export async function fetchStretches(
  screenLocation?: DeviceSelection,
  filters: DeviceParentFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/device/stretches', {
      ...deviceSelectionPayload('screen_location', screenLocation),
      ...deviceSelectionPayload('state', filters.state),
      ...deviceSelectionPayload('city', filters.city),
      ...deviceSelectionPayload('zone', filters.zone),
      ...deviceSelectionPayload('sub_zone_area', filters.subZone),
      ...deviceSelectionPayload('pincode', filters.pincode),
      ...deviceSelectionPayload('arterial_route', filters.arterialRoute),
      ...deviceSelectionPayload('publisher', filters.publisher),
      ...deviceSelectionPayload('location_type', filters.locationType),
      ...deviceSelectionPayload('orientation', filters.orientation),
      ...deviceSelectionPayload('resolution', filters.resolution),
      ...deviceSelectionPayload('main_category_name', filters.mainCategory),
      ...deviceSelectionPayload('category_name', filters.category),
      ...deviceSelectionPayload('sub_category_name', filters.subCategory),
      ...deviceSelectionPayload('property', filters.property),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch stretches:', error);
    return [];
  }
}

type PropertyFilters = DeviceParentFilters & {
  publisher?: DeviceSelection;
  locationType?: DeviceSelection;
  orientation?: DeviceSelection;
  resolution?: DeviceSelection;
  screenLocation?: DeviceSelection;
};

export async function fetchProperties(
  stretch?: DeviceSelection,
  filters: PropertyFilters = {}
): Promise<LocationOption[]> {
  try {
    return await makeApiRequest('/device/properties', {
      ...deviceSelectionPayload('stretch', stretch),
      ...deviceSelectionPayload('state', filters.state),
      ...deviceSelectionPayload('city', filters.city),
      ...deviceSelectionPayload('zone', filters.zone),
      ...deviceSelectionPayload('sub_zone_area', filters.subZone),
      ...deviceSelectionPayload('pincode', filters.pincode),
      ...deviceSelectionPayload('arterial_route', filters.arterialRoute),
      ...deviceSelectionPayload('publisher', filters.publisher),
      ...deviceSelectionPayload('location_type', filters.locationType),
      ...deviceSelectionPayload('orientation', filters.orientation),
      ...deviceSelectionPayload('resolution', filters.resolution),
      ...deviceSelectionPayload('screen_location', filters.screenLocation),
      ...deviceSelectionPayload('main_category_name', filters.mainCategory),
      ...deviceSelectionPayload('category_name', filters.category),
      ...deviceSelectionPayload('sub_category_name', filters.subCategory),
      ...deviceSelectionPayload('property', filters.property),
    });
  } catch (error) {
    console.warn('Warning: Could not fetch properties:', error);
    return [];
  }
}

// ============ BATCH FETCH - For initial load ============

export async function fetchAllFilterOptions(): Promise<CascadingFilterOptions> {
  try {
    const [
      countries,
      modeOfMedia,
      publishers,
      mainCategories,
      locationTypes,
      orientations,
      resolutions,
      screenLocations,
      stretches,
      properties,
    ] = await Promise.all([
      fetchCountries(),
      fetchModeOfMedia(),
      fetchPublishers(undefined),
      fetchMainCategories(undefined),
      fetchLocationTypes(),
      fetchOrientations(undefined),
      fetchResolutions(undefined),
      fetchScreenLocations(undefined),
      fetchStretches(undefined),
      fetchProperties(undefined),
    ]);

    return {
      countries,
      states: [],
      cities: [],
      zones: [],
      subZones: [],
      pincodes: [],
      arterialRoutes: [],
      modeOfMedia,
      publishers,
      mainCategories,
      categories: [],
      subCategories: [],
      locationTypes,
      orientations,
      resolutions,
      screenLocations,
      stretches,
      properties,
    };
  } catch (error) {
    console.warn('Warning: Could not fetch all filter options:', error);
    return {
      countries: [],
      states: [],
      cities: [],
      zones: [],
      subZones: [],
      pincodes: [],
      arterialRoutes: [],
      modeOfMedia: [],
      publishers: [],
      mainCategories: [],
      categories: [],
      subCategories: [],
      locationTypes: [],
      orientations: [],
      resolutions: [],
      screenLocations: [],
      stretches: [],
      properties: [],
    };
  }
}

// ============ CACHE CONTROL & DEBUGGING ============

/**
 * Clear all cached data (useful for development/debugging)
 */
export function clearApiCache(): void {
  apiCache.clear();
  pendingRequests.clear();
  console.info('API cache cleared');
}

/**
 * Get cache statistics for debugging
 */
export function getApiCacheStats(): { cacheEntries: number; pendingRequests: number } {
  return {
    cacheEntries: apiCache.size,
    pendingRequests: pendingRequests.size,
  };
}
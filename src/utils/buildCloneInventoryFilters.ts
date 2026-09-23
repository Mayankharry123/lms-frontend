import {
  CLONE_DEFAULT_COUNTRY,
  CLONE_FILTER_DESCENDANTS,
} from '../constants/inventory/clone';
import {
  type BuildCloneInventoryFiltersInput,
  type CloneInventoryQueryFilters,
} from '../types/inventory/clone-inventory.types';
import type { LocationFilterValues } from '../types/inventory/location-filter.types';

function optionalCsv(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Clone inventory query: always send selected country (India by default). Extra fields only when set. */
export function buildCloneInventoryFilters({
  searchQuery,
  location,
}: BuildCloneInventoryFiltersInput): CloneInventoryQueryFilters {
  return {
    search: optionalCsv(searchQuery),
    country: optionalCsv(location.country) || CLONE_DEFAULT_COUNTRY,
    state: optionalCsv(location.state),
    city: optionalCsv(location.city),
    zone: optionalCsv(location.zoneArea),
    subZoneArea: optionalCsv(location.subZoneArea),
    pincode: optionalCsv(location.pincode),
    arterialRoute: optionalCsv(location.arterialRoute),
    modeOfMedia: optionalCsv(location.modeOfMedia),
    publisher: optionalCsv(location.publisher),
    mainCategory: optionalCsv(location.mainCategory),
    categorySub: optionalCsv(location.categorySub),
    category: optionalCsv(location.category),
    locationType: optionalCsv(location.locationType),
    orientation: optionalCsv(location.orientation),
    resolution: optionalCsv(location.resolution),
    screenLocation: optionalCsv(location.screenLocation),
    stretch: optionalCsv(location.stretch),
    property: optionalCsv(location.property),
  };
}

export function cloneQueryHasLocationFocus(filters: CloneInventoryQueryFilters): boolean {
  return Boolean(
    filters.state ||
      filters.city ||
      filters.zone ||
      filters.subZoneArea ||
      filters.pincode ||
      filters.arterialRoute ||
      filters.modeOfMedia ||
      filters.publisher ||
      filters.mainCategory ||
      filters.categorySub ||
      filters.category ||
      filters.locationType ||
      filters.orientation ||
      filters.resolution ||
      filters.screenLocation ||
      filters.stretch ||
      filters.property
  );
}

export function clearCloneLocationFilter(
  values: LocationFilterValues,
  fieldName: keyof LocationFilterValues
): LocationFilterValues {
  if (fieldName === 'country') return values;

  const next: LocationFilterValues = { ...values, [fieldName]: '' };

  if (fieldName === 'city') {
    next.state = '';
    (CLONE_FILTER_DESCENDANTS.state || []).forEach((child) => {
      next[child] = '';
    });
    return next;
  }

  if (fieldName === 'state') {
    // State removed → country-level (all of India when country is India).
    (CLONE_FILTER_DESCENDANTS.state || []).forEach((child) => {
      next[child] = '';
    });
    return next;
  }

  (CLONE_FILTER_DESCENDANTS[fieldName] || []).forEach((child) => {
    next[child] = '';
  });
  return next;
}

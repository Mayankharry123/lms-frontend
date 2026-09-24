import type { ListDeviceInventoryParams } from '../inventory.types';
import type { LocationFilterValues } from './location-filter.types';

export type CloneInventoryQueryFilters = Omit<
  ListDeviceInventoryParams,
  'page' | 'per_page' | 'fields'
>;

export type BuildCloneInventoryFiltersInput = {
  searchQuery: string;
  location: LocationFilterValues;
};

import type { LocationFilterValues } from '../../types/inventory/location-filter.types';

export const CLONE_DEFAULT_COUNTRY = 'India';

export const CLONE_NEXT_FILTER: Partial<
  Record<keyof LocationFilterValues, keyof LocationFilterValues>
> = {
  state: 'city',
  city: 'zoneArea',
  zoneArea: 'subZoneArea',
  subZoneArea: 'pincode',
  pincode: 'arterialRoute',
  modeOfMedia: 'publisher',
  mainCategory: 'category',
  category: 'categorySub',
  locationType: 'orientation',
  orientation: 'resolution',
  resolution: 'screenLocation',
  screenLocation: 'stretch',
};

export const CLONE_LOCATION_PROGRESSION: Array<keyof LocationFilterValues> = [
  'state',
  'city',
  'zoneArea',
  'subZoneArea',
  'pincode',
  'arterialRoute',
];

export const CLONE_FILTER_DESCENDANTS: Partial<
  Record<keyof LocationFilterValues, Array<keyof LocationFilterValues>>
> = {
  state: ['city', 'zoneArea', 'subZoneArea', 'pincode', 'arterialRoute'],
  city: ['zoneArea', 'subZoneArea', 'pincode', 'arterialRoute'],
  zoneArea: ['subZoneArea', 'pincode', 'arterialRoute'],
  subZoneArea: ['pincode', 'arterialRoute'],
  pincode: ['arterialRoute'],
  modeOfMedia: ['publisher'],
  mainCategory: ['category', 'categorySub'],
  category: ['categorySub'],
  locationType: ['orientation', 'resolution', 'screenLocation', 'stretch'],
  orientation: ['resolution', 'screenLocation', 'stretch'],
  resolution: ['screenLocation', 'stretch'],
  screenLocation: ['stretch'],
};

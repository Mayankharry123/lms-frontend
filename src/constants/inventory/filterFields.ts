import type { ComponentType } from 'react';
import { Building2, Layers, MapPin, Monitor } from 'lucide-react';
import type { LocationFilterValues } from '../../types/inventory/location-filter.types';

export type FieldDefinition = {
  name: keyof LocationFilterValues;
  label: string;
  category: 'Location' | 'Category' | 'Publisher' | 'Device';
  icon: ComponentType<{ className?: string }>;
};

export const ALL_FILTER_FIELDS: FieldDefinition[] = [
  // Location
  { name: 'country', label: 'Country', category: 'Location', icon: MapPin },
  { name: 'state', label: 'State', category: 'Location', icon: MapPin },
  { name: 'city', label: 'City', category: 'Location', icon: MapPin },
  { name: 'zoneArea', label: 'Zone', category: 'Location', icon: MapPin },
  { name: 'subZoneArea', label: 'Sub Zone', category: 'Location', icon: MapPin },
  { name: 'pincode', label: 'Pincode', category: 'Location', icon: MapPin },
  { name: 'arterialRoute', label: 'Arterial Route', category: 'Location', icon: MapPin },
  // Category & Property
  { name: 'modeOfMedia', label: 'Mode of Media (Screen Type)', category: 'Category', icon: Layers },
  { name: 'mainCategory', label: 'Main Category', category: 'Category', icon: Layers },
  { name: 'category', label: 'Category', category: 'Category', icon: Layers },
  { name: 'categorySub', label: 'Sub Category', category: 'Category', icon: Layers },
  { name: 'property', label: 'Property', category: 'Category', icon: Building2 },
  // Publisher
  { name: 'publisher', label: 'Publisher', category: 'Publisher', icon: Building2 },
  // Device
  { name: 'locationType', label: 'Location Type', category: 'Device', icon: Monitor },
  { name: 'orientation', label: 'Orientation', category: 'Device', icon: Monitor },
  { name: 'resolution', label: 'Resolution', category: 'Device', icon: Monitor },
  { name: 'screenLocation', label: 'Screen Location', category: 'Device', icon: Monitor },
  { name: 'stretch', label: 'Stretch', category: 'Device', icon: Monitor },
];

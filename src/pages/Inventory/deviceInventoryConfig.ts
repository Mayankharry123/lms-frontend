import type { DeviceData } from '../../types/inventory.types';
import { DEFAULT_APPLIED_LOCATION } from '../../constants/inventory/defaults';

export { DEFAULT_APPLIED_LOCATION };

export type DeviceDetailSection = {
  title: string;
  fields: Array<keyof DeviceData | 'media_owner_name'>;
};

export const DEVICE_DETAIL_SECTIONS: DeviceDetailSection[] = [
  {
    title: 'Basic Information',
    fields: [
      'device_details_id',
      'device_id',
      'screen_id',
      'device_name',
      'status',
      'screen_type',
      'code',
      'media_owner_name',
    ],
  },
  {
    title: 'Category & Placement',
    fields: [
      'main_category_name',
      'category_name',
      'sub_category_name',
      'location_type',
      'screen_location',
      'mode_of_media',
      'illumination',
      'facing',
    ],
  },
  {
    title: 'Location',
    fields: [
      'country',
      'state',
      'city',
      'zone',
      'sub_zone_area',
      'pincode',
      'arterial_route',
      'stretch',
      'property',
      'touchpoint',
      'traffic_direction',
      'latitude',
      'longitude',
    ],
  },
  {
    title: 'Screen Specifications',
    fields: [
      'resolution',
      'aspect_ratio',
      'screen_size',
      'width',
      'height',
      'sq_ft',
      'total_sq_ft',
      'orientation',
      'elevation',
      'tilt_degree',
      'on_field_screen_count',
    ],
  },
  {
    title: 'Audience & Pricing',
    fields: [
      'monthly_footfall',
      'daily_impression',
      'max_traffic',
      'languages',
      'min_operating_price',
      'cost_for_impression',
      'cpi_cost',
      'cost_per_spot',
      'cost_per_audience_imp',
      'loop_timing',
      'slot_timing',
      'slot_details',
      'spots_day',
      'slot_per_month',
      'daily_hours_of_loop',
    ],
  },
  {
    title: 'Operating Hours',
    fields: [
      'monday_start_time',
      'monday_end_time',
      'tuesday_start_time',
      'tuesday_end_time',
      'wednesday_start_time',
      'wednesday_end_time',
      'thursday_start_time',
      'thursday_end_time',
      'friday_start_time',
      'friday_end_time',
      'saturday_start_time',
      'saturday_end_time',
      'sunday_start_time',
      'sunday_end_time',
    ],
  },
  {
    title: 'Account & Metadata',
    fields: [
      'company_name',
      'manager_name',
      'email_id',
      'second_email_id',
      'first_name',
      'last_name',
      'access_type',
      'device_limit',
      'expiry_date',
      'markup_applicable',
      'markup_type',
      'markup_value',
      'default_date',
      'update_date',
      'admin_flag',
    ],
  },
];

export const DEVICE_IMAGE_FIELDS: Array<keyof DeviceData> = [
  'device_image',
  'aws_device_image',
  'old_device_image',
];

export function formatDeviceFieldLabel(key: string): string {
  if (key === 'media_owner_name') return 'Media Owner';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isDeviceMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return false;
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) {
    return /cloudfront|amazonaws|s3\.|\/images\/|\/media\/|imagedelivery|unsplash|googleusercontent/i.test(
      trimmed
    );
  }
  return trimmed.includes('/images/') || trimmed.includes('cloudfront.net');
}

export function collectDeviceMediaImages(
  device: DeviceData
): Array<{ key: string; label: string; url: string }> {
  const images: Array<{ key: string; label: string; url: string }> = [];
  const seen = new Set<string>();

  const addUrl = (key: string, raw: string) => {
    String(raw)
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((url, index) => {
        if (!isDeviceMediaUrl(url)) {
          const isKnownImageField = DEVICE_IMAGE_FIELDS.includes(key as keyof DeviceData);
          const isHttp = /^https?:\/\//i.test(url) || url.startsWith('/');
          if (!isKnownImageField || !isHttp) return;
        }
        if (seen.has(url)) return;
        seen.add(url);
        images.push({
          key: `${key}-${index}`,
          label: formatDeviceFieldLabel(key),
          url,
        });
      });
  };

  DEVICE_IMAGE_FIELDS.forEach((key) => {
    const value = getDeviceFieldValue(device, key);
    if (value !== '-') addUrl(key, value);
  });

  Object.entries(device).forEach(([key, value]) => {
    if (DEVICE_IMAGE_FIELDS.includes(key as keyof DeviceData)) return;
    if (!/(image|photo|media|thumbnail|poster)/i.test(key)) return;
    if (typeof value !== 'string' || !value.trim()) return;
    addUrl(key, value);
  });

  return images;
}

export function getDeviceFieldValue(item: DeviceData, key: string): string {
  if (key === 'media_owner_name') return item.media_owner?.name?.trim() || '-';
  const value = item[key as keyof DeviceData];
  if (value == null || value === '') return '-';
  if (typeof value === 'object') return '-';
  return String(value);
}

export function cellText(value?: string | null): string {
  return value?.trim() || '-';
}

export function locationLabel(item: DeviceData): string {
  const parts = [item.city, item.state].filter(Boolean);
  return parts.length ? parts.join(', ') : '-';
}

export function categoryLabel(item: DeviceData): string {
  const parts = [item.main_category_name, item.category_name].filter(Boolean);
  return parts.length ? parts.join(' · ') : '-';
}

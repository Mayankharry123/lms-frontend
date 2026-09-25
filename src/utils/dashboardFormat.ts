import type { PendingAssignment } from '../services/Dashboard';

export const formatDashboardNumber = (value: number) => value.toLocaleString('en-IN');

export const formatDashboardCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export const formatCount = formatDashboardNumber;
export const formatCurrency = formatDashboardCurrency;

export type ChartPoint = {
  name: string;
  value: number;
};

export const truncateLabel = (label: string, maxLength = 14) =>
  label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;

export const formatDashboardDate = (value?: string | null) => {
  if (!value) return '';
  const text = String(value).trim().replace(/\s+(AM|PM)$/i, ' $1');
  const parsed = Date.parse(text.replace(/\s+(AM|PM)$/i, ''));
  if (!Number.isNaN(parsed)) {
    try {
      return new Date(parsed).toLocaleString();
    } catch {
      return text;
    }
  }
  return text;
};

export const formatAssignmentName = (name: PendingAssignment['name']): string => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return (
    (name as { full_name?: string; name?: string }).full_name ||
    (name as { name?: string }).name ||
    ''
  );
};

export const deriveAssignmentInitials = (assignment: PendingAssignment) => {
  if (assignment.initials) return assignment.initials;
  const name = formatAssignmentName(assignment.name);
  if (!name) return '';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const paginateItems = <T,>(items: T[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

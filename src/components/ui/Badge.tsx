import React from 'react';

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  status?: string;
  children?: React.ReactNode;
  color?: string;
  showDot?: boolean;
};

type StatusConfig = {
  bg: string;
  dot: string;
};

const statusMap: Record<string, StatusConfig> = {
  'not interested': { bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  'not-interested': { bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  'submission': { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'negotiation': { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  'approve': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'approved': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'closed': { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  'plan submitted': { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'plan reviewed': { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  'plan approved': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'pending': { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'submitted': { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'declined': { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  'denied': { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  'live': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'active': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const resolveStatusConfig = (key: string): StatusConfig => {
  if (statusMap[key]) return statusMap[key];
  if (key.includes('approve')) {
    return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  }
  if (key.includes('den') || key.includes('rej') || key.includes('close')) {
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  }
  if (key.includes('pend') || key.includes('submit')) {
    return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  }
  return { bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
};

const Badge: React.FC<Props> = ({
  status,
  children,
  className,
  color,
  showDot = true,
  onClick,
  tabIndex,
  ...rest
}) => {
  const content = children ?? status;
  const key = String(status || (children ?? '')).trim().toLowerCase();
  const config = resolveStatusConfig(key);
  const colorClasses = color || config.bg;

  // If an onClick is provided, expose keyboard focus via tabIndex if not already provided
  const computedTabIndex = typeof tabIndex === 'number' ? tabIndex : onClick ? 0 : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-xs font-medium leading-tight whitespace-nowrap transition-colors badge-item ${colorClasses} ${className ?? ''}`}
      aria-label={String(content ?? '')}
      onClick={onClick}
      tabIndex={computedTabIndex}
      role={onClick ? 'button' : undefined}
      {...rest}
    >
      {showDot && !color && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
      )}
      <span>{content}</span>
    </span>
  );
};

export default Badge;

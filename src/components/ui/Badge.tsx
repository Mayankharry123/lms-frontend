import React from 'react';

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  status?: string;
  children?: React.ReactNode;
};

const statusMap: Record<string, string> = {
  'not interested': 'bg-gray-100 text-gray-700',
  'not-interested': 'bg-gray-100 text-gray-700',
  'submission': 'bg-yellow-100 text-yellow-800',
  'negotiation': 'bg-orange-100 text-orange-800',
  'approve': 'bg-green-100 text-green-800',
  'approved': 'bg-green-100 text-green-800',
  'closed': 'bg-red-100 text-red-800',
  'plan submitted': 'bg-yellow-100 text-yellow-800',
  'plan reviewed': 'bg-orange-100 text-orange-800',
  'plan approved': 'bg-green-100 text-green-800',
  'pending': 'bg-yellow-100 text-yellow-800',
  'live': 'bg-green-100 text-green-800',
};

const Badge: React.FC<Props> = ({ status, children, className, onClick, tabIndex, ...rest }) => {
  const key = String(status || (children ?? '')).trim().toLowerCase();
  const classes = statusMap[key] || 'bg-gray-50 text-[var(--text-secondary)]';

  // If an onClick is provided, expose keyboard focus via tabIndex if not already provided
  const computedTabIndex = typeof tabIndex === 'number' ? tabIndex : onClick ? 0 : undefined;

  return (
    <span
      className={`inline-flex items-center justify-center h-7 w-28 border border-transparent rounded-full text-xs font-medium leading-tight whitespace-nowrap badge-item ${classes} ${className ?? ''}`}
      aria-label={String(children ?? status)}
      onClick={onClick}
      tabIndex={computedTabIndex}
      role={onClick ? 'button' : undefined}
      {...rest}
    >
      {children ?? status}
    </span>
  );
};

export default Badge;

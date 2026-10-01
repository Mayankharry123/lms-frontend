import React, { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type CollapsibleFormCardProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  titleClassName?: string;
  titleWrapperClassName?: string;
  /** Keep body scrollable (tables) instead of overflowing the card */
  scrollable?: boolean;
};

const ANIMATION_MS = 300;
const ACCENT = '#f26222';

const CollapsibleFormCard: React.FC<CollapsibleFormCardProps> = ({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  headerRight,
  icon,
  className = '',
  innerClassName = 'p-6 bg-gray-50 rounded-2xl',
  titleClassName = 'text-base font-semibold text-gray-800',
  titleWrapperClassName = 'mb-6',
  scrollable = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [overflowVisible, setOverflowVisible] = useState(!collapsible || defaultOpen);
  const contentId = useId();
  const isOpen = collapsible ? open : true;

  useEffect(() => {
    if (!collapsible) {
      setOverflowVisible(true);
      return;
    }
    if (!open) {
      setOverflowVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setOverflowVisible(true), ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [collapsible, open]);

  const toggle = () => {
    if (!collapsible) return;
    setOpen((prev) => !prev);
  };

  if (!collapsible) {
    return (
      <div className={`w-full bg-white rounded-2xl shadow-sm border border-gray-200 ${className}`}>
        <div className={innerClassName}>
          <div className={`flex items-center gap-3 ${titleWrapperClassName}`}>
            <h3 className={`min-w-0 flex-1 text-left ${titleClassName}`}>{title}</h3>
            {headerRight}
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative w-full min-w-0 rounded-2xl border bg-white transition-all duration-300 ${
        isOpen
          ? `${scrollable ? 'overflow-hidden' : 'overflow-visible'} border-orange-200 shadow-[0_10px_28px_rgba(242,98,34,0.10)]`
          : 'overflow-hidden border-gray-200 shadow-sm hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
      } ${className}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl transition-all duration-300 ${
          isOpen ? 'bg-[var(--accent,#f26222)]' : 'bg-transparent group-hover:bg-orange-200'
        }`}
        style={isOpen ? { backgroundColor: ACCENT } : undefined}
        aria-hidden
      />

      <div
        className="flex min-h-[3.75rem] cursor-pointer select-none items-center gap-3 px-4 py-3.5 pl-5 sm:min-h-16 sm:gap-4 sm:px-5 sm:py-4 sm:pl-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        {icon ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
              isOpen
                ? 'text-white shadow-sm'
                : 'bg-orange-50 text-[#f26222] group-hover:bg-[#f26222] group-hover:text-white'
            }`}
            style={isOpen ? { backgroundColor: ACCENT } : undefined}
          >
            {icon}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-left text-[15px] font-semibold tracking-tight sm:text-base ${titleClassName}`}>
            {title}
          </h3>
          <p className="mt-0.5 hidden text-left text-xs text-slate-400 sm:block">
            {isOpen ? 'Click to collapse this section' : 'Click to expand and edit details'}
          </p>
        </div>

        {headerRight ? (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {headerRight}
          </div>
        ) : null}

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            isOpen
              ? 'text-white shadow-sm'
              : 'border border-gray-200 bg-gray-50 text-gray-500 group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-[#f26222]'
          }`}
          style={isOpen ? { backgroundColor: ACCENT } : undefined}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      </div>

          <div
            id={contentId}
            className={`grid min-w-0 transition-[grid-template-rows] duration-300 ease-in-out ${
              isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className={`min-h-0 ${
              scrollable
                ? 'overflow-auto'
                : overflowVisible
                  ? 'overflow-visible'
                  : 'overflow-hidden'
            }`}>
          <div className={`border-t border-orange-100/80 ${innerClassName}`}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleFormCard;

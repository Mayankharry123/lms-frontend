import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Check, ChevronDown, LayoutGrid, RotateCcw } from 'lucide-react';
import {
  DASHBOARD_CARD_DEFINITIONS,
  type DashboardCardPreferences,
  type DashboardView,
} from '../../utils/dashboardCardVisibility';

type DashboardCardVisibilityDropdownProps = {
  activeView: DashboardView;
  preferences: DashboardCardPreferences;
  onToggle: (view: DashboardView, cardId: string) => void;
  onReset: () => void;
};

const VIEW_LABELS: Record<DashboardView, string> = {
  overview: 'Overview',
  sales: 'Sales',
  planner: 'Planner',
};

const DashboardCardVisibilityDropdown: React.FC<DashboardCardVisibilityDropdownProps> = ({
  activeView,
  preferences,
  onToggle,
  onReset,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const activeCards = DASHBOARD_CARD_DEFINITIONS[activeView];
  const selectedCount = activeCards.filter((card) => preferences[activeView][card.id] !== false).length;
  const allCount = activeCards.length;
  const summary = selectedCount === allCount ? 'All Cards' : `${selectedCount} of ${allCount} selected`;

  const groupedCards = useMemo(
    () => (Object.keys(DASHBOARD_CARD_DEFINITIONS) as DashboardView[]),
    [],
  );

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  return (
    <div ref={ref} className="dashboard-card-filter">
      <button
        type="button"
        className={`dashboard-card-filter__trigger ${selectedCount < allCount ? 'is-filtered' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <LayoutGrid aria-hidden />
        <span>{summary}</span>
        <ChevronDown aria-hidden />
      </button>

      {open ? (
        <div className="dashboard-card-filter__menu">
          <div className="dashboard-card-filter__menu-header">
            <div>
              <strong>Customize Cards</strong>
              <span>{VIEW_LABELS[activeView]} cards</span>
            </div>
            <button type="button" className="dashboard-card-filter__reset" onClick={onReset}>
              <RotateCcw aria-hidden />
              Reset to Default
            </button>
          </div>

          {groupedCards.map((view) => (
            <fieldset key={view} className="dashboard-card-filter__group">
              <legend>{VIEW_LABELS[view]}</legend>
              {DASHBOARD_CARD_DEFINITIONS[view].map((card) => {
                const checked = preferences[view][card.id] !== false;
                return (
                  <label key={card.id} className="dashboard-card-filter__option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(view, card.id)}
                    />
                    <span>{card.label}</span>
                    {checked ? <Check aria-hidden /> : null}
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default DashboardCardVisibilityDropdown;
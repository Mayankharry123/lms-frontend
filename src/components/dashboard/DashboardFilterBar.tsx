import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Building2,
  CalendarDays,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import DashboardDateRangePicker from './DashboardDateRangePicker';
import DashboardCardVisibilityDropdown from './DashboardCardVisibilityDropdown';
import { listOrganisationsForSelect } from '../../api/users';
import type { DashboardFilterState } from '../../utils/dashboardFilters';
import {
  filterOrganisationOptionsForUser,
  sanitizeDashboardOrganisationIds,
} from '../../utils/dashboardUserScope';
import type { RootState } from '../../redux/store';
import type { DashboardCardPreferences, DashboardView } from '../../utils/dashboardCardVisibility';

type DashboardFilterBarProps = {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  onDateApply: (next: Pick<DashboardFilterState, 'preset' | 'dateFrom' | 'dateTo'>) => void;
  activeView: DashboardView;
  cardPreferences: DashboardCardPreferences;
  onToggleCard: (view: DashboardView, cardId: string) => void;
  onResetCards: () => void;
};

const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  value,
  onChange,
  onDateApply,
  activeView,
  cardPreferences,
  onToggleCard,
  onResetCards,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [organisationOptions, setOrganisationOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(true);

  const visibleOrganisationOptions = useMemo(
    () => filterOrganisationOptionsForUser(user, organisationOptions),
    [user, organisationOptions],
  );

  const organisationLabel = 'Organisation';

  const organisationPlaceholder = useMemo(() => {
    if (loadingOrganisations) return 'Loading organisations...';
    if (visibleOrganisationOptions.length === 0) return 'No organisations assigned';
    if (visibleOrganisationOptions.length === 1) return visibleOrganisationOptions[0].label;
    return 'Select organisation(s)';
  }, [loadingOrganisations, visibleOrganisationOptions]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (value.organisationIds && value.organisationIds.length > 0) {
      count += value.organisationIds.length;
    }
    if (value.preset && value.preset !== 'none') {
      count++;
    }
    return count;
  }, [value]);

  const handleOrganisationChange = (organisationIds: string[]) => {
    onChange({
      ...value,
      organisationIds: sanitizeDashboardOrganisationIds(user, organisationIds),
    });
  };

  useEffect(() => {
    let mounted = true;

    listOrganisationsForSelect()
      .then((options) => {
        if (!mounted) return;
        setOrganisationOptions(
          options.map((option) => ({
            value: String(option.value),
            label: option.label,
          }))
        );
      })
      .catch(() => {
        if (mounted) setOrganisationOptions([]);
      })
      .finally(() => {
        if (mounted) setLoadingOrganisations(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="dashboard-filter-bar">
      <div className="dashboard-filter-bar__header">
        <div className="dashboard-filter-bar__header-left">
          <div className="dashboard-filter-bar__badge-icon">
            <SlidersHorizontal className="dashboard-filter-bar__title-icon" aria-hidden />
          </div>
          <div className="dashboard-filter-bar__title-wrap">
            <span className="dashboard-filter-bar__title">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="dashboard-filter-bar__active-badge">
                {activeFiltersCount} active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-filter-bar__grid">
        <div className="dashboard-filter-field dashboard-filter-field--org">
          <label className="dashboard-filter-field__label">
            <Building2 className="dashboard-filter-field__label-icon" aria-hidden />
            <span>{organisationLabel}</span>
          </label>
          <div className="dashboard-filter-field__control">
            <Building2 className="dashboard-filter-field__icon" aria-hidden />
            <MultiSelectDropdown
              name="organisation_ids"
              placeholder={organisationPlaceholder}
              options={visibleOrganisationOptions}
              value={sanitizeDashboardOrganisationIds(user, value.organisationIds)}
              onChange={handleOrganisationChange}
              disabled={loadingOrganisations || visibleOrganisationOptions.length === 0}
              horizontalScroll
              className="w-full"
              inputClassName="dashboard-filter-input pl-9"
            />
          </div>
        </div>

        <div className="dashboard-filter-field dashboard-filter-field--date">
          <label className="dashboard-filter-field__label">
            <CalendarDays className="dashboard-filter-field__label-icon" aria-hidden />
            <span>Date Range</span>
          </label>
          <div className="dashboard-filter-field__control">
            <DashboardDateRangePicker value={value} onApply={onDateApply} />
          </div>
        </div>

        <div className="dashboard-filter-field dashboard-filter-field--cards">
          <label className="dashboard-filter-field__label">
            <LayoutGrid className="dashboard-filter-field__label-icon" aria-hidden />
            <span>Cards</span>
          </label>
          <div className="dashboard-filter-field__control">
            <DashboardCardVisibilityDropdown
              activeView={activeView}
              preferences={cardPreferences}
              onToggle={onToggleCard}
              onReset={onResetCards}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilterBar;

/**
 * Clone-page map filter overlay. Does not change the original inventory FilterPopup.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { ALL_FILTER_FIELDS } from '../../constants/inventory/filterFields';
import type { LocationFilterValues } from '../../types/inventory/location-filter.types';
import {
  CLONE_DEFAULT_COUNTRY,
  CLONE_FILTER_DESCENDANTS,
  CLONE_LOCATION_PROGRESSION,
  CLONE_NEXT_FILTER,
} from '../../constants/inventory/clone';
import {
  fetchArterialRoutes,
  fetchCategories,
  fetchCities,
  fetchCountries,
  fetchLocationTypes,
  fetchMainCategories,
  fetchModeOfMedia,
  fetchOrientations,
  fetchPincodes,
  fetchProperties,
  fetchPublishers,
  fetchResolutions,
  fetchScreenLocations,
  fetchStates,
  fetchStretches,
  fetchSubCategories,
  fetchSubZones,
  fetchZones,
  type LocationOption,
} from '../../services/LocationCategoryDevice';
import { isAbortError } from '../../utils/requestControl';
import { DEFAULT_APPLIED_LOCATION } from '../../constants/inventory/defaults';

type FilterOptions = Record<string, LocationOption[]>;

function splitCsvTokens(value: string): string[] {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function joinCsvTokens(tokens: string[]): string {
  return tokens.filter(Boolean).join(',');
}

function idsCsvToLabelsCsv(
  rawValue: string,
  opts: LocationOption[],
  labelFn: (opt: LocationOption) => string
): string {
  const ids = splitCsvTokens(rawValue);
  if (!ids.length) return '';
  return joinCsvTokens(
    ids.map((idStr) => {
      const opt = opts.find((o) => String(o.id) === idStr);
      return opt ? labelFn(opt) : idStr;
    })
  );
}

const ALWAYS_VISIBLE: Array<keyof LocationFilterValues> = ['country', 'state'];
const OPTION_DEBOUNCE_MS = 350;
const APPLY_DEBOUNCE_MS = 400;

function cloneFilterFieldLabel(field: { name: string; label: string }): string {
  const label = field.label.replace(' (Screen Type)', '');
  if (field.name === 'category') return 'Property / Category';
  return label;
}

function visibleFieldsFromValues(values: LocationFilterValues): Set<keyof LocationFilterValues> {
  const next = new Set<keyof LocationFilterValues>(ALWAYS_VISIBLE);
  CLONE_LOCATION_PROGRESSION.forEach((field) => {
    if (!values[field].trim()) return;
    next.add(field);
    const following = CLONE_NEXT_FILTER[field];
    if (following) next.add(following);
  });
  ALL_FILTER_FIELDS.forEach((field) => {
    if (!ALWAYS_VISIBLE.includes(field.name) && values[field.name].trim()) {
      next.add(field.name);
      const following = CLONE_NEXT_FILTER[field.name];
      if (following) next.add(following);
    }
  });
  return next;
}

function nextFieldsToLoad(values: LocationFilterValues): Array<keyof LocationFilterValues> {
  const fields: Array<keyof LocationFilterValues> = [];
  CLONE_LOCATION_PROGRESSION.forEach((field) => {
    if (!values[field].trim()) return;
    const following = CLONE_NEXT_FILTER[field];
    if (following) fields.push(following);
  });
  return fields;
}

type CloneFilterPanelProps = {
  appliedValues: LocationFilterValues;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (values: LocationFilterValues) => void;
  onReset: () => void;
  externalSyncKey?: number;
};

const DeviceInventoryCloneFilterPanel: React.FC<CloneFilterPanelProps> = ({
  appliedValues,
  isOpen,
  onOpenChange,
  onApply,
  onReset,
  externalSyncKey = 0,
}) => {
  const [draft, setDraft] = useState<LocationFilterValues>(appliedValues);
  const [visibleFields, setVisibleFields] = useState<Set<keyof LocationFilterValues>>(
    () => new Set(ALWAYS_VISIBLE)
  );
  const [allOptions, setAllOptions] = useState<FilterOptions>({});
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set());
  const [cardSearchQueries, setCardSearchQueries] = useState<Record<string, string>>({});
  const [collapsedCards, setCollapsedCards] = useState<Set<keyof LocationFilterValues>>(
    () => new Set<keyof LocationFilterValues>(['country'])
  );
  const allOptionsRef = useRef<FilterOptions>({});
  const draftRef = useRef(draft);
  const debounceTimersRef = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({});
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openLoadIdRef = useRef(0);
  const appliedValuesRef = useRef(appliedValues);
  appliedValuesRef.current = appliedValues;
  allOptionsRef.current = allOptions;
  draftRef.current = draft;

  const hasState = Boolean(draft.state.trim());

  const getNormalizedOptionLabel = useCallback((opt: LocationOption): string => {
    return String(opt.name || opt.label || opt.id || '').trim();
  }, []);

  const setFieldLoading = useCallback((fieldName: string, isLoading: boolean) => {
    setLoadingFields((previous) => {
      const next = new Set(previous);
      if (isLoading) next.add(fieldName);
      else next.delete(fieldName);
      return next;
    });
  }, []);

  const selectedValues = useCallback(
    (fieldName: keyof LocationFilterValues) =>
      splitCsvTokens(draftRef.current[fieldName])
        .map((token) => {
          const option = (allOptionsRef.current[fieldName] || []).find(
            (item) => String(item.id) === token || getNormalizedOptionLabel(item) === token
          );
          return option?.value ?? option?.id ?? token;
        })
        .filter((value): value is string | number => value !== undefined && value !== null),
    [getNormalizedOptionLabel]
  );

  const locationFilters = useCallback(() => {
    const values = draftRef.current;
    return {
      country: values.country ? [values.country] : [],
      state: selectedValues('state'),
      city: selectedValues('city'),
      zone: selectedValues('zoneArea'),
      subZone: selectedValues('subZoneArea'),
      pincode: selectedValues('pincode'),
      arterialRoute: selectedValues('arterialRoute'),
      publisher: selectedValues('publisher'),
      mainCategory: selectedValues('mainCategory'),
      category: selectedValues('category'),
      subCategory: selectedValues('categorySub'),
      property: selectedValues('property'),
      locationType: selectedValues('locationType'),
      orientation: selectedValues('orientation'),
      resolution: selectedValues('resolution'),
      screenLocation: selectedValues('screenLocation'),
    };
  }, [selectedValues]);

  const loadFieldOptions = useCallback(
    async (fieldName: keyof LocationFilterValues) => {
      const values = draftRef.current;
      const filters = locationFilters();
      setFieldLoading(fieldName, true);
      try {
        let options: LocationOption[] = [];
        switch (fieldName) {
          case 'country':
            options = await fetchCountries();
            break;
          case 'state':
            options = values.country ? await fetchStates(values.country) : [];
            break;
          case 'city':
            options = await fetchCities(filters.state, filters);
            break;
          case 'zoneArea':
            options = await fetchZones(undefined, filters);
            break;
          case 'subZoneArea':
            options = await fetchSubZones(undefined, filters);
            break;
          case 'pincode':
            options = await fetchPincodes(filters);
            break;
          case 'arterialRoute':
            options = await fetchArterialRoutes(undefined, filters);
            break;
          case 'modeOfMedia':
            options = await fetchModeOfMedia(filters);
            break;
          case 'publisher':
            options = await fetchPublishers(selectedValues('modeOfMedia'), filters);
            break;
          case 'mainCategory':
            options = await fetchMainCategories(undefined, filters);
            break;
          case 'category':
            options = await fetchCategories(filters.mainCategory, undefined, filters);
            break;
          case 'categorySub':
            options = await fetchSubCategories(filters.category, filters.mainCategory, undefined, filters);
            break;
          case 'property':
            options = await fetchProperties(undefined, filters);
            break;
          case 'locationType':
            options = await fetchLocationTypes(filters.publisher, filters);
            break;
          case 'orientation':
            options = await fetchOrientations(filters.locationType, filters);
            break;
          case 'resolution':
            options = await fetchResolutions(filters.orientation, filters);
            break;
          case 'screenLocation':
            options = await fetchScreenLocations(filters.resolution, filters);
            break;
          case 'stretch':
            options = await fetchStretches(filters.screenLocation, filters);
            break;
          default:
            options = [];
        }
        setAllOptions((previous) => ({ ...previous, [fieldName]: options }));
      } catch (error) {
        if (!isAbortError(error)) {
          console.warn(`Failed to load ${fieldName} options:`, error);
        }
      } finally {
        setFieldLoading(fieldName, false);
      }
    },
    [locationFilters, selectedValues, setFieldLoading]
  );

  const scheduleFieldLoad = useCallback(
    (fieldName: keyof LocationFilterValues) => {
      const timers = debounceTimersRef.current;
      if (timers[fieldName]) clearTimeout(timers[fieldName]);
      timers[fieldName] = setTimeout(() => {
        void loadFieldOptions(fieldName);
      }, OPTION_DEBOUNCE_MS);
    },
    [loadFieldOptions]
  );

  useEffect(() => {
    if (!isOpen) return;

    const nextDraft: LocationFilterValues = {
      ...appliedValues,
      country: appliedValues.country.trim() || CLONE_DEFAULT_COUNTRY,
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setVisibleFields(visibleFieldsFromValues(nextDraft));
    nextFieldsToLoad(nextDraft).forEach((fieldName) => scheduleFieldLoad(fieldName));

    const loadId = openLoadIdRef.current + 1;
    openLoadIdRef.current = loadId;
    let cancelled = false;

    const load = async () => {
      setFieldLoading('country', true);
      setFieldLoading('state', true);
      try {
        const countries = await fetchCountries();
        if (cancelled || openLoadIdRef.current !== loadId) return;
        const selectedCountry = nextDraft.country || CLONE_DEFAULT_COUNTRY;
        const states = await fetchStates(selectedCountry);
        if (cancelled || openLoadIdRef.current !== loadId) return;
        setAllOptions((previous) => ({ ...previous, country: countries, state: states }));
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          console.warn('Failed to load country/state options:', error);
        }
      } finally {
        if (!cancelled && openLoadIdRef.current === loadId) {
          setFieldLoading('country', false);
          setFieldLoading('state', false);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, setFieldLoading]);

  useEffect(() => {
    if (externalSyncKey <= 0) return;
    if (applyTimerRef.current) {
      clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
    const source = appliedValuesRef.current;
    const nextDraft: LocationFilterValues = {
      ...source,
      country: source.country.trim() || CLONE_DEFAULT_COUNTRY,
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setVisibleFields(visibleFieldsFromValues(nextDraft));
    nextFieldsToLoad(nextDraft).forEach((fieldName) => scheduleFieldLoad(fieldName));
  }, [externalSyncKey, scheduleFieldLoad]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
  }, []);

  const emitLabels = useCallback((values: LocationFilterValues): LocationFilterValues => {
    const outgoing: LocationFilterValues = { ...values };
    ALL_FILTER_FIELDS.forEach((field) => {
      if (field.name === 'country') return;
      outgoing[field.name] = idsCsvToLabelsCsv(
        String(values[field.name] ?? ''),
        allOptionsRef.current[field.name] || [],
        getNormalizedOptionLabel
      );
    });
    return outgoing;
  }, [getNormalizedOptionLabel]);

  const scheduleApply = useCallback(
    (values: LocationFilterValues) => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      applyTimerRef.current = setTimeout(() => {
        onApply(emitLabels(values));
      }, APPLY_DEBOUNCE_MS);
    },
    [emitLabels, onApply]
  );

  const handleFieldChange = useCallback(
    (fieldName: keyof LocationFilterValues, value: string) => {
      if (fieldName === 'country') {
        const next: LocationFilterValues = {
          ...DEFAULT_APPLIED_LOCATION,
          country: value.trim() || CLONE_DEFAULT_COUNTRY,
        };
        draftRef.current = next;
        setDraft(next);
        setVisibleFields(new Set(ALWAYS_VISIBLE));
        setAllOptions((previous) => ({ ...previous, state: [] }));
        scheduleFieldLoad('state');
        scheduleApply(next);
        return;
      }

      const previousValue = draftRef.current[fieldName];
      const next = { ...draftRef.current, [fieldName]: value };
      if (previousValue !== value) {
        (CLONE_FILTER_DESCENDANTS[fieldName] || []).forEach((child) => {
          next[child] = '';
        });
      }

      const following = CLONE_NEXT_FILTER[fieldName];
      setVisibleFields((previous) => {
        const visible = new Set(previous);
        (CLONE_FILTER_DESCENDANTS[fieldName] || []).forEach((child) => visible.delete(child));
        visibleFieldsFromValues(next).forEach((field) => visible.add(field));
        if (value.trim() && following) visible.add(following);
        return visible;
      });
      if (value.trim() && following) {
        scheduleFieldLoad(following);
      }

      draftRef.current = next;
      setDraft(next);
      scheduleApply(next);
    },
    [scheduleApply, scheduleFieldLoad]
  );

  const handleToggleOption = useCallback(
    (fieldName: keyof LocationFilterValues, option: LocationOption) => {
      const optionId = String(option.id);
      const optionLabel = getNormalizedOptionLabel(option);
      if (fieldName === 'country') {
        handleFieldChange('country', optionLabel);
        return;
      }
      const currentTokens = splitCsvTokens(draftRef.current[fieldName]);
      const isSelected = currentTokens.includes(optionId) || currentTokens.includes(optionLabel);
      const nextTokens = isSelected
        ? currentTokens.filter((token) => token !== optionId && token !== optionLabel)
        : [...currentTokens, optionId];
      handleFieldChange(fieldName, joinCsvTokens(nextTokens));
    },
    [getNormalizedOptionLabel, handleFieldChange]
  );

  const handleToggleSelectAllOptions = useCallback(
    (fieldName: keyof LocationFilterValues, options: LocationOption[]) => {
      if (fieldName === 'country' || !options.length) return;
      const currentTokens = splitCsvTokens(draftRef.current[fieldName]);
      const isFullySelected = options.every((option) => {
        const optionId = String(option.id);
        const optionLabel = getNormalizedOptionLabel(option);
        return currentTokens.includes(optionId) || currentTokens.includes(optionLabel);
      });

      if (isFullySelected) {
        handleFieldChange(fieldName, '');
        return;
      }

      handleFieldChange(
        fieldName,
        joinCsvTokens(options.map((option) => String(option.id)))
      );
    },
    [getNormalizedOptionLabel, handleFieldChange]
  );

  const handleToggleFieldVisibility = useCallback(
    (fieldName: keyof LocationFilterValues) => {
      if (ALWAYS_VISIBLE.includes(fieldName)) return;
      if (!draftRef.current.state.trim()) return;
      setVisibleFields((previous) => {
        const next = new Set(previous);
        if (next.has(fieldName)) {
          next.delete(fieldName);
          return next;
        }
        next.add(fieldName);
        scheduleFieldLoad(fieldName);
        return next;
      });
    },
    [scheduleFieldLoad]
  );

  const optionalFields = useMemo(
    () => ALL_FILTER_FIELDS.filter((field) => !ALWAYS_VISIBLE.includes(field.name)),
    []
  );

  const allOptionalSelected = optionalFields.every((field) => visibleFields.has(field.name));

  const handleReset = useCallback(() => {
    const next = DEFAULT_APPLIED_LOCATION;
    draftRef.current = next;
    setDraft(next);
    setVisibleFields(new Set(ALWAYS_VISIBLE));
    setCollapsedCards(new Set<keyof LocationFilterValues>(['country']));
    onReset();
    scheduleFieldLoad('state');
  }, [onReset, scheduleFieldLoad]);

  const renderFieldCard = (fieldName: keyof LocationFilterValues) => {
    const field = ALL_FILTER_FIELDS.find((item) => item.name === fieldName);
    if (!field) return null;
    const opts = allOptions[field.name] || [];
    const isLoading = loadingFields.has(field.name);
    const cardSearch = cardSearchQueries[field.name] || '';
    const selectedTokens = splitCsvTokens(draft[field.name]);
    const searchFilteredOptions = cardSearch.trim()
      ? opts.filter((option) =>
          getNormalizedOptionLabel(option).toLowerCase().includes(cardSearch.toLowerCase().trim())
        )
      : opts;
    const canSelectAll = field.name !== 'country' && searchFilteredOptions.length > 0;
    const allVisibleSelected =
      canSelectAll &&
      searchFilteredOptions.every((option) => {
        const optionId = String(option.id);
        const optionLabel = getNormalizedOptionLabel(option);
        return selectedTokens.includes(optionId) || selectedTokens.includes(optionLabel);
      });

    const isCollapsed = collapsedCards.has(field.name);

    return (
      <div key={field.name} className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5">
          <p className="text-xs font-semibold text-gray-900">
            {cloneFilterFieldLabel(field)}
            {field.name === 'state' ? ' *' : ''}
          </p>
          <div className="flex items-center gap-2">
            {selectedTokens.length > 0 && field.name !== 'country' && (
              <button
                type="button"
                onClick={() => handleFieldChange(field.name, '')}
                aria-label={`Clear ${cloneFilterFieldLabel(field)}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded p-0 text-red-600 hover:bg-red-50"
                style={{ backgroundColor: 'transparent', padding: 0 }}
              >
                <X className="h-3 w-3" strokeWidth={2.25} />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setCollapsedCards((previous) => {
                  const next = new Set(previous);
                  if (next.has(field.name)) next.delete(field.name);
                  else next.add(field.name);
                  return next;
                })
              }
              aria-label={
                isCollapsed
                  ? `Expand ${cloneFilterFieldLabel(field)}`
                  : `Collapse ${cloneFilterFieldLabel(field)}`
              }
              className="inline-flex h-6 w-6 items-center justify-center rounded p-0 text-gray-600 hover:bg-gray-100"
              style={{ backgroundColor: 'transparent', padding: 0 }}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
              ) : (
                <ChevronUp className="h-4 w-4" strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <>
        <div className="relative border-b border-gray-100 px-2 py-1.5">
          <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={cardSearch}
            onChange={(event) =>
              setCardSearchQueries((previous) => ({ ...previous, [field.name]: event.target.value }))
            }
            placeholder={`Search ${cloneFilterFieldLabel(field).toLowerCase()}...`}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-1 pl-7 pr-2 text-xs"
          />
        </div>
        <div className="max-h-32 overflow-y-auto p-1.5">
          {isLoading ? (
            <p className="py-6 text-center text-[11px] text-gray-500">Loading options…</p>
          ) : searchFilteredOptions.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-gray-400">No options available</p>
          ) : (
            <div className="flex flex-col gap-1">
              {canSelectAll && (
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllOptions(field.name, searchFilteredOptions)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs ${
                    allVisibleSelected
                      ? 'bg-teal-50 font-semibold text-[#007B83]'
                      : 'bg-gray-50 font-semibold text-gray-800'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      allVisibleSelected ? 'border-[#007B83] bg-[#007B83] text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {allVisibleSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  {allVisibleSelected ? 'Unselect All' : 'Select All'}
                </button>
              )}
              {searchFilteredOptions.map((option) => {
                const optionId = String(option.id);
                const label = getNormalizedOptionLabel(option);
                const isSelected =
                  field.name === 'country'
                    ? draft.country === label || draft.country === optionId
                    : selectedTokens.includes(optionId) || selectedTokens.includes(label);
                return (
                  <button
                    key={`${field.name}-${optionId}`}
                    type="button"
                    onClick={() => handleToggleOption(field.name, option)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs ${
                      isSelected ? 'bg-teal-50 font-medium text-[#007B83]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected ? 'border-[#007B83] bg-[#007B83] text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-expanded={isOpen}
        aria-label="Open map filters"
        className="pointer-events-auto absolute left-3 top-3 z-10 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 !bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:!bg-white"
        style={{ backgroundColor: '#ffffff' }}
      >
        <SlidersHorizontal className="text-2xl text-gray-800" strokeWidth={2} />
      </button>

      <aside
        aria-hidden={!isOpen}
        className={`absolute inset-y-0 left-0 z-20 flex w-[360px] max-w-[85%] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none -translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close filters"
            className="relative z-30 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white p-0 text-gray-700 shadow-sm hover:bg-gray-50"
            style={{ backgroundColor: '#ffffff', padding: 0 }}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="sticky top-0 z-10 shrink-0 border-b border-gray-100 bg-white px-3 py-2">
          <div className="flex items-center gap-4 overflow-x-auto pb-1">
                <label
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${
                    !hasState ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#007B83]"
                    checked={allOptionalSelected}
                    disabled={!hasState}
                    onChange={() => {
                      if (!hasState) return;
                      if (allOptionalSelected) {
                        setVisibleFields(new Set(ALWAYS_VISIBLE));
                        return;
                      }
                      setVisibleFields(new Set(ALL_FILTER_FIELDS.map((field) => field.name)));
                      optionalFields.forEach((field) => scheduleFieldLoad(field.name));
                    }}
                  />
                  All
                </label>
                {ALL_FILTER_FIELDS.map((field) => {
                  const locked = ALWAYS_VISIBLE.includes(field.name);
                  const checked = visibleFields.has(field.name);
                  const disabled = !locked && !hasState;
                  return (
                    <label
                      key={field.name}
                      title={
                        disabled
                          ? 'Select a state first'
                          : locked
                            ? 'Always visible'
                            : undefined
                      }
                      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs ${
                        checked ? 'font-medium text-gray-800' : 'text-gray-500'
                      } ${disabled || locked ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                        disabled ? 'opacity-40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#007B83]"
                        checked={checked}
                        disabled={disabled || locked}
                        onChange={() => handleToggleFieldVisibility(field.name)}
                      />
                      {cloneFilterFieldLabel(field)}
                    </label>
                  );
                })}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {renderFieldCard('country')}
          {renderFieldCard('state')}
          {hasState &&
            optionalFields
              .filter((field) => visibleFields.has(field.name))
              .map((field) => renderFieldCard(field.name))}
        </div>

        <div className="flex shrink-0 items-center border-t border-gray-100 px-3 py-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-200 !bg-white px-3 text-xs font-semibold text-[#007B83] shadow-sm transition-colors hover:border-teal-300 hover:!bg-teal-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </aside>
    </>
  );
};

function isDefaultAppliedLocation(values: LocationFilterValues): boolean {
  return ALL_FILTER_FIELDS.every((field) => {
    const current = String(values[field.name] ?? '').trim();
    const fallback = String(DEFAULT_APPLIED_LOCATION[field.name] ?? '').trim();
    return current === fallback;
  });
}

export function DeviceInventoryCloneAppliedChips({
  values,
  onRemove,
  onReset,
}: {
  values: LocationFilterValues;
  onRemove: (name: keyof LocationFilterValues) => void;
  onReset: () => void;
}) {
  const chips = ALL_FILTER_FIELDS.flatMap((field) => {
    const rawValue = String(values[field.name] ?? '').trim();
    if (!rawValue) return [];
    return [{ name: field.name, label: cloneFilterFieldLabel(field), value: rawValue }];
  });
  if (!chips.length) return null;

  const canReset = !isDefaultAppliedLocation(values);

  return (
    <div className="min-w-0 w-full overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
      <div className="flex w-max min-w-full items-center justify-end gap-2 py-0.5">
      <button
        type="button"
        onClick={onReset}
        disabled={!canReset}
        aria-label="Reset filters"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-teal-200 !bg-white px-3 text-xs font-semibold leading-none text-[#007B83] shadow-sm transition-colors hover:border-teal-300 hover:!bg-teal-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:opacity-60 disabled:hover:!bg-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
      {chips.map((chip) => (
        <span
          key={chip.name}
          className="inline-flex h-8 max-w-[240px] shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 !bg-white px-3 text-xs leading-none text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:!bg-gray-50"
        >
          <span className="font-semibold">{chip.label}:</span>
          <span className="truncate">{chip.value}</span>
          {chip.name !== 'country' && (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove(chip.name);
              }}
              aria-label={`Remove ${chip.label}`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              style={{ backgroundColor: 'transparent', padding: 0 }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      ))}
      </div>
    </div>
  );
}

export default DeviceInventoryCloneFilterPanel;

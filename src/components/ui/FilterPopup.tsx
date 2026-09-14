import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Search,
  X,
  MapPin,
  Layers,
  Building2,
  Monitor,
} from 'lucide-react';
import {
  fetchStates,
  fetchCities,
  fetchZones,
  fetchSubZones,
  fetchPincodes,
  fetchArterialRoutes,
  fetchModeOfMedia,
  fetchPublishers,
  fetchMainCategories,
  fetchCategories,
  fetchSubCategories,
  fetchLocationTypes,
  fetchOrientations,
  fetchResolutions,
  fetchScreenLocations,
  fetchStretches,
  fetchProperties,
  type LocationOption,
  fetchCountries,
} from '../../services/LocationCategoryDevice';

/** Comma-separated tokens (legacy labels or IDs during hydration). */
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
  const labels = ids.map((idStr) => {
    const opt = opts.find((o) => String(o.id) === idStr);
    return opt ? labelFn(opt) : idStr;
  });
  return joinCsvTokens(labels);
}

export type LocationFilterValues = {
  country: string;
  state: string;
  city: string;
  zoneArea: string;
  subZoneArea: string;
  pincode: string;
  arterialRoute: string;
  modeOfMedia: string;
  publisher: string;
  mainCategory: string;
  category: string;
  categorySub: string;
  locationType: string;
  orientation: string;
  resolution: string;
  screenLocation: string;
  stretch: string;
  property: string;
};

/** Fields edited via MultiSelectDropdown — draft holds comma-separated option IDs; labels are sent on Apply. */
const MULTI_SELECT_FIELDS: (keyof LocationFilterValues)[] = [
  'state',
  'city',
  'zoneArea',
  'subZoneArea',
  'pincode',
  'arterialRoute',
  'modeOfMedia',
  'publisher',
  'mainCategory',
  'category',
  'categorySub',
  'locationType',
  'orientation',
  'resolution',
  'screenLocation',
  'stretch',
  'property',
];

export type FilterSection = {
  title: string;
  fields: Array<{
    name: keyof LocationFilterValues;
    label: string;
  }>;
};

export type FilterOptions = Record<string, LocationOption[]>;
const EMPTY_FILTER_OPTIONS: FilterOptions = {};

export type FieldDefinition = {
  name: keyof LocationFilterValues;
  label: string;
  category: 'Location' | 'Category' | 'Publisher' | 'Device';
  icon: React.ComponentType<{ className?: string }>;
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

const FIELD_PREREQUISITES: Partial<Record<keyof LocationFilterValues, keyof LocationFilterValues>> = {
  state: 'country',
  city: 'state',
  zoneArea: 'city',
  subZoneArea: 'zoneArea',
  pincode: 'state',
  arterialRoute: 'city',
  category: 'mainCategory',
  categorySub: 'category',
  orientation: 'locationType',
  resolution: 'orientation',
  screenLocation: 'resolution',
  stretch: 'screenLocation',
};

function fieldHasValue(values: LocationFilterValues, name: keyof LocationFilterValues): boolean {
  return Boolean(String(values[name] ?? '').trim());
}

function fieldCanBeSelected(
  values: LocationFilterValues,
  name: keyof LocationFilterValues
): boolean {
  const prerequisite = FIELD_PREREQUISITES[name];
  return !prerequisite || fieldHasValue(values, prerequisite);
}

type FilterPopupProps = {
  isOpen?: boolean;
  onClose?: () => void;
  appliedValues: LocationFilterValues;
  onApply: (values: LocationFilterValues) => void;
  onReset: () => void;
  /** Optional filter sections with field definitions */
  filterSections?: FilterSection[];
  /** Options for each select field */
  options?: FilterOptions;
};

const FilterPopup: React.FC<FilterPopupProps> = ({
  isOpen = true,
  onClose,
  appliedValues,
  onApply,
  onReset,
  options = EMPTY_FILTER_OPTIONS,
}) => {
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const [draft, setDraft] = useState<LocationFilterValues>(appliedValues);
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set());
  const [allOptions, setAllOptions] = useState<FilterOptions>(options);
  const allOptionsRef = useRef<FilterOptions>(options);
  const initialOptionsLoadedRef = useRef(false);
  const categoryOptionsRef = useRef<LocationOption[]>([]);
  const categorySubOptionsRef = useRef<LocationOption[]>([]);
  const modeOptionsRef = useRef<LocationOption[]>([]);
  const publisherOptionsRef = useRef<LocationOption[]>([]);
  const mainCategoryOptionsRef = useRef<LocationOption[]>([]);
  const deviceOptionsRef = useRef<Record<string, LocationOption[]>>({});
  const hydratedCountryKeyRef = useRef<string | null>(null);
  const hydratedStateKeyRef = useRef<string | null>(null);
  const stateCascadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  allOptionsRef.current = allOptions;

  const [cardSearchQueries, setCardSearchQueries] = useState<Record<string, string>>({});
  const [extraVisibleFields, setExtraVisibleFields] = useState<Set<keyof LocationFilterValues>>(new Set());
  const [focusedField, setFocusedField] = useState<keyof LocationFilterValues | null>(null);
  const [pendingFocusField, setPendingFocusField] = useState<keyof LocationFilterValues | null>(null);
  const cardRefs = useRef<Partial<Record<keyof LocationFilterValues, HTMLDivElement | null>>>({});
  const focusClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleFields = useMemo(() => {
    const next = new Set<keyof LocationFilterValues>();
    extraVisibleFields.forEach((fieldName) => {
      if (fieldCanBeSelected(draft, fieldName)) next.add(fieldName);
    });
    return next;
  }, [draft, extraVisibleFields]);

  const selectableFields = useMemo(
    () => ALL_FILTER_FIELDS.filter((field) => fieldCanBeSelected(draft, field.name)),
    [draft]
  );

  const allFiltersSelected = selectableFields.every((field) => visibleFields.has(field.name));

  const focusFilterCard = useCallback((fieldName: keyof LocationFilterValues) => {
    if (focusClearTimerRef.current) {
      clearTimeout(focusClearTimerRef.current);
      focusClearTimerRef.current = null;
    }
    setPendingFocusField(fieldName);
  }, []);

  useEffect(() => {
    if (!pendingFocusField) return;
    const card = cardRefs.current[pendingFocusField];
    if (!card) return;

    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setFocusedField(pendingFocusField);
    const searchInput = card.querySelector('input');
    searchInput?.focus();

    focusClearTimerRef.current = setTimeout(() => {
      setFocusedField(null);
      focusClearTimerRef.current = null;
    }, 1800);
    setPendingFocusField(null);
  }, [pendingFocusField, visibleFields]);

  const handleToggleFieldVisibility = useCallback(
    (fieldName: keyof LocationFilterValues) => {
      if (!fieldCanBeSelected(draft, fieldName)) return;
      if (visibleFields.has(fieldName)) {
        setExtraVisibleFields((previous) => {
          const next = new Set(previous);
          next.delete(fieldName);
          return next;
        });
        return;
      }

      setExtraVisibleFields((previous) => {
        const next = new Set(previous);
        next.add(fieldName);
        return next;
      });
      focusFilterCard(fieldName);
    },
    [draft, focusFilterCard, visibleFields]
  );

  const handleOpenFilterField = useCallback(
    (fieldName: keyof LocationFilterValues) => {
      if (!fieldCanBeSelected(draft, fieldName)) return;
      setExtraVisibleFields((previous) => new Set(previous).add(fieldName));
      focusFilterCard(fieldName);
    },
    [draft, focusFilterCard]
  );

  useEffect(() => {
    setExtraVisibleFields((previous) => {
      const next = new Set(
        [...previous].filter((fieldName) => fieldCanBeSelected(draft, fieldName))
      );
      return next.size === previous.size ? previous : next;
    });
  }, [draft]);

  const handleToggleSelectAllFilters = useCallback(() => {
    if (allFiltersSelected) {
      setExtraVisibleFields(new Set());
      return;
    }
    setExtraVisibleFields(new Set(selectableFields.map((field) => field.name)));
  }, [allFiltersSelected, selectableFields]);

  useEffect(() => {
    setDraft(appliedValues);
  }, [appliedValues]);

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

  const updateFieldOptions = useCallback((fieldName: string, newOptions: LocationOption[]) => {
    setAllOptions((previous) => ({ ...previous, [fieldName]: newOptions }));
  }, []);

  const getSelectedOptionIds = useCallback(
    (fieldName: string, selectedValue: string): Array<string | number> =>
      splitCsvTokens(selectedValue)
        .map((token) => {
          const option = (allOptions[fieldName] || []).find(
            (item) => String(item.id) === token || getNormalizedOptionLabel(item) === token
          );
          return option?.id;
        })
        .filter((id): id is string | number => id !== undefined && id !== null),
    [allOptions, getNormalizedOptionLabel]
  );

  const getSelectedOptionValues = useCallback(
    (fieldName: string, selectedValue: string): Array<string | number> =>
      splitCsvTokens(selectedValue)
        .map((token) => {
          const option = (allOptions[fieldName] || []).find(
            (item) => String(item.id) === token || getNormalizedOptionLabel(item) === token
          );
          return option?.value ?? option?.id;
        })
        .filter((value): value is string | number => value !== undefined && value !== null),
    [allOptions, getNormalizedOptionLabel]
  );

  const refreshDeviceOptionsForCategories = useCallback(async (values: LocationFilterValues) => {
    const state = getSelectedOptionValues('state', values.state);
    const city = getSelectedOptionValues('city', values.city);
    const zone = getSelectedOptionValues('zoneArea', values.zoneArea);
    const subZone = getSelectedOptionValues('subZoneArea', values.subZoneArea);
    const pincode = getSelectedOptionValues('pincode', values.pincode);
    const arterialRoute = getSelectedOptionValues('arterialRoute', values.arterialRoute);
    const filters = {
      state,
      city,
      zone,
      subZone,
      pincode,
      arterialRoute,
      publisher: getSelectedOptionValues('publisher', values.publisher),
      mainCategory: getSelectedOptionValues('mainCategory', values.mainCategory),
      category: getSelectedOptionValues('category', values.category),
      subCategory: getSelectedOptionValues('categorySub', values.categorySub),
    };
    const [locationType, orientation, resolution, screenLocation, stretch, property] = await Promise.all([
      fetchLocationTypes(filters.publisher, filters),
      fetchOrientations(undefined, filters),
      fetchResolutions(undefined, filters),
      fetchScreenLocations(undefined, filters),
      fetchStretches(undefined, filters),
      fetchProperties(undefined, filters),
    ]);
    updateFieldOptions('locationType', locationType);
    updateFieldOptions('orientation', orientation);
    updateFieldOptions('resolution', resolution);
    updateFieldOptions('screenLocation', screenLocation);
    updateFieldOptions('stretch', stretch);
    updateFieldOptions('property', property);
  }, [getSelectedOptionValues, updateFieldOptions]);

  const refreshPublisherOptionsForCategories = useCallback(async (values: LocationFilterValues) => {
    const filters = {
      state: getSelectedOptionValues('state', values.state),
      city: getSelectedOptionValues('city', values.city),
      zone: getSelectedOptionValues('zoneArea', values.zoneArea),
      subZone: getSelectedOptionValues('subZoneArea', values.subZoneArea),
      pincode: getSelectedOptionValues('pincode', values.pincode),
      arterialRoute: getSelectedOptionValues('arterialRoute', values.arterialRoute),
      mainCategory: getSelectedOptionValues('mainCategory', values.mainCategory),
      category: getSelectedOptionValues('category', values.category),
      subCategory: getSelectedOptionValues('categorySub', values.categorySub),
    };
    const modeOfMedia = getSelectedOptionValues('modeOfMedia', values.modeOfMedia);
    const publisherOptions = await fetchPublishers(modeOfMedia, filters);
    updateFieldOptions('publisher', publisherOptions);
    return publisherOptions;
  }, [getSelectedOptionValues, updateFieldOptions]);

  const refreshOptionsForLocation = useCallback(async (
    state: Array<string | number>,
    city: Array<string | number>,
    zone: Array<string | number>,
    subZone: Array<string | number>,
    pincode: Array<string | number>,
    arterialRoute: Array<string | number>
  ) => {
    const categoryFilters = { state, city, zone, subZone, pincode, arterialRoute };
    const deviceFilters = { state, city, zone, subZone, pincode, arterialRoute };
    const [modeOfMedia, publishers, mainCategories, categories, subCategories, locationTypes, orientations, resolutions, screenLocations, stretches, properties] = await Promise.all([
      fetchModeOfMedia(categoryFilters),
      fetchPublishers(undefined, categoryFilters),
      fetchMainCategories(undefined, categoryFilters),
      fetchCategories(undefined, undefined, categoryFilters),
      fetchSubCategories(undefined, undefined, undefined, categoryFilters),
      fetchLocationTypes(undefined, deviceFilters),
      fetchOrientations(undefined, deviceFilters),
      fetchResolutions(undefined, deviceFilters),
      fetchScreenLocations(undefined, deviceFilters),
      fetchStretches(undefined, deviceFilters),
      fetchProperties(undefined, deviceFilters),
    ]);

    updateFieldOptions('modeOfMedia', modeOfMedia);
    updateFieldOptions('publisher', publishers);
    updateFieldOptions('mainCategory', mainCategories);
    updateFieldOptions('category', categories);
    updateFieldOptions('categorySub', subCategories);
    updateFieldOptions('locationType', locationTypes);
    updateFieldOptions('orientation', orientations);
    updateFieldOptions('resolution', resolutions);
    updateFieldOptions('screenLocation', screenLocations);
    updateFieldOptions('stretch', stretches);
    updateFieldOptions('property', properties);
    categoryOptionsRef.current = categories;
    categorySubOptionsRef.current = subCategories;
    modeOptionsRef.current = modeOfMedia;
    publisherOptionsRef.current = publishers;
    mainCategoryOptionsRef.current = mainCategories;
    deviceOptionsRef.current = {
      locationType: locationTypes,
      orientation: orientations,
      resolution: resolutions,
      screenLocation: screenLocations,
      stretch: stretches,
      property: properties,
    };
  }, [updateFieldOptions]);

  const filterCategoryOptions = useCallback(
    (source: LocationOption[], parentField: 'mainCategory' | 'category', selectedValue: string) => {
      const selectedIds = splitCsvTokens(selectedValue);
      if (!selectedIds.length) return source;

      const parentKeys = parentField === 'mainCategory'
        ? ['main_category_id', 'mainCategoryId', 'main_category', 'mainCategory', 'parent_id', 'parentId']
        : ['category_id', 'categoryId', 'category', 'parent_id', 'parentId'];
      const getParentIds = (option: LocationOption): string[] => {
        const rawOption = option as LocationOption & Record<string, unknown>;
        for (const key of parentKeys) {
          const rawValue = rawOption[key];
          if (Array.isArray(rawValue)) return rawValue.map(String);
          if (rawValue !== undefined && rawValue !== null && rawValue !== '') return [String(rawValue)];
        }
        return [];
      };
      const optionsWithParent = source.filter((option) => getParentIds(option).length > 0);
      if (!optionsWithParent.length) return source;
      return source.filter((option) => getParentIds(option).some((id) => selectedIds.includes(id)));
    },
    []
  );

  // Sequential initialization of filter options based on hierarchy
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadInitial = async () => {
      try {
        if (!initialOptionsLoadedRef.current) {
          // 1. First call: Fetch Countries
          setFieldLoading('country', true);
          const countries = await fetchCountries();
          if (cancelled) return;
          updateFieldOptions('country', countries);
          setFieldLoading('country', false);

          // 2. Determine selected country
          const selectedCountry =
            appliedValues.country ||
            (countries.length === 1 ? getNormalizedOptionLabel(countries[0]) : '');

          let states: LocationOption[] = [];
          let cities: LocationOption[] = [];
          let zones: LocationOption[] = [];
          let subZones: LocationOption[] = [];
          let pincodes: LocationOption[] = [];
          let arterialRoutes: LocationOption[] = [];

          // 3. Once country list is loaded & country is selected -> trigger States API
          if (selectedCountry) {
            setFieldLoading('state', true);
            states = await fetchStates(selectedCountry);
            if (cancelled) return;
            updateFieldOptions('state', states);
            setFieldLoading('state', false);

            const selectedStates = splitCsvTokens(appliedValues.state);
            if (selectedStates.length) {
              setFieldLoading('city', true);
              cities = await fetchCities(selectedStates, {
                country: [selectedCountry],
                state: selectedStates,
              });
              if (cancelled) return;
              updateFieldOptions('city', cities);
              setFieldLoading('city', false);

              const selectedCities = splitCsvTokens(appliedValues.city);
              if (selectedCities.length) {
                setFieldLoading('zoneArea', true);
                setFieldLoading('arterialRoute', true);
                [zones, arterialRoutes] = await Promise.all([
                  fetchZones(undefined, {
                    country: [selectedCountry],
                    state: selectedStates,
                    city: selectedCities,
                  }),
                  fetchArterialRoutes(undefined, {
                    country: [selectedCountry],
                    state: selectedStates,
                    city: selectedCities,
                  }),
                ]);
                if (cancelled) return;
                updateFieldOptions('zoneArea', zones);
                updateFieldOptions('arterialRoute', arterialRoutes);
                setFieldLoading('zoneArea', false);
                setFieldLoading('arterialRoute', false);

                const selectedZones = splitCsvTokens(appliedValues.zoneArea);
                if (selectedZones.length) {
                  setFieldLoading('subZoneArea', true);
                  subZones = await fetchSubZones(undefined, {
                    country: [selectedCountry],
                    state: selectedStates,
                    city: selectedCities,
                    zone: selectedZones,
                  });
                  if (cancelled) return;
                  updateFieldOptions('subZoneArea', subZones);
                  setFieldLoading('subZoneArea', false);
                }
              }

              pincodes = await fetchPincodes({
                country: [selectedCountry],
                state: selectedStates,
                city: splitCsvTokens(appliedValues.city),
                zone: splitCsvTokens(appliedValues.zoneArea),
                subZone: splitCsvTokens(appliedValues.subZoneArea),
              });
              if (cancelled) return;
              updateFieldOptions('pincode', pincodes);
            }
          }

          // 4. Load Category & Device base options
          const initialCategoryFilters = {
            state: splitCsvTokens(appliedValues.state),
            city: splitCsvTokens(appliedValues.city),
            zone: splitCsvTokens(appliedValues.zoneArea),
            subZone: splitCsvTokens(appliedValues.subZoneArea),
            pincode: splitCsvTokens(appliedValues.pincode),
            arterialRoute: splitCsvTokens(appliedValues.arterialRoute),
          };
          const initialDeviceFilters = { ...initialCategoryFilters };

          const [
            modeOfMedia,
            publishers,
            mainCategories,
            categories,
            subCategories,
            locationTypes,
            orientations,
            resolutions,
            screenLocations,
            stretches,
            properties,
          ] = await Promise.all([
            fetchModeOfMedia(initialCategoryFilters),
            fetchPublishers(undefined, initialCategoryFilters),
            fetchMainCategories(undefined, initialCategoryFilters),
            fetchCategories(undefined, undefined, initialCategoryFilters),
            fetchSubCategories(undefined, undefined, undefined, initialCategoryFilters),
            fetchLocationTypes(undefined, initialDeviceFilters),
            fetchOrientations(undefined, initialDeviceFilters),
            fetchResolutions(undefined, initialDeviceFilters),
            fetchScreenLocations(undefined, initialDeviceFilters),
            fetchStretches(undefined, initialDeviceFilters),
            fetchProperties(undefined, initialDeviceFilters),
          ]);

          if (cancelled) return;

          categoryOptionsRef.current = categories;
          categorySubOptionsRef.current = subCategories;
          modeOptionsRef.current = modeOfMedia;
          publisherOptionsRef.current = publishers;
          mainCategoryOptionsRef.current = mainCategories;
          deviceOptionsRef.current = {
            locationType: locationTypes,
            orientation: orientations,
            resolution: resolutions,
            screenLocation: screenLocations,
            stretch: stretches,
            property: properties,
          };

          setAllOptions({
            ...options,
            country: countries,
            state: states,
            city: cities,
            zoneArea: zones,
            subZoneArea: subZones,
            pincode: pincodes,
            arterialRoute: arterialRoutes,
            modeOfMedia,
            publisher: publishers,
            mainCategory: mainCategories,
            category: filterCategoryOptions(categories, 'mainCategory', appliedValues.mainCategory),
            categorySub: appliedValues.category
              ? filterCategoryOptions(subCategories, 'category', appliedValues.category)
              : subCategories,
            locationType: locationTypes,
            orientation: orientations,
            resolution: resolutions,
            screenLocation: screenLocations,
            stretch: stretches,
            property: properties,
          });

          initialOptionsLoadedRef.current = true;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load initial filter options:', error);
        }
      }
    };

    loadInitial();
    setDraft(appliedValues);

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    appliedValues,
    options,
    getNormalizedOptionLabel,
    filterCategoryOptions,
    setFieldLoading,
    updateFieldOptions,
  ]);

  useEffect(() => {
    if (isOpen) return;
    initialOptionsLoadedRef.current = false;
    hydratedCountryKeyRef.current = null;
    hydratedStateKeyRef.current = null;
    if (stateCascadeTimerRef.current) {
      clearTimeout(stateCascadeTimerRef.current);
      stateCascadeTimerRef.current = null;
      setFieldLoading('city', false);
    }
  }, [isOpen, setFieldLoading]);

  const emitAppliedFilters = useCallback(
    (valuesToApply: LocationFilterValues) => {
      const outgoing: LocationFilterValues = { ...valuesToApply };
      for (const field of MULTI_SELECT_FIELDS) {
        const opts = allOptions[field as string] || [];
        outgoing[field] = idsCsvToLabelsCsv(String(valuesToApply[field] ?? ''), opts, getNormalizedOptionLabel);
      }
      onApply(outgoing);
    },
    [allOptions, getNormalizedOptionLabel, onApply]
  );

  // Cascading updates when a field changes
  const handleFieldChange = useCallback(
    async (fieldName: keyof LocationFilterValues, value: string) => {
      const newDraft = {
        ...draft,
        [fieldName]: value,
      };

      setDraft(newDraft);

      // ==========================================
      // LOCATION HIERARCHY CASCADES
      // ==========================================
      if (fieldName === 'country') {
        const newCountry = value.trim();
        // 1. Clear descendant draft fields
        const clearedDraft: LocationFilterValues = {
          ...draft,
          country: newCountry,
          state: '',
          city: '',
          zoneArea: '',
          subZoneArea: '',
          pincode: '',
          arterialRoute: '',
        };
        setDraft(clearedDraft);
        emitAppliedFilters(clearedDraft);

        // 2. Immediately clear previous states and descendant options
        updateFieldOptions('state', []);
        updateFieldOptions('city', []);
        updateFieldOptions('zoneArea', []);
        updateFieldOptions('subZoneArea', []);
        updateFieldOptions('pincode', []);
        updateFieldOptions('arterialRoute', []);

        // 3. Trigger States API with the new selected country value
        if (newCountry) {
          setFieldLoading('state', true);
          try {
            const states = await fetchStates(newCountry);
            updateFieldOptions('state', states);
          } catch (err) {
            console.warn('Error fetching states for country:', newCountry, err);
          } finally {
            setFieldLoading('state', false);
          }
        }
        return;
      }

      if (fieldName === 'state') {
        const clearedDraft: LocationFilterValues = {
          ...draft,
          state: value,
          city: '',
          zoneArea: '',
          subZoneArea: '',
          pincode: '',
          arterialRoute: '',
        };
        setDraft(clearedDraft);
        emitAppliedFilters(clearedDraft);

        updateFieldOptions('city', []);
        updateFieldOptions('zoneArea', []);
        updateFieldOptions('subZoneArea', []);
        updateFieldOptions('pincode', []);
        updateFieldOptions('arterialRoute', []);

        const selectedStates = getSelectedOptionValues('state', value);
        if (selectedStates.length) {
          setFieldLoading('city', true);
          setFieldLoading('pincode', true);
          try {
            const [cities, pincodes] = await Promise.all([
              fetchCities(selectedStates, {
                country: draft.country ? [draft.country] : [],
                state: selectedStates,
              }),
              fetchPincodes({
                country: draft.country ? [draft.country] : [],
                state: selectedStates,
              }),
            ]);
            updateFieldOptions('city', cities);
            updateFieldOptions('pincode', pincodes);
          } catch (err) {
            console.warn('Error fetching cities for state:', err);
          } finally {
            setFieldLoading('city', false);
            setFieldLoading('pincode', false);
          }
          await refreshOptionsForLocation(selectedStates, [], [], [], [], []);
        }
        return;
      }

      if (fieldName === 'city') {
        const clearedDraft: LocationFilterValues = {
          ...draft,
          city: value,
          zoneArea: '',
          subZoneArea: '',
          pincode: '',
          arterialRoute: '',
        };
        setDraft(clearedDraft);
        emitAppliedFilters(clearedDraft);

        updateFieldOptions('zoneArea', []);
        updateFieldOptions('subZoneArea', []);
        updateFieldOptions('arterialRoute', []);

        const selectedStates = getSelectedOptionValues('state', draft.state);
        const selectedCities = getSelectedOptionValues('city', value);
        if (selectedCities.length) {
          setFieldLoading('zoneArea', true);
          setFieldLoading('arterialRoute', true);
          setFieldLoading('pincode', true);
          const filter = {
            country: draft.country ? [draft.country] : [],
            state: selectedStates,
            city: selectedCities,
          };
          try {
            const [zones, routes, pincodes] = await Promise.all([
              fetchZones(undefined, filter),
              fetchArterialRoutes(undefined, filter),
              fetchPincodes(filter),
            ]);
            updateFieldOptions('zoneArea', zones);
            updateFieldOptions('arterialRoute', routes);
            updateFieldOptions('pincode', pincodes);
          } catch (err) {
            console.warn('Error fetching zones/routes for city:', err);
          } finally {
            setFieldLoading('zoneArea', false);
            setFieldLoading('arterialRoute', false);
            setFieldLoading('pincode', false);
          }
          await refreshOptionsForLocation(selectedStates, selectedCities, [], [], [], []);
        }
        return;
      }

      if (fieldName === 'zoneArea') {
        const clearedDraft: LocationFilterValues = {
          ...draft,
          zoneArea: value,
          subZoneArea: '',
          pincode: '',
        };
        setDraft(clearedDraft);
        emitAppliedFilters(clearedDraft);

        updateFieldOptions('subZoneArea', []);

        const selectedStates = getSelectedOptionValues('state', draft.state);
        const selectedCities = getSelectedOptionValues('city', draft.city);
        const selectedZones = getSelectedOptionValues('zoneArea', value);
        if (selectedZones.length) {
          setFieldLoading('subZoneArea', true);
          setFieldLoading('pincode', true);
          const filter = {
            country: draft.country ? [draft.country] : [],
            state: selectedStates,
            city: selectedCities,
            zone: selectedZones,
          };
          try {
            const [subZones, pincodes] = await Promise.all([
              fetchSubZones(undefined, filter),
              fetchPincodes(filter),
            ]);
            updateFieldOptions('subZoneArea', subZones);
            updateFieldOptions('pincode', pincodes);
          } catch (err) {
            console.warn('Error fetching subzones for zone:', err);
          } finally {
            setFieldLoading('subZoneArea', false);
            setFieldLoading('pincode', false);
          }
          await refreshOptionsForLocation(selectedStates, selectedCities, selectedZones, [], [], []);
        }
        return;
      }

      if (fieldName === 'subZoneArea') {
        const newDraftWithSubZone = {
          ...draft,
          subZoneArea: value,
        };
        setDraft(newDraftWithSubZone);
        emitAppliedFilters(newDraftWithSubZone);

        const selectedStates = getSelectedOptionValues('state', draft.state);
        const selectedCities = getSelectedOptionValues('city', draft.city);
        const selectedZones = getSelectedOptionValues('zoneArea', draft.zoneArea);
        const selectedSubZones = getSelectedOptionValues('subZoneArea', value);
        if (selectedSubZones.length) {
          setFieldLoading('pincode', true);
          try {
            const pincodes = await fetchPincodes({
              country: draft.country ? [draft.country] : [],
              state: selectedStates,
              city: selectedCities,
              zone: selectedZones,
              subZone: selectedSubZones,
            });
            updateFieldOptions('pincode', pincodes);
          } catch (err) {
            console.warn('Error fetching pincodes for subzone:', err);
          } finally {
            setFieldLoading('pincode', false);
          }
          await refreshOptionsForLocation(selectedStates, selectedCities, selectedZones, selectedSubZones, [], []);
        }
        return;
      }

      // ==========================================
      // CATEGORY & DEVICE CASCADES
      // ==========================================
      if (fieldName === 'modeOfMedia') {
        const clearedDraft = { ...newDraft, publisher: '', mainCategory: '', category: '', categorySub: '' };
        setDraft(clearedDraft);
        emitAppliedFilters(clearedDraft);
        setFieldLoading('publisher', Boolean(value));
        setFieldLoading('mainCategory', Boolean(value));
        setFieldLoading('category', Boolean(value));
        setFieldLoading('categorySub', Boolean(value));
        const modeSelection = getSelectedOptionIds('modeOfMedia', value);
        const categoryFilters = {
          state: getSelectedOptionValues('state', newDraft.state),
          city: getSelectedOptionValues('city', newDraft.city),
          zone: getSelectedOptionValues('zoneArea', newDraft.zoneArea),
          subZone: getSelectedOptionValues('subZoneArea', newDraft.subZoneArea),
          pincode: getSelectedOptionValues('pincode', newDraft.pincode),
          arterialRoute: getSelectedOptionValues('arterialRoute', newDraft.arterialRoute),
        };
        const [publisherOptions, mainCategoryOptions, categoryOptions, subCategoryOptions] = await Promise.all([
          value ? fetchPublishers(modeSelection, categoryFilters) : Promise.resolve(publisherOptionsRef.current),
          fetchMainCategories(undefined, categoryFilters),
          fetchCategories(undefined, undefined, categoryFilters),
          fetchSubCategories(undefined, undefined, undefined, categoryFilters),
        ]);
        updateFieldOptions('publisher', publisherOptions);
        updateFieldOptions('mainCategory', mainCategoryOptions);
        updateFieldOptions('category', categoryOptions);
        updateFieldOptions('categorySub', subCategoryOptions);
        updateFieldOptions('stretch', deviceOptionsRef.current.stretch || []);
        updateFieldOptions('property', deviceOptionsRef.current.property || []);
        setFieldLoading('publisher', false);
        setFieldLoading('mainCategory', false);
        setFieldLoading('category', false);
        setFieldLoading('categorySub', false);
        return;
      }

      if (fieldName === 'publisher') {
        emitAppliedFilters(newDraft);
        await refreshDeviceOptionsForCategories(newDraft);
        return;
      }

      const categoryCascade = {
        mainCategory: {
          child: 'category' as const,
          selection: getSelectedOptionValues('mainCategory', value),
          defaults: categoryOptionsRef,
          load: (selection: Array<string | number>) => fetchCategories(
            selection,
            undefined,
            {
              state: getSelectedOptionValues('state', newDraft.state),
              city: getSelectedOptionValues('city', newDraft.city),
              zone: getSelectedOptionValues('zoneArea', newDraft.zoneArea),
              subZone: getSelectedOptionValues('subZoneArea', newDraft.subZoneArea),
              pincode: getSelectedOptionValues('pincode', newDraft.pincode),
              arterialRoute: getSelectedOptionValues('arterialRoute', newDraft.arterialRoute),
            }
          ),
        },
        category: {
          child: 'categorySub' as const,
          selection: getSelectedOptionValues('category', value),
          defaults: categorySubOptionsRef,
          load: (selection: Array<string | number>) => fetchSubCategories(
            selection,
            getSelectedOptionValues('mainCategory', newDraft.mainCategory),
            undefined,
            {
              state: getSelectedOptionValues('state', newDraft.state),
              city: getSelectedOptionValues('city', newDraft.city),
              zone: getSelectedOptionValues('zoneArea', newDraft.zoneArea),
              subZone: getSelectedOptionValues('subZoneArea', newDraft.subZoneArea),
              pincode: getSelectedOptionValues('pincode', newDraft.pincode),
              arterialRoute: getSelectedOptionValues('arterialRoute', newDraft.arterialRoute),
            }
          ),
        },
      }[fieldName as 'mainCategory' | 'category'];

      if (fieldName === 'categorySub') {
        emitAppliedFilters(newDraft);
        setFieldLoading('publisher', true);
        await refreshPublisherOptionsForCategories(newDraft);
        setFieldLoading('publisher', false);
        await refreshDeviceOptionsForCategories(newDraft);
        return;
      }

      if (fieldName === 'property') {
        emitAppliedFilters(newDraft);
        const propertySelection = getSelectedOptionIds('property', value);
        const propertyFilters = {
          state: getSelectedOptionValues('state', newDraft.state),
          city: getSelectedOptionValues('city', newDraft.city),
          zone: getSelectedOptionValues('zoneArea', newDraft.zoneArea),
          subZone: getSelectedOptionValues('subZoneArea', newDraft.subZoneArea),
          pincode: getSelectedOptionValues('pincode', newDraft.pincode),
          arterialRoute: getSelectedOptionValues('arterialRoute', newDraft.arterialRoute),
          publisher: getSelectedOptionIds('publisher', newDraft.publisher),
          property: propertySelection,
          mainCategory: getSelectedOptionValues('mainCategory', newDraft.mainCategory),
          category: getSelectedOptionValues('category', newDraft.category),
          subCategory: getSelectedOptionValues('categorySub', newDraft.categorySub),
        };
        setFieldLoading('locationType', true);
        setFieldLoading('orientation', true);
        setFieldLoading('resolution', true);
        setFieldLoading('screenLocation', true);
        setFieldLoading('stretch', true);
        const [locationTypeOptions, orientationOptions, resolutionOptions, screenLocationOptions, stretchOptions] = await Promise.all([
          fetchLocationTypes(undefined, propertyFilters),
          fetchOrientations(undefined, propertyFilters),
          fetchResolutions(undefined, propertyFilters),
          fetchScreenLocations(undefined, propertyFilters),
          fetchStretches(undefined, propertyFilters),
        ]);
        updateFieldOptions('locationType', locationTypeOptions);
        updateFieldOptions('orientation', orientationOptions);
        updateFieldOptions('resolution', resolutionOptions);
        updateFieldOptions('screenLocation', screenLocationOptions);
        updateFieldOptions('stretch', stretchOptions);
        setFieldLoading('locationType', false);
        setFieldLoading('orientation', false);
        setFieldLoading('resolution', false);
        setFieldLoading('screenLocation', false);
        setFieldLoading('stretch', false);
        return;
      }

      if (categoryCascade) {
        const categoryDescendants: Partial<Record<string, string[]>> = {
          modeOfMedia: ['publisher', 'mainCategory', 'category', 'categorySub'],
          mainCategory: ['category'],
          category: ['categorySub'],
        };
        const fieldsToClear = categoryDescendants[fieldName] || [categoryCascade.child];
        const nextCategoryValues = {
          ...newDraft,
          ...Object.fromEntries(fieldsToClear.map((field) => [field, ''])),
        } as LocationFilterValues;
        setDraft(nextCategoryValues);
        emitAppliedFilters(nextCategoryValues);
        setFieldLoading(categoryCascade.child, Boolean(value));
        const childOptions = value
          ? await categoryCascade.load(categoryCascade.selection)
          : categoryCascade.defaults.current;
        updateFieldOptions(categoryCascade.child, childOptions);
        setFieldLoading(categoryCascade.child, false);
        setFieldLoading('publisher', true);
        await refreshPublisherOptionsForCategories(nextCategoryValues);
        setFieldLoading('publisher', false);
        await refreshDeviceOptionsForCategories(nextCategoryValues);
        return;
      }

      const deviceCascade = {
        locationType: { child: 'orientation' as const, load: fetchOrientations },
        orientation: { child: 'resolution' as const, load: fetchResolutions },
        resolution: { child: 'screenLocation' as const, load: fetchScreenLocations },
        screenLocation: { child: 'stretch' as const, load: fetchStretches },
      }[fieldName as 'locationType' | 'orientation' | 'resolution' | 'screenLocation'];
      if (deviceCascade) {
        const child = deviceCascade.child;
        const deviceDescendants: Record<string, Array<keyof LocationFilterValues>> = {
          locationType: ['orientation', 'resolution', 'screenLocation', 'stretch'],
          orientation: ['resolution', 'screenLocation', 'stretch'],
          resolution: ['screenLocation', 'stretch'],
          screenLocation: ['stretch'],
          stretch: [],
        };
        const descendants = deviceDescendants[fieldName] || [];
        const nextDeviceValues = {
          ...draft,
          [fieldName]: value,
          ...Object.fromEntries(descendants.map((item) => [item, ''])),
        } as LocationFilterValues;
        setDraft(nextDeviceValues);
        emitAppliedFilters(nextDeviceValues);
        const selectedDevice = (field: keyof LocationFilterValues): Array<string | number> =>
          getSelectedOptionIds(field, newDraft[field]);
        const selectedDeviceApiValues = (field: keyof LocationFilterValues): Array<string | number> =>
          field === 'locationType' || field === 'resolution'
            ? getSelectedOptionValues(field, newDraft[field])
            : selectedDevice(field);
        const effectiveDeviceSelection = (field: keyof LocationFilterValues): Array<string | number> =>
          field === fieldName ? selectedDeviceApiValues(field) : descendants.includes(field) ? [] : selectedDeviceApiValues(field);
        const stretchFilters = {
          publisher: selectedDevice('publisher'),
          property: selectedDevice('property'),
          locationType: effectiveDeviceSelection('locationType'),
          orientation: effectiveDeviceSelection('orientation'),
          resolution: effectiveDeviceSelection('resolution'),
        };
        const deviceParentFilters = {
          publisher: selectedDevice('publisher'),
          property: selectedDevice('property'),
          locationType: effectiveDeviceSelection('locationType'),
          orientation: effectiveDeviceSelection('orientation'),
          resolution: effectiveDeviceSelection('resolution'),
        };
        const childSelection = selectedDeviceApiValues(fieldName);
        setFieldLoading(child, Boolean(value));
        setFieldLoading('resolution', fieldName === 'locationType' && Boolean(value));
        setFieldLoading(
          'screenLocation',
          (fieldName === 'locationType' || fieldName === 'orientation') && Boolean(value)
        );
        const [childOptions, stretchOptions, resolutionOptions, screenLocationOptions] = await Promise.all([
          value
            ? child === 'orientation'
              ? fetchOrientations(childSelection, deviceParentFilters)
              : child === 'resolution'
                ? fetchResolutions(childSelection, deviceParentFilters)
                : child === 'screenLocation'
                  ? fetchScreenLocations(childSelection, deviceParentFilters)
                  : child === 'stretch'
                    ? fetchStretches(childSelection, deviceParentFilters)
                    : Promise.resolve(deviceOptionsRef.current[child] || [])
            : Promise.resolve(deviceOptionsRef.current[child] || []),
          fieldName !== 'stretch' && (value || Object.values(stretchFilters).some((items) => items.length))
            ? fetchStretches(effectiveDeviceSelection('screenLocation'), stretchFilters)
            : Promise.resolve(deviceOptionsRef.current.stretch || []),
          fieldName === 'locationType' && value
            ? fetchResolutions(undefined, deviceParentFilters)
            : Promise.resolve(deviceOptionsRef.current.resolution || []),
          (fieldName === 'locationType' || fieldName === 'orientation') && value
            ? fetchScreenLocations(undefined, deviceParentFilters)
            : Promise.resolve(deviceOptionsRef.current.screenLocation || []),
        ]);
        updateFieldOptions(child, childOptions);
        updateFieldOptions('stretch', stretchOptions);
        updateFieldOptions('resolution', resolutionOptions);
        updateFieldOptions('screenLocation', screenLocationOptions);
        setFieldLoading(child, false);
        setFieldLoading('resolution', false);
        setFieldLoading('screenLocation', false);
        return;
      }

      // Default branch for other filter fields (pincode, arterialRoute, etc.)
      emitAppliedFilters(newDraft);
    },
    [
      draft,
      emitAppliedFilters,
      getSelectedOptionIds,
      getSelectedOptionValues,
      refreshOptionsForLocation,
      refreshPublisherOptionsForCategories,
      refreshDeviceOptionsForCategories,
      setFieldLoading,
      updateFieldOptions,
    ]
  );

  const handleReset = useCallback(() => {
    const emptyValues = Object.fromEntries(
      Object.keys(draft).map((fieldName) => [fieldName, ''])
    ) as LocationFilterValues;
    setDraft(emptyValues);
    setExtraVisibleFields(new Set());
    onReset();
    onApply(emptyValues);
  }, [draft, onReset, onApply]);

  // Toggle single option from the 70% section
  const handleToggleOption = useCallback(
    (fieldName: keyof LocationFilterValues, option: LocationOption) => {
      const optionId = String(option.id);
      const optionLabel = getNormalizedOptionLabel(option);

      if (fieldName === 'country') {
        const isCurrent = draft.country === optionLabel || draft.country === optionId;
        handleFieldChange('country', isCurrent ? '' : optionLabel);
        return;
      }

      const currentTokens = splitCsvTokens(draft[fieldName]);
      const isSelected = currentTokens.includes(optionId) || currentTokens.includes(optionLabel);

      let nextTokens: string[];
      if (isSelected) {
        nextTokens = currentTokens.filter((t) => t !== optionId && t !== optionLabel);
      } else {
        nextTokens = [...currentTokens, optionId];
      }
      handleFieldChange(fieldName, joinCsvTokens(nextTokens));
    },
    [draft, getNormalizedOptionLabel, handleFieldChange]
  );

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (stateCascadeTimerRef.current) {
        clearTimeout(stateCascadeTimerRef.current);
        stateCascadeTimerRef.current = null;
      }
      if (focusClearTimerRef.current) {
        clearTimeout(focusClearTimerRef.current);
        focusClearTimerRef.current = null;
      }
    };
  }, []);

  const totalActiveCount = useMemo(() => {
    let count = 0;
    ALL_FILTER_FIELDS.forEach((f) => {
      const val = draft[f.name];
      if (!val) return;
      const tokens = splitCsvTokens(val);
      count += tokens.length;
    });
    return count;
  }, [draft]);

  const appliedFilterSummaries = useMemo(
    () =>
      ALL_FILTER_FIELDS.flatMap((field) => {
        const rawValue = String(draft[field.name] ?? '').trim();
        if (!rawValue) return [];
        const tokens = field.name === 'country' ? [rawValue] : splitCsvTokens(rawValue);
        const values = tokens.map((token) => {
          const option = (allOptions[field.name] || []).find(
            (item) => String(item.id) === token || getNormalizedOptionLabel(item) === token
          );
          return option ? getNormalizedOptionLabel(option) : token;
        });
        return [{ name: field.name, label: field.label, values }];
      }),
    [allOptions, draft, getNormalizedOptionLabel]
  );

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-full rounded-xl border border-gray-200 bg-white shadow-xs p-3.5 md:p-4 mb-2">
      {/* Top Header Bar for Filter Section */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
            Filters
          </h3>
          {totalActiveCount > 0 && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-[#007B83]">
              {totalActiveCount} active
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
              aria-label="Hide Filters"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Hide Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
            aria-label="Reset all filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {appliedFilterSummaries.length > 0 && (
        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin whitespace-nowrap pb-0.5">
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-gray-500">
            Applied
          </span>
          {appliedFilterSummaries.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handleOpenFilterField(item.name)}
              title={`Change ${item.label}`}
              className="inline-flex max-w-[220px] shrink-0 items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] text-[#007B83] hover:border-[#007B83]"
            >
              <span className="font-semibold">{item.label.replace(' (Screen Type)', '')}:</span>
              <span className="truncate font-medium">{item.values.join(', ')}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-thin whitespace-nowrap rounded-lg border border-gray-100 bg-gray-50/70 px-2.5 py-1.5">
        <button
          type="button"
          onClick={handleToggleSelectAllFilters}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors ${
            allFiltersSelected
              ? 'border-[#007B83] bg-teal-50 text-[#007B83]'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border ${
              allFiltersSelected
                ? 'border-[#007B83] bg-[#007B83] text-white'
                : 'border-gray-400 bg-white'
            }`}
          >
            {allFiltersSelected && <Check className="h-3 w-3 stroke-[3]" />}
          </span>
          All
        </button>

        {ALL_FILTER_FIELDS.map((field) => {
          const isVisible = visibleFields.has(field.name);
          const prerequisite = FIELD_PREREQUISITES[field.name];
          const canSelect = fieldCanBeSelected(draft, field.name);
          const prerequisiteLabel = prerequisite
            ? ALL_FILTER_FIELDS.find((item) => item.name === prerequisite)?.label
            : undefined;
          return (
            <button
              key={field.name}
              type="button"
              disabled={!canSelect}
              onClick={() => handleToggleFieldVisibility(field.name)}
              title={
                !canSelect
                  ? `Select ${prerequisiteLabel} first`
                  : isVisible
                    ? `Hide ${field.label}`
                    : `Show ${field.label}`
              }
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                !canSelect
                  ? 'cursor-not-allowed border-transparent bg-transparent text-gray-300 opacity-70'
                  : isVisible
                  ? 'border-gray-300 bg-white text-gray-800'
                  : 'border-transparent bg-transparent text-gray-500 hover:border-gray-200 hover:bg-white'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  !canSelect
                    ? 'border-gray-200 bg-gray-100'
                    : isVisible
                    ? 'border-[#007B83] bg-[#007B83] text-white'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isVisible && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span>{field.label.replace(' (Screen Type)', '')}</span>
            </button>
          );
        })}
      </div>

      {/* Horizontal row of selected filter cards */}
      <div className="flex flex-row overflow-x-auto gap-3.5 pb-2 pt-1 scrollbar-thin scroll-smooth w-full">
        {ALL_FILTER_FIELDS.filter((field) => visibleFields.has(field.name)).map((field) => {
          const opts = allOptions[field.name] || [];
          const isLoading = loadingFields.has(field.name as string);
          const IconComponent = field.icon;
          const cardSearch = cardSearchQueries[field.name] || '';
          const selectedTokens = splitCsvTokens(draft[field.name]);

          // Filter options by intra-card search
          const searchFilteredOptions = cardSearch.trim()
            ? opts.filter((o) =>
                getNormalizedOptionLabel(o).toLowerCase().includes(cardSearch.toLowerCase().trim())
              )
            : opts;

          // Group selected items at top (preserving selection order), followed by unselected items in their existing order
          const displayedOptions = (() => {
            if (!searchFilteredOptions.length) return [];
            if (field.name === 'country') {
              const countryVal = draft.country.trim();
              if (!countryVal) return searchFilteredOptions;
              const selected: LocationOption[] = [];
              const unselected: LocationOption[] = [];
              searchFilteredOptions.forEach((opt) => {
                const idStr = String(opt.id);
                const label = getNormalizedOptionLabel(opt);
                if (countryVal === idStr || countryVal === label) {
                  selected.push(opt);
                } else {
                  unselected.push(opt);
                }
              });
              return [...selected, ...unselected];
            }

            if (!selectedTokens.length) return searchFilteredOptions;

            const selectedMap = new Set<LocationOption>();
            const selected: LocationOption[] = [];

            // Preserve selection order based on selectedTokens
            selectedTokens.forEach((token) => {
              const match = searchFilteredOptions.find(
                (opt) =>
                  (String(opt.id) === token || getNormalizedOptionLabel(opt) === token) &&
                  !selectedMap.has(opt)
              );
              if (match) {
                selectedMap.add(match);
                selected.push(match);
              }
            });

            // Unselected items retain their original/existing order
            const unselected = searchFilteredOptions.filter((opt) => !selectedMap.has(opt));

            return [...selected, ...unselected];
          })();

          return (
            <div
              key={field.name}
              ref={(node) => {
                cardRefs.current[field.name] = node;
              }}
              className={`w-[270px] min-w-[270px] shrink-0 flex flex-col rounded-xl border bg-white shadow-xs hover:shadow-sm transition-all overflow-hidden ${
                focusedField === field.name
                  ? 'border-[#007B83] ring-2 ring-[#007B83]/30 shadow-md'
                  : 'border-gray-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-3.5 py-2.5 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#007B83] shadow-2xs border border-gray-200">
                    <IconComponent className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold text-gray-900" title={field.label}>
                      {field.label}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedTokens.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange(field.name, '')}
                      className="text-[10px] font-semibold text-red-600 hover:text-red-700 hover:underline mr-0.5 transition-colors"
                      title="Clear selection for this field"
                    >
                      Clear
                    </button>
                  )}
                  {selectedTokens.length > 0 && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-[#007B83]">
                      {selectedTokens.length} picked
                    </span>
                  )}
                  <span className="rounded-full bg-gray-200/80 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                    {opts.length} avail
                  </span>
                </div>
              </div>

              {/* Intra-card Search Bar */}
              <div className="border-b border-gray-100 px-3 py-1.5 bg-white shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={cardSearch}
                    onChange={(e) =>
                      setCardSearchQueries((prev) => ({
                        ...prev,
                        [field.name]: e.target.value,
                      }))
                    }
                    placeholder={`Search ${field.label.toLowerCase()}...`}
                    className="w-full rounded-md border border-gray-200 bg-gray-50/50 pl-8 pr-6 py-1 text-xs text-gray-800 placeholder-gray-400 focus:border-[#007B83] focus:bg-white focus:outline-none"
                  />
                  {cardSearch && (
                    <button
                      type="button"
                      onClick={() =>
                        setCardSearchQueries((prev) => ({
                          ...prev,
                          [field.name]: '',
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Options Data List Area (Fixed height showing exactly 5 items, internal vertical scroll) */}
              <div className="p-2.5 shrink-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-[176px] text-center space-y-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#007B83] border-t-transparent" />
                    <span className="text-[11px] text-gray-500">Updating available options...</span>
                  </div>
                ) : opts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[176px] text-center text-gray-400 px-3">
                    <span className="text-[11px] leading-relaxed">
                      {field.name === 'state' && !draft.country
                        ? 'Select a Country to view States'
                        : field.name === 'city' && !draft.state
                        ? 'Select a State to view Cities'
                        : field.name === 'zoneArea' && !draft.city
                        ? 'Select a City to view Zones'
                        : field.name === 'subZoneArea' && !draft.zoneArea
                        ? 'Select a Zone to view Sub Zones'
                        : field.name === 'arterialRoute' && !draft.city
                        ? 'Select a City to view Arterial Routes'
                        : field.name === 'category' && !draft.mainCategory
                        ? 'Select a Main Category'
                        : field.name === 'categorySub' && !draft.category
                        ? 'Select a Category'
                        : 'No options available'}
                    </span>
                  </div>
                ) : displayedOptions.length === 0 ? (
                  <div className="flex items-center justify-center h-[176px] text-center text-gray-400 text-[11px]">
                    No options match "{cardSearch}"
                  </div>
                ) : (
                  <div className="h-[176px] overflow-y-auto scrollbar-thin flex flex-col gap-1 pr-1">
                    {displayedOptions.map((opt) => {
                      const optionId = String(opt.id);
                      const label = getNormalizedOptionLabel(opt);
                      const isSelected =
                        field.name === 'country'
                          ? draft.country === label || draft.country === optionId
                          : selectedTokens.includes(optionId) || selectedTokens.includes(label);

                      return (
                        <button
                          key={`${field.name}-${optionId}`}
                          type="button"
                          onClick={() => handleToggleOption(field.name, opt)}
                          title={label}
                          className={`group flex items-center justify-between gap-2.5 rounded-md px-2.5 h-8 text-xs transition-colors text-left w-full shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50/90 text-[#007B83] font-medium border border-teal-200'
                              : 'text-gray-700 hover:bg-gray-100/80 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                isSelected
                                  ? 'bg-[#007B83] border-[#007B83] text-white'
                                  : 'border-gray-300 bg-white group-hover:border-gray-400'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </span>
                            <span className="truncate text-xs">{label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPopup;
import React, { useCallback, useEffect, useId, useMemo, useState, useRef } from 'react';
import { IoMdClose } from 'react-icons/io';
import { ChevronDown, LayoutGrid, MapPin, Monitor, RotateCcw } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
import MultiSelectDropdown from './MultiSelectDropdown';
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

function migrateTokensToIdsCsv(
  rawValue: string,
  opts: LocationOption[],
  labelFn: (opt: LocationOption) => string
): string {
  const tokens = splitCsvTokens(rawValue);
  if (!tokens.length) return '';
  const ids = tokens.map((token) => {
    const byId = opts.find((o) => String(o.id) === token);
    if (byId) return String(byId.id);
    const byLabel = opts.find((o) => labelFn(o) === token);
    return byLabel ? String(byLabel.id) : token;
  });
  return joinCsvTokens(ids);
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

type FilterPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  appliedValues: LocationFilterValues;
  onApply: (values: LocationFilterValues) => void;
  onReset: () => void;
  /** Filter sections with field definitions */
  filterSections?: FilterSection[];
  /** Options for each select field */
  options?: FilterOptions;
  /** `modal` keeps the existing popup. `inline` renders the on-page advanced filter. */
  variant?: 'modal' | 'inline';
};

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Location: MapPin,
  Properties: LayoutGrid,
  Device: Monitor,
};

const FilterPopup: React.FC<FilterPopupProps> = ({
  isOpen,
  onClose,
  appliedValues,
  onApply,
  onReset,
  filterSections,
  options = EMPTY_FILTER_OPTIONS,
  variant = 'modal',
}) => {
  const titleId = useId();
  const [draft, setDraft] = useState<LocationFilterValues>(appliedValues);
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set());
  const [allOptions, setAllOptions] = useState<FilterOptions>(options);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Location: true,
    Properties: false,
    Device: false,
  });
  const stateCascadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest generation per cascade target — stale async completions must not call updateFieldOptions. */
  const cascadeGenRef = useRef<Record<string, number>>({});

  const bumpCascadeGen = (key: string): number => {
    const next = (cascadeGenRef.current[key] ?? 0) + 1;
    cascadeGenRef.current[key] = next;
    return next;
  };

  const isStaleCascadeGen = (key: string, gen: number): boolean =>
    cascadeGenRef.current[key] !== gen;

  /** Single token for paired zoneArea + arterialRoute updates from city. */
  const CITY_CHILDREN_CASCADE_KEY = '__city_children__';

  const invalidateCascadeTargets = (keys: string[]) => {
    keys.forEach((k) => bumpCascadeGen(k));
  };

  const getNormalizedOptionLabel = useCallback((opt: LocationOption): string => {
    return String(opt.name || opt.label || opt.id || '').trim();
  }, []);

  const mergeUniqueOptions = useCallback((groups: LocationOption[][]): LocationOption[] => {
    const map = new Map<string, LocationOption>();
    groups.forEach((group) => {
      group.forEach((opt) => {
        const key = `${String(opt.id)}::${getNormalizedOptionLabel(opt).toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, opt);
        }
      });
    });
    return Array.from(map.values());
  }, [getNormalizedOptionLabel]);

  // Helper function to mark field as loading
  const setFieldLoading = useCallback((fieldName: string, isLoading: boolean) => {
    setLoadingFields((prev) => {
      const next = new Set(prev);
      if (isLoading) {
        next.add(fieldName);
      } else {
        next.delete(fieldName);
      }
      return next;
    });
  }, []);

  // Helper function to update options for a specific field
  const updateFieldOptions = useCallback((fieldName: string, newOptions: LocationOption[]) => {
    setAllOptions((prev) => ({
      ...prev,
      [fieldName]: newOptions,
    }));
  }, []);

  /** Resolve comma-separated tokens to option IDs (tokens are IDs for multi-select draft, or labels for country). */
  const getSelectedOptionIds = useCallback(
    (fieldName: string, selectedValue: string): Array<string | number> => {
      const tokens = splitCsvTokens(selectedValue);
      if (!tokens.length) return [];
      const opts = allOptions[fieldName] || [];
      return tokens
        .map((token) => {
          const byId = opts.find((o) => String(o.id) === token);
          if (byId) return byId.id;
          const trimmed = token.trim();
          const byLabel = opts.find((o) => getNormalizedOptionLabel(o) === trimmed);
          return byLabel?.id;
        })
        .filter((id): id is string | number => id !== undefined && id !== null);
    },
    [allOptions, getNormalizedOptionLabel]
  );

  // Initialize with options from parent or fetch if not provided and rehydrate dependent cascades.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadInitial = async () => {
      let countries: LocationOption[];
      let modeOfMedia: LocationOption[];
      let locationTypes: LocationOption[];
      try {
        [countries, modeOfMedia, locationTypes] = await Promise.all([
          fetchCountries(),
          fetchModeOfMedia(),
          fetchLocationTypes(),
        ]);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load initial filter options:', error);
        }
        return;
      }

      let nextOptions: FilterOptions = {
        ...options,
        country: countries,
        modeOfMedia,
        locationType: locationTypes,
      };

      const commit = () => {
        if (cancelled) return;
        setAllOptions({ ...nextOptions });
        setDraft((prev) => {
          const next = { ...prev };
          for (const field of MULTI_SELECT_FIELDS) {
            const opts = nextOptions[field as string] || [];
            next[field] = migrateTokensToIdsCsv(String(prev[field] ?? ''), opts, getNormalizedOptionLabel);
          }
          return next;
        });
      };

      commit();

      const resolveIds = (fieldName: string, rawValue: string) =>
        splitCsvTokens(rawValue)
          .map((item) => {
            const matched = (nextOptions[fieldName] || []).find((opt) => {
              const label = getNormalizedOptionLabel(opt);
              return label === item || String(opt.id) === item;
            });
            return matched?.id;
          })
          .filter((id): id is string | number => id !== undefined && id !== null);

      const countryIds = resolveIds('country', appliedValues.country);
      if (countryIds.length) {
        try {
          const statesByCountry = await Promise.all(countryIds.map((id) => fetchStates(id)));
          nextOptions = { ...nextOptions, state: mergeUniqueOptions(statesByCountry) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load state options for filter:', error);
        }
      }

      const stateIds = resolveIds('state', appliedValues.state);
      if (stateIds.length) {
        try {
          const citiesByState = await Promise.all(stateIds.map((id) => fetchCities(id)));
          nextOptions = { ...nextOptions, city: mergeUniqueOptions(citiesByState) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load city options for filter:', error);
        }
      }

      const cityIds = resolveIds('city', appliedValues.city);
      if (cityIds.length) {
        try {
          const zonesByCity = await Promise.all(cityIds.map((id) => fetchZones(id)));
          nextOptions = { ...nextOptions, zoneArea: mergeUniqueOptions(zonesByCity) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load zone options for filter:', error);
        }
        try {
          const arterialByCity = await Promise.all(cityIds.map((id) => fetchArterialRoutes(id)));
          nextOptions = { ...nextOptions, arterialRoute: mergeUniqueOptions(arterialByCity) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load arterial route options for filter:', error);
        }
      }

      const zoneIds = resolveIds('zoneArea', appliedValues.zoneArea);
      if (zoneIds.length) {
        try {
          const subZonesByZone = await Promise.all(zoneIds.map((id) => fetchSubZones(id)));
          nextOptions = { ...nextOptions, subZoneArea: mergeUniqueOptions(subZonesByZone) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load sub-zone options for filter:', error);
        }
      }

      const subZoneIds = resolveIds('subZoneArea', appliedValues.subZoneArea);
      if (subZoneIds.length) {
        try {
          const pincodesBySubZone = await Promise.all(subZoneIds.map((id) => fetchPincodes(id)));
          nextOptions = { ...nextOptions, pincode: mergeUniqueOptions(pincodesBySubZone) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load pincode options for filter:', error);
        }
      }

      const modeIds = resolveIds('modeOfMedia', appliedValues.modeOfMedia);
      if (modeIds.length) {
        try {
          const publishersByMode = await Promise.all(modeIds.map((id) => fetchPublishers(id)));
          nextOptions = { ...nextOptions, publisher: mergeUniqueOptions(publishersByMode) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load publisher options for filter:', error);
        }
      }

      const publisherIds = resolveIds('publisher', appliedValues.publisher);
      if (publisherIds.length) {
        try {
          const mainCategoriesByPublisher = await Promise.all(
            publisherIds.map((id) => fetchMainCategories(id))
          );
          nextOptions = { ...nextOptions, mainCategory: mergeUniqueOptions(mainCategoriesByPublisher) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load main category options for filter:', error);
        }
      }

      const mainCategoryIds = resolveIds('mainCategory', appliedValues.mainCategory);
      if (mainCategoryIds.length) {
        try {
          const categoriesByMainCategory = await Promise.all(
            mainCategoryIds.map((id) => fetchCategories(id))
          );
          nextOptions = { ...nextOptions, category: mergeUniqueOptions(categoriesByMainCategory) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load category options for filter:', error);
        }
      }

      const categoryIds = resolveIds('category', appliedValues.category);
      if (categoryIds.length) {
        try {
          const subCategoriesByCategory = await Promise.all(
            categoryIds.map((id) => fetchSubCategories(id))
          );
          nextOptions = { ...nextOptions, categorySub: mergeUniqueOptions(subCategoriesByCategory) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load sub-category options for filter:', error);
        }
      }

      const locationTypeIds = resolveIds('locationType', appliedValues.locationType);
      if (locationTypeIds.length) {
        try {
          const orientationsByLocationType = await Promise.all(
            locationTypeIds.map((id) => fetchOrientations(id))
          );
          nextOptions = { ...nextOptions, orientation: mergeUniqueOptions(orientationsByLocationType) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load orientation options for filter:', error);
        }
      }

      const orientationIds = resolveIds('orientation', appliedValues.orientation);
      if (orientationIds.length) {
        try {
          const resolutionsByOrientation = await Promise.all(
            orientationIds.map((id) => fetchResolutions(id))
          );
          nextOptions = { ...nextOptions, resolution: mergeUniqueOptions(resolutionsByOrientation) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load resolution options for filter:', error);
        }
      }

      const resolutionIds = resolveIds('resolution', appliedValues.resolution);
      if (resolutionIds.length) {
        try {
          const screenLocationsByResolution = await Promise.all(
            resolutionIds.map((id) => fetchScreenLocations(id))
          );
          nextOptions = { ...nextOptions, screenLocation: mergeUniqueOptions(screenLocationsByResolution) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load screen location options for filter:', error);
        }
      }

      const screenLocationIds = resolveIds('screenLocation', appliedValues.screenLocation);
      if (screenLocationIds.length) {
        try {
          const stretchesByScreenLocation = await Promise.all(
            screenLocationIds.map((id) => fetchStretches(id))
          );
          nextOptions = { ...nextOptions, stretch: mergeUniqueOptions(stretchesByScreenLocation) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load stretch options for filter:', error);
        }
      }

      const stretchIds = resolveIds('stretch', appliedValues.stretch);
      if (stretchIds.length) {
        try {
          const propertiesByStretch = await Promise.all(stretchIds.map((id) => fetchProperties(id)));
          nextOptions = { ...nextOptions, property: mergeUniqueOptions(propertiesByStretch) };
          commit();
        } catch (error) {
          if (!cancelled) console.warn('Failed to load property options for filter:', error);
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
    mergeUniqueOptions,
  ]);

  useEffect(() => {
    if (isOpen) return;
    if (stateCascadeTimerRef.current) {
      clearTimeout(stateCascadeTimerRef.current);
      stateCascadeTimerRef.current = null;
      setFieldLoading('city', false);
    }
  }, [isOpen, setFieldLoading]);

  // Handle cascading updates when a field changes
  const handleFieldChange = useCallback(
    async (fieldName: keyof LocationFilterValues, value: string) => {
      const newDraft = {
        ...draft,
        [fieldName]: value,
      };

      // Cascading logic - reset dependent fields when parent changes
      if (fieldName === 'country' && value !== draft.country) {
        newDraft.state = '';
        newDraft.city = '';
        newDraft.zoneArea = '';
        newDraft.subZoneArea = '';
        newDraft.pincode = '';
        newDraft.arterialRoute = '';
      }

      if (fieldName === 'state' && value !== draft.state) {
        newDraft.city = '';
        newDraft.zoneArea = '';
        newDraft.subZoneArea = '';
        newDraft.pincode = '';
        newDraft.arterialRoute = '';
      }

      if (fieldName === 'city' && value !== draft.city) {
        newDraft.zoneArea = '';
        newDraft.subZoneArea = '';
        newDraft.pincode = '';
        newDraft.arterialRoute = '';
      }

      if (fieldName === 'zoneArea' && value !== draft.zoneArea) {
        newDraft.subZoneArea = '';
        newDraft.pincode = '';
      }

      if (fieldName === 'subZoneArea' && value !== draft.subZoneArea) {
        newDraft.pincode = '';
      }

      if (fieldName === 'mainCategory' && value !== draft.mainCategory) {
        newDraft.category = '';
        newDraft.categorySub = '';
      }

      if (fieldName === 'modeOfMedia' && value !== draft.modeOfMedia) {
        newDraft.publisher = '';
        newDraft.mainCategory = '';
        newDraft.category = '';
        newDraft.categorySub = '';
      }

      if (fieldName === 'publisher' && value !== draft.publisher) {
        newDraft.mainCategory = '';
        newDraft.category = '';
        newDraft.categorySub = '';
      }

      if (fieldName === 'category' && value !== draft.category) {
        newDraft.categorySub = '';
      }

      if (fieldName === 'locationType' && value !== draft.locationType) {
        newDraft.orientation = '';
        newDraft.resolution = '';
        newDraft.screenLocation = '';
        newDraft.stretch = '';
        newDraft.property = '';
      }

      if (fieldName === 'orientation' && value !== draft.orientation) {
        newDraft.resolution = '';
        newDraft.screenLocation = '';
        newDraft.stretch = '';
        newDraft.property = '';
      }

      if (fieldName === 'resolution' && value !== draft.resolution) {
        newDraft.screenLocation = '';
        newDraft.stretch = '';
        newDraft.property = '';
      }

      if (fieldName === 'screenLocation' && value !== draft.screenLocation) {
        newDraft.stretch = '';
        newDraft.property = '';
      }

      if (fieldName === 'stretch' && value !== draft.stretch) {
        newDraft.property = '';
      }

      setDraft(newDraft);

      // Fetch dependent field data
      try {
        if (fieldName === 'country' && value) {
          const countryId = getSelectedOptionIds('country', value)[0];
          if (countryId === undefined) return;
          invalidateCascadeTargets(['city', CITY_CHILDREN_CASCADE_KEY, 'subZoneArea', 'pincode']);
          const gen = bumpCascadeGen('state');
          setFieldLoading('state', true);
          try {
            const states = await fetchStates(countryId);
            if (isStaleCascadeGen('state', gen)) return;
            updateFieldOptions('state', states);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('state', false);
          }
        }

        if (fieldName === 'state') {
          if (!value) {
            if (stateCascadeTimerRef.current) {
              clearTimeout(stateCascadeTimerRef.current);
              stateCascadeTimerRef.current = null;
            }
            invalidateCascadeTargets([CITY_CHILDREN_CASCADE_KEY, 'subZoneArea', 'pincode']);
            bumpCascadeGen('city');
            setFieldLoading('city', false);
            updateFieldOptions('city', []);
          } else {
            invalidateCascadeTargets([CITY_CHILDREN_CASCADE_KEY, 'subZoneArea', 'pincode']);
            bumpCascadeGen('city');
            if (stateCascadeTimerRef.current) {
              clearTimeout(stateCascadeTimerRef.current);
              stateCascadeTimerRef.current = null;
              // Cancelled callbacks never reach `finally`, so clear loading from superseded runs.
              setFieldLoading('city', false);
            }
            setFieldLoading('city', true);
            stateCascadeTimerRef.current = setTimeout(async () => {
              const gen = bumpCascadeGen('city');
              try {
                const stateIds = getSelectedOptionIds('state', value);
                if (!stateIds.length) {
                  if (!isStaleCascadeGen('city', gen)) {
                    updateFieldOptions('city', []);
                  }
                  return;
                }
                const citiesByState = await Promise.all(stateIds.map((stateId) => fetchCities(stateId)));
                const cities = mergeUniqueOptions(citiesByState);
                if (isStaleCascadeGen('city', gen)) return;
                updateFieldOptions('city', cities);
              } catch (error) {
                console.warn('State cascade fetch error handled gracefully:', error);
              } finally {
                setFieldLoading('city', false);
              }
            }, 300);
            return;
          }
        }

        if (fieldName === 'city' && value) {
          const cityIds = getSelectedOptionIds('city', value);
          if (!cityIds.length) return;
          invalidateCascadeTargets(['subZoneArea', 'pincode']);
          const gen = bumpCascadeGen(CITY_CHILDREN_CASCADE_KEY);
          setFieldLoading('zoneArea', true);
          setFieldLoading('arterialRoute', true);
          try {
            const [zonesByCity, arterialRoutesByCity] = await Promise.all([
              Promise.all(cityIds.map((cityId) => fetchZones(cityId))),
              Promise.all(cityIds.map((cityId) => fetchArterialRoutes(cityId))),
            ]);
            const zones = mergeUniqueOptions(zonesByCity);
            const arterialRoutes = mergeUniqueOptions(arterialRoutesByCity);
            if (isStaleCascadeGen(CITY_CHILDREN_CASCADE_KEY, gen)) return;
            updateFieldOptions('zoneArea', zones);
            updateFieldOptions('arterialRoute', arterialRoutes);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('zoneArea', false);
            setFieldLoading('arterialRoute', false);
          }
        }

        if (fieldName === 'zoneArea' && value) {
          const zoneIds = getSelectedOptionIds('zoneArea', value);
          if (!zoneIds.length) return;
          invalidateCascadeTargets(['pincode']);
          const gen = bumpCascadeGen('subZoneArea');
          setFieldLoading('subZoneArea', true);
          try {
            const subZonesByZone = await Promise.all(zoneIds.map((zoneId) => fetchSubZones(zoneId)));
            const subZones = mergeUniqueOptions(subZonesByZone);
            if (isStaleCascadeGen('subZoneArea', gen)) return;
            updateFieldOptions('subZoneArea', subZones);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('subZoneArea', false);
          }
        }

        if (fieldName === 'subZoneArea' && value) {
          const subZoneIds = getSelectedOptionIds('subZoneArea', value);
          if (!subZoneIds.length) return;
          const gen = bumpCascadeGen('pincode');
          setFieldLoading('pincode', true);
          try {
            const pincodesBySubZone = await Promise.all(subZoneIds.map((subZoneId) => fetchPincodes(subZoneId)));
            const pincodes = mergeUniqueOptions(pincodesBySubZone);
            if (isStaleCascadeGen('pincode', gen)) return;
            updateFieldOptions('pincode', pincodes);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('pincode', false);
          }
        }

        if (fieldName === 'mainCategory' && value) {
          const mainCategoryIds = getSelectedOptionIds('mainCategory', value);
          if (!mainCategoryIds.length) return;
          invalidateCascadeTargets(['category', 'categorySub']);
          const gen = bumpCascadeGen('category');
          setFieldLoading('category', true);
          try {
            const categoriesByMainCategory = await Promise.all(
              mainCategoryIds.map((mainCategoryId) => fetchCategories(mainCategoryId))
            );
            const categories = mergeUniqueOptions(categoriesByMainCategory);
            if (isStaleCascadeGen('category', gen)) return;
            updateFieldOptions('category', categories);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('category', false);
          }
        }

        if (fieldName === 'category' && value) {
          const categoryIds = getSelectedOptionIds('category', value);
          if (!categoryIds.length) return;
          invalidateCascadeTargets(['categorySub']);
          const gen = bumpCascadeGen('categorySub');
          setFieldLoading('categorySub', true);
          try {
            const subCategoriesByCategory = await Promise.all(
              categoryIds.map((categoryId) => fetchSubCategories(categoryId))
            );
            const subCategories = mergeUniqueOptions(subCategoriesByCategory);
            if (isStaleCascadeGen('categorySub', gen)) return;
            updateFieldOptions('categorySub', subCategories);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('categorySub', false);
          }
        }

        if (fieldName === 'modeOfMedia' && value) {
          const modeOfMediaIds = getSelectedOptionIds('modeOfMedia', value);
          if (!modeOfMediaIds.length) return;
          invalidateCascadeTargets(['publisher', 'mainCategory', 'category', 'categorySub']);
          const gen = bumpCascadeGen('publisher');
          setFieldLoading('publisher', true);
          try {
            const publishersByMode = await Promise.all(
              modeOfMediaIds.map((modeOfMediaValue) => fetchPublishers(modeOfMediaValue))
            );
            const publishers = mergeUniqueOptions(publishersByMode);
            if (isStaleCascadeGen('publisher', gen)) return;
            updateFieldOptions('publisher', publishers);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('publisher', false);
          }
        }

        if (fieldName === 'publisher' && value) {
          const publisherIds = getSelectedOptionIds('publisher', value);
          if (!publisherIds.length) return;
          invalidateCascadeTargets(['mainCategory', 'category', 'categorySub']);
          const gen = bumpCascadeGen('mainCategory');
          setFieldLoading('mainCategory', true);
          try {
            const mainCategoriesByPublisher = await Promise.all(
              publisherIds.map((publisherValue) => fetchMainCategories(publisherValue))
            );
            const mainCategories = mergeUniqueOptions(mainCategoriesByPublisher);
            if (isStaleCascadeGen('mainCategory', gen)) return;
            updateFieldOptions('mainCategory', mainCategories);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('mainCategory', false);
          }
        }

        if (fieldName === 'locationType' && value) {
          const locationTypeIds = getSelectedOptionIds('locationType', value);
          if (!locationTypeIds.length) return;
          invalidateCascadeTargets(['orientation', 'resolution', 'screenLocation', 'stretch', 'property']);
          const gen = bumpCascadeGen('orientation');
          setFieldLoading('orientation', true);
          try {
            const orientationsByLocationType = await Promise.all(
              locationTypeIds.map((locationTypeValue) => fetchOrientations(locationTypeValue))
            );
            const orientations = mergeUniqueOptions(orientationsByLocationType);
            if (isStaleCascadeGen('orientation', gen)) return;
            updateFieldOptions('orientation', orientations);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('orientation', false);
          }
        }

        if (fieldName === 'orientation' && value) {
          const orientationIds = getSelectedOptionIds('orientation', value);
          if (!orientationIds.length) return;
          invalidateCascadeTargets(['resolution', 'screenLocation', 'stretch', 'property']);
          const gen = bumpCascadeGen('resolution');
          setFieldLoading('resolution', true);
          try {
            const resolutionsByOrientation = await Promise.all(
              orientationIds.map((orientationValue) => fetchResolutions(orientationValue))
            );
            const resolutions = mergeUniqueOptions(resolutionsByOrientation);
            if (isStaleCascadeGen('resolution', gen)) return;
            updateFieldOptions('resolution', resolutions);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('resolution', false);
          }
        }

        if (fieldName === 'resolution' && value) {
          const resolutionIds = getSelectedOptionIds('resolution', value);
          if (!resolutionIds.length) return;
          invalidateCascadeTargets(['screenLocation', 'stretch', 'property']);
          const gen = bumpCascadeGen('screenLocation');
          setFieldLoading('screenLocation', true);
          try {
            const screenLocationsByResolution = await Promise.all(
              resolutionIds.map((resolutionValue) => fetchScreenLocations(resolutionValue))
            );
            const screenLocations = mergeUniqueOptions(screenLocationsByResolution);
            if (isStaleCascadeGen('screenLocation', gen)) return;
            updateFieldOptions('screenLocation', screenLocations);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('screenLocation', false);
          }
        }

        if (fieldName === 'screenLocation' && value) {
          const screenLocationIds = getSelectedOptionIds('screenLocation', value);
          if (!screenLocationIds.length) return;
          invalidateCascadeTargets(['stretch', 'property']);
          const gen = bumpCascadeGen('stretch');
          setFieldLoading('stretch', true);
          try {
            const stretchesByScreenLocation = await Promise.all(
              screenLocationIds.map((screenLocationValue) => fetchStretches(screenLocationValue))
            );
            const stretches = mergeUniqueOptions(stretchesByScreenLocation);
            if (isStaleCascadeGen('stretch', gen)) return;
            updateFieldOptions('stretch', stretches);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('stretch', false);
          }
        }

        if (fieldName === 'stretch' && value) {
          const stretchIds = getSelectedOptionIds('stretch', value);
          if (!stretchIds.length) return;
          invalidateCascadeTargets(['property']);
          const gen = bumpCascadeGen('property');
          setFieldLoading('property', true);
          try {
            const propertiesByStretch = await Promise.all(
              stretchIds.map((stretchValue) => fetchProperties(stretchValue))
            );
            const properties = mergeUniqueOptions(propertiesByStretch);
            if (isStaleCascadeGen('property', gen)) return;
            updateFieldOptions('property', properties);
          } catch (error) {
            console.warn('Cascade fetch error handled gracefully:', error);
          } finally {
            setFieldLoading('property', false);
          }
        }
      } catch (error) {
        console.warn('Cascade fetch error handled gracefully:', error);
        // Errors are silently handled - dropdowns will show empty if API fails
      }
    },
    [draft, getSelectedOptionIds, mergeUniqueOptions, setFieldLoading, updateFieldOptions]
  );

  const handleApply = useCallback(() => {
    const outgoing: LocationFilterValues = { ...draft };
    for (const field of MULTI_SELECT_FIELDS) {
      const opts = allOptions[field as string] || [];
      outgoing[field] = idsCsvToLabelsCsv(String(draft[field] ?? ''), opts, getNormalizedOptionLabel);
    }
    onApply(outgoing);
    if (variant !== 'inline') onClose();
  }, [allOptions, draft, getNormalizedOptionLabel, onApply, onClose, variant]);

  const handleReset = useCallback(() => {
    setDraft({
      country: 'India',
      state: '',
      city: '',
      zoneArea: '',
      subZoneArea: '',
      pincode: '',
      arterialRoute: '',
      modeOfMedia: '',
      publisher: '',
      mainCategory: '',
      category: '',
      categorySub: '',
      locationType: '',
      orientation: '',
      resolution: '',
      screenLocation: '',
      stretch: '',
      property: '',
    });
    onReset();
    if (variant !== 'inline') onClose();
  }, [onReset, onClose, variant]);

  // Close only on Escape key press (not on outside click)
  useEffect(() => {
    if (!isOpen || variant === 'inline') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, variant]);

  useEffect(() => {
    return () => {
      if (stateCascadeTimerRef.current) {
        clearTimeout(stateCascadeTimerRef.current);
        stateCascadeTimerRef.current = null;
      }
    };
  }, []);

  const getCountrySelectOptions = (): string[] => {
    const opts = allOptions.country;
    if (!opts) return [];
    return opts.map((opt: LocationOption) => getNormalizedOptionLabel(opt));
  };

  const getMultiSelectStructuredOptions = (
    fieldName: string
  ): Array<{ value: string; label: string }> => {
    const opts = allOptions[fieldName];
    if (!opts) return [];
    return opts.map((opt: LocationOption) => ({
      value: String(opt.id),
      label: getNormalizedOptionLabel(opt),
    }));
  };

  const isFieldEnabled = (fieldName: keyof LocationFilterValues): boolean => {
    if (fieldName === 'state') return Boolean(draft.country);
    if (fieldName === 'city') return Boolean(draft.state);
    if (fieldName === 'zoneArea') return Boolean(draft.city);
    if (fieldName === 'subZoneArea') return Boolean(draft.zoneArea);
    if (fieldName === 'pincode') return Boolean(draft.subZoneArea);
    if (fieldName === 'arterialRoute') return Boolean(draft.city);

    if (fieldName === 'publisher') return Boolean(draft.modeOfMedia);
    if (fieldName === 'mainCategory') return Boolean(draft.publisher);
    if (fieldName === 'category') return Boolean(draft.mainCategory);
    if (fieldName === 'categorySub') return Boolean(draft.category);

    if (fieldName === 'orientation') return Boolean(draft.locationType);
    if (fieldName === 'resolution') return Boolean(draft.orientation);
    if (fieldName === 'screenLocation') return Boolean(draft.resolution);
    if (fieldName === 'stretch') return Boolean(draft.screenLocation);
    if (fieldName === 'property') return Boolean(draft.stretch);

    return true;
  };

  const defaultFilterSections: FilterSection[] = [
    {
      title: 'Location',
      fields: [
        { name: 'country', label: 'Country' },
        { name: 'state', label: 'State' },
        { name: 'city', label: 'City' },
        { name: 'zoneArea', label: 'Zone' },
        { name: 'subZoneArea', label: 'Sub Zone' },
        { name: 'pincode', label: 'Pincode' },
        { name: 'arterialRoute', label: 'Arterial Route' },
      ],
    },
    {
      title: 'Properties',
      fields: [
        { name: 'modeOfMedia', label: 'Mode of Media (Screen Type)' },
        { name: 'publisher', label: 'Publisher' },
        { name: 'mainCategory', label: 'Main Category' },
        { name: 'category', label: 'Properties' },
        { name: 'categorySub', label: 'Sub Category' },
      ],
    },
    {
      title: 'Device',
      fields: [
        { name: 'locationType', label: 'Location Type' },
        { name: 'orientation', label: 'Orientation' },
        { name: 'resolution', label: 'Resolution' },
        { name: 'screenLocation', label: 'Screen Location' },
        { name: 'stretch', label: 'Stretch' },
        { name: 'property', label: 'Property' },
      ],
    },
  ];

  const sectionsToRender = filterSections || defaultFilterSections;

  const activeDimensionCount = useMemo(
    () =>
      Object.entries(draft).filter(([key, value]) => {
        if (key === 'country' && String(value).trim() === 'India') return false;
        return Boolean(String(value).trim());
      }).length,
    [draft]
  );

  const sectionGridClass = (title: string) => {
    if (title === 'Location') return 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7';
    if (title === 'Properties') return 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
    return 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
  };

  const renderField = (
    field: FilterSection['fields'][number],
    labelClassName: string
  ) => {
    const isLoading = loadingFields.has(field.name as string);
    const enabled = isFieldEnabled(field.name);

    if (field.name === 'country') {
      const countryOptions = getCountrySelectOptions();
      return (
        <label key={field.name} className="block min-w-0">
          <span className={labelClassName}>
            {field.label}
            {isLoading && <span className="ml-1 text-xs text-blue-600">• Loading...</span>}
          </span>
          <SelectDropdown
            name={field.name as string}
            value={draft[field.name]}
            placeholder={`Select ${field.label.toLowerCase()}`}
            options={countryOptions}
            onChange={(val) =>
              handleFieldChange(
                field.name,
                typeof val === 'string' ? val : val[0] || ''
              )
            }
            disabled={isLoading || !enabled}
            className="w-full"
            inputClassName="h-10 !rounded-xl"
            searchable
          />
        </label>
      );
    }

    const multiOptions = getMultiSelectStructuredOptions(field.name as string);
    return (
      <label key={field.name} className="block min-w-0">
        <span className={labelClassName}>
          {field.label}
          {isLoading && <span className="ml-1 text-xs text-blue-600">• Loading...</span>}
        </span>
        <MultiSelectDropdown
          name={field.name as string}
          value={splitCsvTokens(draft[field.name])}
          placeholder={`Select ${field.label.toLowerCase()}`}
          options={multiOptions}
          onChange={(vals) => handleFieldChange(field.name, joinCsvTokens(vals))}
          disabled={isLoading || !enabled}
          className="w-full"
          inputClassName="h-10 !rounded-xl"
          multi
          horizontalScroll
          hideScrollbar
        />
      </label>
    );
  };

  const getFieldSelectedLabels = (fieldName: keyof LocationFilterValues): string[] => {
    const raw = String(draft[fieldName] ?? '').trim();
    if (!raw) return [];
    if (fieldName === 'country') return [raw];
    return splitCsvTokens(raw).map((token) => {
      const opt = (allOptions[fieldName as string] || []).find(
        (item) => String(item.id) === token || getNormalizedOptionLabel(item) === token
      );
      return opt ? getNormalizedOptionLabel(opt) : token;
    });
  };

  if (!isOpen) return null;

  if (variant === 'inline') {
    return (
      <div className="space-y-3">
        {sectionsToRender.map((section) => {
          const Icon = SECTION_ICONS[section.title];
          const isExpanded = openSections[section.title] ?? section.title === 'Location';
          const selectedLabels = section.fields.flatMap((field) => getFieldSelectedLabels(field.name));
          return (
            <section
              key={section.title}
              className={`rounded-lg border border-gray-200 bg-white ${isExpanded ? 'relative z-20' : ''}`}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenSections({
                    Location: false,
                    Properties: false,
                    Device: false,
                    [section.title]: !isExpanded,
                  })
                }
                aria-expanded={isExpanded}
                className="!flex !h-auto !w-full !items-center !justify-between !gap-3 !rounded-lg !border-0 !bg-transparent !px-4 !py-3 !text-left !shadow-none hover:!bg-gray-50 !outline-none"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-[#f26222]" strokeWidth={2.25} /> : null}
                  <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f26222]">
                    {section.title}
                  </h3>
                  {!isExpanded && selectedLabels.length > 0 ? (
                    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                      {selectedLabels.slice(0, 3).map((label) => (
                        <span
                          key={label}
                          className="inline-flex max-w-[9rem] truncate rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                        >
                          {label}
                        </span>
                      ))}
                      {selectedLabels.length > 3 ? (
                        <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                          +{selectedLabels.length - 3}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              <div
                className={
                  isExpanded
                    ? `border-t border-gray-100 px-4 py-4 ${sectionGridClass(section.title)}`
                    : 'hidden'
                }
              >
                {section.fields.map((field) =>
                  renderField(
                    field,
                    'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400'
                  )
                )}
              </div>
            </section>
          );
        })}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-400">
            {activeDimensionCount} active filter dimension{activeDimensionCount === 1 ? '' : 's'} configured
          </p>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="!inline-flex !h-10 !items-center !justify-center !gap-2 !rounded-lg !border !border-solid !border-gray-200 !bg-white !px-4 !py-0 !text-sm !font-medium !text-gray-700 !shadow-sm hover:!bg-gray-50 !outline-none focus-visible:!ring-2 focus-visible:!ring-gray-300"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="!inline-flex !h-10 !items-center !justify-center !rounded-lg !border-0 !bg-[#f26222] !px-5 !py-0 !text-sm !font-medium !text-white !shadow-sm hover:!bg-[#d9551c] !outline-none focus-visible:!ring-2 focus-visible:!ring-orange-200"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Light overlay backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,80rem)] lg:w-[min(70vw-2rem,80rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-xl ring-1 ring-black/5 max-h-[calc(100vh-3rem)] overflow-y-auto"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-md font-semibold text-gray-900">
            Filter Inventory
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0"
            aria-label="Close"
          >
            <IoMdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {sectionsToRender.map((section) => (
            <div key={section.title} className="outer-wrapper">
              <h3 className="text-base font-semibold text-gray-800 mb-3">{section.title}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {section.fields.map((field) => {
                  const isLoading = loadingFields.has(field.name as string);
                  const enabled = isFieldEnabled(field.name);

                  if (field.name === 'country') {
                    const countryOptions = getCountrySelectOptions();
                    return (
                      <label key={field.name} className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-700">
                          {field.label}
                          {isLoading && <span className="ml-1 text-xs text-blue-600">• Loading...</span>}
                        </span>
                        <SelectDropdown
                          name={field.name as string}
                          value={draft[field.name]}
                          placeholder={`Select ${field.label.toLowerCase()}`}
                          options={countryOptions}
                          onChange={(val) =>
                            handleFieldChange(
                              field.name,
                              typeof val === 'string' ? val : val[0] || ''
                            )
                          }
                          disabled={isLoading || !enabled}
                          className="w-full"
                          inputClassName="h-10"
                          searchable
                        />
                      </label>
                    );
                  }

                  const multiOptions = getMultiSelectStructuredOptions(field.name as string);
                  return (
                    <label key={field.name} className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-700">
                        {field.label}
                        {isLoading && <span className="ml-1 text-xs text-blue-600">• Loading...</span>}
                      </span>
                      <MultiSelectDropdown
                        name={field.name as string}
                        value={splitCsvTokens(draft[field.name])}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                        options={multiOptions}
                        onChange={(vals) => handleFieldChange(field.name, joinCsvTokens(vals))}
                        disabled={isLoading || !enabled}
                        className="w-full"
                        inputClassName="h-10"
                        multi
                        horizontalScroll
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="btn-primary"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="btn-primary !bg-black"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterPopup;
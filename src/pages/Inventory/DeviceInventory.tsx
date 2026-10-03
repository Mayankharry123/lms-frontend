/**
 * @file DeviceInventory.tsx
 * @description Device inventory list with filters, export, and detail view.
 */

import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Filter, RotateCcw, X } from 'lucide-react';
import Pagination from '../../components/ui/Pagination';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import ExportExcelButton from '../../components/ui/ExportExcelButton';
import MasterHeader from '../../components/ui/MasterHeader';
import PPTExport from '../../components/ui/PPTExport';
import {
  getDeviceInventoryDetail,
  type DeviceData,
} from '../../services/DeviceInventory';
import { useDeviceInventoryList } from '../../hooks/useDeviceInventoryList';
import { useDeviceInventoryMap } from '../../hooks/useDeviceInventoryMap';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../constants/routes';
import { isAbortError } from '../../utils/requestControl';
import { DEFAULT_APPLIED_LOCATION } from './deviceInventoryConfig.ts';
import { buildDeviceTableColumns } from './deviceInventoryColumns.tsx';
import DeviceDetailModal from './DeviceDetailModal';
import DeviceInventoryMap from '../../components/inventory/DeviceInventoryMap';

const ITEMS_PER_PAGE = 10;
const FILTER_TRANSITION_MS = 300;
const FilterPopup = lazy(() => import('../../components/ui/FilterPopup'));

export type DeviceInventoryPageProps = {
  title?: string;
  path?: string;
};

const DeviceInventory: React.FC<DeviceInventoryPageProps> = ({
  title = 'Device Inventory',
  path = ROUTES.INVENTORY_DEVICE,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRendered, setFilterRendered] = useState(false);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [appliedLocation, setAppliedLocation] = useState(DEFAULT_APPLIED_LOCATION);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailAbortRef = useRef<AbortController | null>(null);
  const filterAnimationFrameRef = useRef<number | null>(null);
  const filterCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInventoryFilters = useCallback(
    () => ({
      search: searchQuery.trim() || undefined,
      country: appliedLocation.country.trim() || 'India',
      state: appliedLocation.state.trim() || undefined,
      city: appliedLocation.city.trim() || undefined,
      zone: appliedLocation.zoneArea.trim() || undefined,
      subZoneArea: appliedLocation.subZoneArea.trim() || undefined,
      pincode: appliedLocation.pincode.trim() || undefined,
      arterialRoute: appliedLocation.arterialRoute.trim() || undefined,
      modeOfMedia: appliedLocation.modeOfMedia.trim() || undefined,
      publisher: appliedLocation.publisher.trim() || undefined,
      mainCategory: appliedLocation.mainCategory.trim() || undefined,
      categorySub: appliedLocation.categorySub.trim() || undefined,
      category: appliedLocation.category.trim() || undefined,
      locationType: appliedLocation.locationType.trim() || undefined,
      orientation: appliedLocation.orientation.trim() || undefined,
      resolution: appliedLocation.resolution.trim() || undefined,
      screenLocation: appliedLocation.screenLocation.trim() || undefined,
      stretch: appliedLocation.stretch.trim() || undefined,
      property: appliedLocation.property.trim() || undefined,
    }),
    [searchQuery, appliedLocation]
  );

  const {
    data,
    currentPage,
    totalItems,
    loading,
    refreshing,
    setCurrentPage,
    resetToFirstPage,
    exportExcel,
    hasExportableRows,
  } = useDeviceInventoryList({
    pageSize: ITEMS_PER_PAGE,
    getFilters: getInventoryFilters,
  });

  const { markers, loading: mapLoading } = useDeviceInventoryMap({
    getFilters: getInventoryFilters,
  });

  const { theme } = useTheme();
  const mapPointColor = useMemo(() => {
    if (typeof document === 'undefined') return '#f26222';
    return (
      getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() ||
      '#f26222'
    );
  }, [theme]);

  const hasActiveLocationFilter = useMemo(
    () =>
      // Treat every applied filter, including the default country, as active for the filter affordance.
      Object.values(appliedLocation).some((value) => {
        return Boolean(value.trim());
      }),
    [appliedLocation]
  );

  const hasAppliedFilters = useMemo(() => {
    const extraFilters = { ...appliedLocation, country: '' };
    return Boolean(
      searchQuery.trim() || Object.values(extraFilters).some((value) => Boolean(value.trim()))
    );
  }, [appliedLocation, searchQuery]);

  const handleViewDetails = useCallback((item: DeviceData) => {
    detailAbortRef.current?.abort();
    setDetailLoading(false);
    setSelectedDevice(item);
  }, []);

  const handleCloseDetails = useCallback(() => {
    detailAbortRef.current?.abort();
    setDetailLoading(false);
    setSelectedDevice(null);
  }, []);

  const handleMapMarkerSelect = useCallback(async (id: string) => {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    setSelectedDevice(null);
    setDetailLoading(true);
    try {
      const detail = await getDeviceInventoryDetail(id, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSelectedDevice(detail);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      setSelectedDevice(null);
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setAppliedLocation(DEFAULT_APPLIED_LOCATION);
    setFilterResetKey((previous) => previous + 1);
    resetToFirstPage();
  }, [resetToFirstPage]);

  const handleOpenFilters = useCallback(() => {
    if (filterCloseTimerRef.current) {
      clearTimeout(filterCloseTimerRef.current);
      filterCloseTimerRef.current = null;
    }
    setFilterRendered(true);
    filterAnimationFrameRef.current = window.requestAnimationFrame(() => {
      setFilterOpen(true);
      filterAnimationFrameRef.current = null;
    });
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFilterOpen(false);
    if (filterCloseTimerRef.current) clearTimeout(filterCloseTimerRef.current);
    filterCloseTimerRef.current = setTimeout(() => {
      setFilterRendered(false);
      filterCloseTimerRef.current = null;
    }, FILTER_TRANSITION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (filterAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(filterAnimationFrameRef.current);
      }
      if (filterCloseTimerRef.current) clearTimeout(filterCloseTimerRef.current);
    };
  }, []);

  const columns = useMemo(
    () => buildDeviceTableColumns(handleViewDetails),
    [handleViewDetails]
  );

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden space-y-4">
      <div className="space-y-3">
      <MasterHeader
        onCreateClick={() => undefined}
        createButtonLabel="Add Device"
        showBreadcrumb
        showCreateButton={false}
        className="!mb-0"
        breadcrumbItems={[{ label: title, path }]}
        endContent={
          filterOpen ? (
            <div className="flex items-center justify-end gap-2">
              <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--nav-active-border)] bg-[var(--nav-active-bg)] px-3 text-sm font-semibold text-[var(--nav-active-text)] shadow-[var(--card-shadow)]">
                <Filter className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                <span>Filters</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                aria-label="Reset all filters"
                title="Reset all filters"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--brand-primary)] shadow-[var(--card-shadow)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--nav-hover)]"
              >
                <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleCloseFilters}
                aria-label="Close filters"
                title="Close filters"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-nav)] shadow-[var(--card-shadow)] transition-colors hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent-soft)] hover:text-[var(--brand-accent)]"
              >
                <X className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span>Close</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleOpenFilters}
                aria-expanded={false}
                aria-label="Open filters"
                title="Open filters"
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-[var(--surface)] px-3.5 text-sm font-semibold shadow-[var(--card-shadow)] transition-colors hover:bg-[var(--nav-hover)] ${
                  hasActiveLocationFilter
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-nav)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                }`}
              >
                <Filter className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                <span>Filters</span>
              </button>
            </div>
          )
        }
      />

      {/* Top: All Filter Cards in ONE horizontal row */}
      {filterRendered && (
        <div
          className={`relative z-[1] overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
            filterOpen
              ? 'max-h-[1200px] translate-y-0 opacity-100'
              : 'pointer-events-none max-h-0 -translate-y-3 opacity-0'
          }`}
        >
          <Suspense
            fallback={
              <div className="flex min-h-20 items-center justify-center rounded-xl border border-gray-200 bg-white text-xs text-gray-500">
                Loading filters…
              </div>
            }
          >
            <FilterPopup
              key={filterResetKey}
              isOpen
              showHeader={false}
              appliedValues={appliedLocation}
              onApply={(values) => {
                setAppliedLocation(values);
                resetToFirstPage();
              }}
              onReset={handleResetFilters}
              onClose={handleCloseFilters}
            />
          </Suspense>
        </div>
      )}
      </div>

      <div className="relative z-0">
        <DeviceInventoryMap
          markers={markers}
          loading={mapLoading}
          autoFit={hasAppliedFilters}
          pointColor={mapPointColor}
          scrollWheelZoom={false}
          zoomControlPosition="topright"
          onMarkerSelect={handleMapMarkerSelect}
        />
      </div>

      {/* Below: Full-width Inventory List/Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-3 md:flex-nowrap md:px-6 md:py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 md:text-base">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {loading
                ? 'Loading devices…'
                : totalItems > 0
                  ? `${totalItems.toLocaleString()} devices found${refreshing ? ' · updating…' : ''}`
                  : 'Browse and filter available inventory devices'}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
            <PPTExport
              getExportFilters={getInventoryFilters}
              recordCount={totalItems}
              disabled={!hasExportableRows || loading}
            />
            <ExportExcelButton
              fetchExport={exportExcel}
              label="Excel Export"
              disabled={!hasExportableRows || loading}
              aria-label="Export filtered device inventory as Excel"
            />
            <div className="relative w-full min-w-0 sm:w-auto">
              <SearchBar
                delay={300}
                placeholder="Search devices"
                onSearch={(query) => {
                  setSearchQuery(query);
                  resetToFirstPage();
                }}
              />
            </div>
          </div>
        </div>

        <Table
          data={data}
          loading={loading}
          columns={columns}
          compact
          keyExtractor={(item, idx) =>
            `${item.device_details_id || item.device_id || 'row'}-${idx}`
          }
        />

        <div className="px-3 py-3 md:px-6 md:py-4">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <DeviceDetailModal
        device={selectedDevice}
        loading={detailLoading}
        onClose={handleCloseDetails}
      />
    </div>
  );
};

export default DeviceInventory;
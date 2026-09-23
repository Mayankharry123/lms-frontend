/**
 * @file DeviceInventoryClone.tsx
 * @description Clone of Device Inventory with map-overlay filters.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { isAbortError, serializeRequestKey } from '../../utils/requestControl';
import { buildCloneInventoryFilters, clearCloneLocationFilter, cloneQueryHasLocationFocus } from '../../utils/buildCloneInventoryFilters';
import type { LocationFilterValues } from '../../types/inventory/location-filter.types';
import type { CloneInventoryQueryFilters } from '../../types/inventory/clone-inventory.types';
import { DEFAULT_APPLIED_LOCATION } from '../../constants/inventory/defaults';
import { buildDeviceTableColumns } from './deviceInventoryColumns.tsx';
import DeviceDetailModal from './DeviceDetailModal';
import DeviceInventoryMap from '../../components/inventory/DeviceInventoryMap';
import DeviceInventoryCloneFilterPanel, {
  DeviceInventoryCloneAppliedChips,
} from '../../components/inventory/DeviceInventoryCloneFilterPanel';

const ITEMS_PER_PAGE = 10;

const DeviceInventoryClone: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedLocation, setAppliedLocation] = useState(DEFAULT_APPLIED_LOCATION);
  const [externalFilterSyncKey, setExternalFilterSyncKey] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailAbortRef = useRef<AbortController | null>(null);

  const inventoryFilters = useMemo(
    () =>
      buildCloneInventoryFilters({
        searchQuery,
        location: appliedLocation,
      }),
    [searchQuery, appliedLocation]
  );

  const getInventoryFilters = useCallback(
    (): CloneInventoryQueryFilters => inventoryFilters,
    [inventoryFilters]
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

  const commitExternalFilters = useCallback(
    (next: LocationFilterValues) => {
      setAppliedLocation(next);
      setExternalFilterSyncKey((previous) => previous + 1);
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  const handleRemoveAppliedFilter = useCallback(
    (name: keyof LocationFilterValues) => {
      setAppliedLocation((previous) => {
        if (name === 'city') {
          // City removed → all states in the selected country (keep country + non-geo filters).
          return clearCloneLocationFilter(previous, 'city');
        }
        if (name === 'state') {
          // Drop state and its location dependents → remaining country (India) data.
          return clearCloneLocationFilter(previous, 'state');
        }
        return clearCloneLocationFilter(previous, name);
      });
      setExternalFilterSyncKey((previous) => previous + 1);
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  const columns = useMemo(
    () => buildDeviceTableColumns(handleViewDetails),
    [handleViewDetails]
  );

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden space-y-4">
      <MasterHeader
        onCreateClick={() => undefined}
        createButtonLabel="Add Device"
        showBreadcrumb
        showCreateButton={false}
        breadcrumbItems={[{ label: 'Device Inventory Clone', path: ROUTES.INVENTORY_DEVICE_CLONE }]}
        endContent={
          <DeviceInventoryCloneAppliedChips
            values={appliedLocation}
            onRemove={handleRemoveAppliedFilter}
            onReset={() => {
              commitExternalFilters(DEFAULT_APPLIED_LOCATION);
            }}
          />
        }
      />

      <div className="relative z-0">
        <DeviceInventoryMap
          markers={markers}
          loading={mapLoading}
          autoFit={cloneQueryHasLocationFocus(inventoryFilters)}
          fitToken={serializeRequestKey(inventoryFilters)}
          resetViewWhenIdle
          pointColor={mapPointColor}
          clampToIndia
          scrollWheelZoom={false}
          onMarkerSelect={handleMapMarkerSelect}
          leftOverlay={
            <DeviceInventoryCloneFilterPanel
              appliedValues={appliedLocation}
              externalSyncKey={externalFilterSyncKey}
              isOpen={filterOpen}
              onOpenChange={setFilterOpen}
              onApply={(values) => {
                setAppliedLocation(values);
                resetToFirstPage();
              }}
              onReset={() => {
                commitExternalFilters(DEFAULT_APPLIED_LOCATION);
              }}
            />
          }
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-3 md:flex-nowrap md:px-6 md:py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 md:text-base">Device Inventory Clone</h2>
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

export default DeviceInventoryClone;
  
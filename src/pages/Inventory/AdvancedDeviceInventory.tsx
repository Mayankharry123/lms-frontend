/**
 * @file AdvancedDeviceInventory.tsx
 * @description Device inventory clone with on-page advanced filters.
 */

import React, { useCallback, useMemo, useState } from 'react';
import Pagination from '../../components/ui/Pagination';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import FilterPopup from '../../components/ui/FilterPopup';
import ExportExcelButton from '../../components/ui/ExportExcelButton';
import MasterHeader from '../../components/ui/MasterHeader';
import PPTExport from '../../components/ui/PPTExport';
import { type DeviceData } from '../../services/DeviceInventory';
import { ROUTES } from '../../constants/routes';
import { useDeviceInventoryList } from '../../hooks/useDeviceInventoryList';
import { DEFAULT_APPLIED_LOCATION } from './deviceInventoryConfig.ts';
import { buildDeviceTableColumns } from './deviceInventoryColumns.tsx';
import DeviceDetailModal from './DeviceDetailModal';

const ITEMS_PER_PAGE = 10;

const AdvancedDeviceInventory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedLocation, setAppliedLocation] = useState(DEFAULT_APPLIED_LOCATION);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);

  const getInventoryFilters = useCallback(
    () => ({
      search: searchQuery.trim() || undefined,
      country: appliedLocation.country.trim() || undefined,
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

  const handleViewDetails = useCallback((item: DeviceData) => {
    setSelectedDevice(item);
  }, []);

  const columns = useMemo(
    () => buildDeviceTableColumns(handleViewDetails),
    [handleViewDetails]
  );

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterHeader
        onCreateClick={() => undefined}
        createButtonLabel="Add Device"
        showBreadcrumb
        showCreateButton={false}
        breadcrumbItems={[
          { label: 'Advanced Device Inventory', path: ROUTES.INVENTORY_DEVICE_ADVANCED },
        ]}
      />

      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        <FilterPopup
          variant="inline"
          isOpen
          onClose={() => undefined}
          appliedValues={appliedLocation}
          onApply={(values) => {
            setAppliedLocation(values);
            resetToFirstPage();
          }}
          onReset={() => {
            setAppliedLocation(DEFAULT_APPLIED_LOCATION);
            resetToFirstPage();
          }}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-3 md:flex-nowrap md:px-6 md:py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 md:text-base">Device Inventory</h2>
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

      <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </div>
  );
};

export default AdvancedDeviceInventory;

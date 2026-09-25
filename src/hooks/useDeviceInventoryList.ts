import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  exportDeviceInventoryExcelFile,
  exportDeviceInventoryPptFile,
  listDeviceInventory,
  type DeviceData,
  type DeviceInventoryFilterParams,
} from '../services/DeviceInventory';
import { isAbortError, serializeRequestKey } from '../utils/requestControl';

const DEFAULT_PAGE_SIZE = 10;
const FILTER_DEBOUNCE_MS = 300;

type UseDeviceInventoryListOptions = {
  pageSize?: number;
  getFilters: () => DeviceInventoryFilterParams;
};

export function useDeviceInventoryList({
  pageSize = DEFAULT_PAGE_SIZE,
  getFilters,
}: UseDeviceInventoryListOptions) {
  const [data, setData] = useState<DeviceData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const lastFilterKeyRef = useRef('');

  const totalPages = useMemo(() => {
    const pages = Math.ceil(totalItems / pageSize);
    return pages > 0 ? pages : 1;
  }, [totalItems, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const filters = getFilters();
    const filterKey = serializeRequestKey(filters);
    const filtersChanged = lastFilterKeyRef.current !== filterKey;
    lastFilterKeyRef.current = filterKey;

    const controller = new AbortController();
    const delay = hasLoadedRef.current && filtersChanged ? FILTER_DEBOUNCE_MS : 0;

    const load = async () => {
      const isInitialLoad = !hasLoadedRef.current;
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const res = await listDeviceInventory(
          {
            page: currentPage,
            per_page: pageSize,
            ...filters,
          },
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        setData(Array.isArray(res.data) ? res.data : []);
        setTotalItems(Number(res.total_records || 0));
        hasLoadedRef.current = true;
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        setData([]);
        setTotalItems(0);
        hasLoadedRef.current = true;
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const timer = window.setTimeout(() => {
      void load();
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentPage, getFilters, pageSize]);

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.min(totalPages, Math.max(1, page)));
    },
    [totalPages]
  );

  const exportExcel = useCallback(async () => {
    await exportDeviceInventoryExcelFile(getFilters());
  }, [getFilters]);

  const exportPpt = useCallback(async () => {
    await exportDeviceInventoryPptFile(getFilters());
  }, [getFilters]);

  return {
    data,
    currentPage,
    totalItems,
    totalPages,
    loading,
    refreshing,
    setCurrentPage: goToPage,
    resetToFirstPage,
    exportExcel,
    exportPpt,
    hasExportableRows: totalItems > 0,
  };
}

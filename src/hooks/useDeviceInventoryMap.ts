import { useEffect, useState } from 'react';
import {
  listDeviceInventoryMapMarkers,
  type DeviceInventoryFilterParams,
  type DeviceMapMarker,
} from '../services/DeviceInventory';
import { isAbortError } from '../utils/requestControl';

const FILTER_DEBOUNCE_MS = 300;

type UseDeviceInventoryMapOptions = {
  getFilters: () => DeviceInventoryFilterParams;
};

export function useDeviceInventoryMap({ getFilters }: UseDeviceInventoryMapOptions) {
  const [markers, setMarkers] = useState<DeviceMapMarker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const filters = getFilters();
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const nextMarkers = await listDeviceInventoryMapMarkers(filters, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setMarkers(nextMarkers);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        setMarkers([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      } 
    };

    const timer = window.setTimeout(() => {
      void load();
    }, FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [getFilters]);

  return { markers, loading };
}

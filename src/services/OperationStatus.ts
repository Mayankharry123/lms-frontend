import { apiClient } from '../utils/apiClient';
import { ENDPOINTS } from '../constants/endpoints';

export interface OperationStatusItem {
  id: number | string;
  name: string;
  status?: string | number;
}

interface OperationStatusResponse {
  data?: OperationStatusItem[];
}

/**
 * Active operation statuses for the Backup Plan status dropdown.
 * Endpoint: GET /api/v1/operation-statuses
 */
export const fetchOperationStatuses = async (): Promise<OperationStatusItem[]> => {
  const res = await apiClient.get<OperationStatusResponse>(ENDPOINTS.OPERATION_STATUSES.LIST);
  const payload = res.data;
  const rows = Array.isArray(payload) ? payload : payload?.data ?? [];

  return rows.filter((item) => {
    const name = String(item?.name ?? '').trim();
    if (!name) return false;
    const active = item?.status;
    return active === undefined || active === null || String(active) === '1';
  });
};

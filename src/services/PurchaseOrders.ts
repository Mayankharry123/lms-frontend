import { ENDPOINTS } from '../constants/endpoints';
import { apiClient } from '../utils/apiClient';

export type PurchaseOrderItemPayload = {
  order: string;
  hsn_sac: string;
  city: string;
  qty: number;
  rate: number;
  amount: number;
};

export type CreatePurchaseOrderPayload = {
  cost_sheet_id: string;
  publisher_id: string;
  items: PurchaseOrderItemPayload[];
};

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
  const res = await apiClient.post<unknown>(ENDPOINTS.PURCHASE_ORDERS.CREATE, payload);
  return res.data;
}

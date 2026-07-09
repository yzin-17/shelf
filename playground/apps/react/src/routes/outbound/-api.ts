import type {
  CreateOutboundOrderRequest,
  OutboundOrderRecord,
  WarehouseOption,
} from './-outbound-table';

export type AvailableWarehouseResponse = {
  skuId: string;
  warehouses: WarehouseOption[];
};

export type CreateOutboundOrderResponse = {
  orderId: string;
  orderNo: string;
  status: 'DRAFT' | 'SUBMITTED';
};

export type OutboundOrderListResponse = {
  pageNo: number;
  pageSize: number;
  total: number;
  records: OutboundOrderRecord[];
};

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSkuAvailableWarehouses(
  skuId: string,
): Promise<AvailableWarehouseResponse> {
  return requestJson<AvailableWarehouseResponse>(
    `/api/skus/${encodeURIComponent(skuId)}/available-warehouses`,
  );
}

export async function createOutboundOrder(
  payload: CreateOutboundOrderRequest,
): Promise<CreateOutboundOrderResponse> {
  return requestJson<CreateOutboundOrderResponse>('/api/outbound-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listOutboundOrders(): Promise<OutboundOrderListResponse> {
  return requestJson<OutboundOrderListResponse>('/api/outbound-orders?pageNo=1&pageSize=20');
}

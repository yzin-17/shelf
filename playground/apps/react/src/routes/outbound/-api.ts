import type {
  AvailableWarehouse,
  OutboundOrderResponse,
  OutboundSubmitPayload,
} from './-table-model';

export type SubmitOutboundResponse = {
  orderId: string;
  orderNo: string;
  status: 'SUBMITTED';
};

export async function fetchOutboundOrder(): Promise<OutboundOrderResponse> {
  return requestJson<OutboundOrderResponse>('/api/outbound-orders');
}

export async function fetchAvailableWarehouses(
  skuId: string,
  keyword?: string,
): Promise<{ skuId: string; warehouses: AvailableWarehouse[] }> {
  const url = new URL(`/api/skus/${encodeURIComponent(skuId)}/available-warehouses`, window.location.origin);
  if (keyword) {
    url.searchParams.set('keyword', keyword);
  }

  return requestJson<{ skuId: string; warehouses: AvailableWarehouse[] }>(url.pathname + url.search);
}

export async function submitOutboundOrder(
  payload: OutboundSubmitPayload,
): Promise<SubmitOutboundResponse> {
  return requestJson<SubmitOutboundResponse>('/api/outbound-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

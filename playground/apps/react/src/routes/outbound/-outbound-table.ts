export type OutboundAction = 'SAVE_DRAFT' | 'SUBMIT';

export type WarehouseOption = {
  warehouseId: string;
  warehouseName: string;
  availableQty: number;
};

export type OutboundDraftRow = {
  id: string;
  orderId?: string;
  skuId: string;
  waybillNo: string;
  warehouseId: string;
  outboundQty: number;
};

export type OutboundAllocationRequest = {
  warehouseId: string;
  outboundQty: number;
};

export type OutboundWaybillRequest = {
  waybillNo: string;
  allocations: OutboundAllocationRequest[];
};

export type OutboundOrderItemRequest = {
  skuId: string;
  waybills: OutboundWaybillRequest[];
};

export type CreateOutboundOrderRequest = {
  action: OutboundAction;
  remark?: string;
  items: OutboundOrderItemRequest[];
};

export type OutboundOrderRecord = {
  orderId: string;
  orderNo: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CANCELLED' | 'SHIPPED';
  skuCount: number;
  waybillCount: number;
  totalOutboundQty: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: OutboundOrderItemRequest[];
};

export type RowValidationResult = {
  valid: boolean;
  rowErrors: Record<string, string[]>;
};

export type RowSpanInfo = {
  sku: number;
  waybill: number;
};

function appendError(rowErrors: Record<string, string[]>, rowId: string, message: string) {
  rowErrors[rowId] = [...(rowErrors[rowId] ?? []), message];
}

export function validateOutboundRows(
  rows: OutboundDraftRow[],
  warehousesBySku: Record<string, WarehouseOption[]>,
): RowValidationResult {
  const rowErrors: Record<string, string[]> = {};
  const seenDetails = new Map<string, string>();

  for (const row of rows) {
    const skuId = row.skuId.trim();
    const waybillNo = row.waybillNo.trim();
    const warehouseId = row.warehouseId.trim();

    if (!skuId) appendError(rowErrors, row.id, 'SKU ID is required');
    if (!waybillNo) appendError(rowErrors, row.id, 'Waybill number is required');
    if (!warehouseId) appendError(rowErrors, row.id, 'Warehouse is required');
    if (!Number.isFinite(row.outboundQty) || row.outboundQty <= 0) {
      appendError(rowErrors, row.id, 'Outbound quantity must be greater than 0');
    }

    if (skuId && waybillNo && warehouseId) {
      const detailKey = `${skuId}::${waybillNo}::${warehouseId}`;
      if (seenDetails.has(detailKey)) {
        appendError(rowErrors, row.id, 'Duplicate sku, waybill and warehouse detail');
      } else {
        seenDetails.set(detailKey, row.id);
      }
    }

    const warehouse = warehousesBySku[skuId]?.find((option) => option.warehouseId === warehouseId);
    if (warehouse && row.outboundQty > warehouse.availableQty) {
      appendError(
        rowErrors,
        row.id,
        `Outbound quantity exceeds available quantity ${warehouse.availableQty}`,
      );
    }
  }

  return {
    valid: Object.keys(rowErrors).length === 0,
    rowErrors,
  };
}

export function countRowSpans(rows: OutboundDraftRow[]): Record<string, RowSpanInfo> {
  const spans: Record<string, RowSpanInfo> = {};

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const previousRow = rows[index - 1];
    const skuId = row.skuId.trim();
    const waybillNo = row.waybillNo.trim();

    const isFirstSkuRow = !previousRow || previousRow.skuId.trim() !== skuId;
    const isFirstWaybillRow =
      !previousRow ||
      previousRow.skuId.trim() !== skuId ||
      previousRow.waybillNo.trim() !== waybillNo;

    spans[row.id] = {
      sku: isFirstSkuRow
        ? rows.slice(index).findIndex((candidate) => candidate.skuId.trim() !== skuId)
        : 0,
      waybill: isFirstWaybillRow
        ? rows
            .slice(index)
            .findIndex(
              (candidate) =>
                candidate.skuId.trim() !== skuId || candidate.waybillNo.trim() !== waybillNo,
            )
        : 0,
    };

    if (spans[row.id].sku === -1) spans[row.id].sku = rows.length - index;
    if (spans[row.id].waybill === -1) spans[row.id].waybill = rows.length - index;
  }

  return spans;
}

export function flattenOutboundOrderRecords(records: OutboundOrderRecord[]): OutboundDraftRow[] {
  return records.flatMap((record) =>
    (record.items ?? []).flatMap((item) =>
      item.waybills.flatMap((waybill) =>
        waybill.allocations.map((allocation, allocationIndex) => ({
          id: `${record.orderId}-${item.skuId}-${waybill.waybillNo}-${allocation.warehouseId}-${allocationIndex}`,
          orderId: record.orderId,
          skuId: item.skuId,
          waybillNo: waybill.waybillNo,
          warehouseId: allocation.warehouseId,
          outboundQty: allocation.outboundQty,
        })),
      ),
    ),
  );
}

export function buildCreateOutboundOrderRequest(
  rows: OutboundDraftRow[],
  action: OutboundAction,
  remark?: string,
): CreateOutboundOrderRequest {
  const items: OutboundOrderItemRequest[] = [];

  for (const row of rows) {
    const skuId = row.skuId.trim();
    const waybillNo = row.waybillNo.trim();
    const warehouseId = row.warehouseId.trim();
    if (!skuId || !waybillNo || !warehouseId) continue;

    let item = items.find((candidate) => candidate.skuId === skuId);
    if (!item) {
      item = { skuId, waybills: [] };
      items.push(item);
    }

    let waybill = item.waybills.find((candidate) => candidate.waybillNo === waybillNo);
    if (!waybill) {
      waybill = { waybillNo, allocations: [] };
      item.waybills.push(waybill);
    }

    waybill.allocations.push({
      warehouseId,
      outboundQty: row.outboundQty,
    });
  }

  return {
    action,
    ...(remark?.trim() ? { remark: remark.trim() } : {}),
    items,
  };
}

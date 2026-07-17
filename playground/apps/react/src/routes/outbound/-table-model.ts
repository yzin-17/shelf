export type AvailableWarehouse = {
  warehouseId: string;
  warehouseName: string;
  availableQty: number;
};

export type OutboundAllocation = {
  warehouseId: string;
  outboundQty: number;
};

export type OutboundWaybill = {
  waybillNo: string;
  allocations: OutboundAllocation[];
};

export type OutboundItem = {
  skuId: string;
  waybills: OutboundWaybill[];
};

export type OutboundOrderResponse = {
  orderId: string;
  orderNo: string;
  status: 'DRAFT' | 'SUBMITTED';
  items: OutboundItem[];
};

export type OutboundSubmitPayload = {
  action: 'SUBMIT';
  items: OutboundItem[];
};

export type OutboundEditableRow = {
  id: string;
  skuId: string;
  waybillNo: string;
  warehouseId?: string;
  outboundQty?: number;
};

export type OutboundDisplayRow = OutboundEditableRow & {
  skuRowSpan: number;
  waybillRowSpan: number;
};

export type RowValidation = {
  skuId?: string;
  waybillNo?: string;
  warehouseId?: string;
  outboundQty?: string;
};

export type TableValidationResult = {
  rowErrors: Record<string, RowValidation>;
  isValid: boolean;
};

export type TableStats = {
  skuCount: number;
  waybillCount: number;
  totalOutboundQty: number;
};

export function flattenOutboundOrder(order: OutboundOrderResponse): OutboundEditableRow[] {
  const rows: OutboundEditableRow[] = [];

  order.items.forEach((item, itemIndex) => {
    item.waybills.forEach((waybill, waybillIndex) => {
      waybill.allocations.forEach((allocation, allocationIndex) => {
        rows.push({
          id: buildRowId(item.skuId, waybill.waybillNo, allocation.warehouseId, allocationIndex),
          skuId: item.skuId,
          waybillNo: waybill.waybillNo,
          warehouseId: allocation.warehouseId,
          outboundQty: allocation.outboundQty,
        });
      });

      if (waybill.allocations.length === 0) {
        rows.push({
          id: buildRowId(item.skuId, waybill.waybillNo, `empty-${itemIndex}-${waybillIndex}`, 0),
          skuId: item.skuId,
          waybillNo: waybill.waybillNo,
        });
      }
    });
  });

  return rows;
}

export function computeDisplayRows(rows: OutboundEditableRow[]): OutboundDisplayRow[] {
  return rows.map((row, index) => ({
    ...row,
    skuRowSpan: isFirstSkuRow(rows, index) ? countContiguous(rows, index, (candidate) => candidate.skuId === row.skuId) : 0,
    waybillRowSpan: isFirstWaybillRow(rows, index)
      ? countContiguous(
          rows,
          index,
          (candidate) => candidate.skuId === row.skuId && candidate.waybillNo === row.waybillNo,
        )
      : 0,
  }));
}

export function computeStats(rows: OutboundEditableRow[]): TableStats {
  const skuIds = new Set(rows.map((row) => row.skuId));
  const waybillKeys = new Set(rows.map((row) => `${row.skuId}::${row.waybillNo}`));
  const totalOutboundQty = rows.reduce((sum, row) => sum + (row.outboundQty ?? 0), 0);

  return {
    skuCount: skuIds.size,
    waybillCount: waybillKeys.size,
    totalOutboundQty,
  };
}

export function buildSubmitPayload(rows: OutboundEditableRow[]): OutboundSubmitPayload {
  const items: OutboundItem[] = [];

  rows.forEach((row) => {
    let item = items.find((candidate) => candidate.skuId === row.skuId);
    if (!item) {
      item = { skuId: row.skuId, waybills: [] };
      items.push(item);
    }

    let waybill = item.waybills.find((candidate) => candidate.waybillNo === row.waybillNo);
    if (!waybill) {
      waybill = { waybillNo: row.waybillNo, allocations: [] };
      item.waybills.push(waybill);
    }

    waybill.allocations.push({
      warehouseId: row.warehouseId ?? '',
      outboundQty: row.outboundQty ?? 0,
    });
  });

  return {
    action: 'SUBMIT',
    items,
  };
}

export function validateRows(
  rows: OutboundEditableRow[],
  warehouseOptionsBySku: Record<string, AvailableWarehouse[]>,
): TableValidationResult {
  const rowErrors: Record<string, RowValidation> = {};
  const duplicateCounter = new Map<string, number>();

  rows.forEach((row) => {
    if (row.skuId && row.waybillNo && row.warehouseId) {
      const duplicateKey = `${row.skuId}::${row.waybillNo}::${row.warehouseId}`;
      duplicateCounter.set(duplicateKey, (duplicateCounter.get(duplicateKey) ?? 0) + 1);
    }
  });

  rows.forEach((row) => {
    const errors: RowValidation = {};

    if (!row.skuId.trim()) {
      errors.skuId = 'SKU ID is required';
    }

    if (!row.waybillNo.trim()) {
      errors.waybillNo = 'Waybill number is required';
    }

    if (!row.warehouseId) {
      errors.warehouseId = 'Warehouse is required';
    }

    if (row.outboundQty == null) {
      errors.outboundQty = 'Outbound quantity is required';
    } else if (row.outboundQty <= 0) {
      errors.outboundQty = 'Outbound quantity must be greater than 0';
    }

    if (row.warehouseId) {
      const duplicateKey = `${row.skuId}::${row.waybillNo}::${row.warehouseId}`;
      if ((duplicateCounter.get(duplicateKey) ?? 0) > 1) {
        errors.warehouseId = 'Warehouse already exists for this SKU and waybill';
      }

      const warehouse = warehouseOptionsBySku[row.skuId]?.find(
        (candidate) => candidate.warehouseId === row.warehouseId,
      );
      if (warehouse && row.outboundQty != null && row.outboundQty > warehouse.availableQty) {
        errors.outboundQty = `Outbound quantity cannot exceed available quantity (${warehouse.availableQty})`;
      }
    }

    if (Object.keys(errors).length > 0) {
      rowErrors[row.id] = errors;
    }
  });

  return {
    rowErrors,
    isValid: Object.keys(rowErrors).length === 0,
  };
}

export function canDeleteWaybillRow(rows: OutboundEditableRow[], rowId: string): boolean {
  const row = rows.find((candidate) => candidate.id === rowId);
  if (!row) {
    return false;
  }

  const groupSize = rows.filter(
    (candidate) => candidate.skuId === row.skuId && candidate.waybillNo === row.waybillNo,
  ).length;

  return groupSize > 1;
}

function buildRowId(skuId: string, waybillNo: string, warehouseId: string, index: number): string {
  return `${skuId}::${waybillNo}::${warehouseId}::${index}`;
}

function isFirstSkuRow(rows: OutboundEditableRow[], index: number): boolean {
  return index === 0 || rows[index - 1]?.skuId !== rows[index]?.skuId;
}

function isFirstWaybillRow(rows: OutboundEditableRow[], index: number): boolean {
  return (
    index === 0 ||
    rows[index - 1]?.skuId !== rows[index]?.skuId ||
    rows[index - 1]?.waybillNo !== rows[index]?.waybillNo
  );
}

function countContiguous(
  rows: OutboundEditableRow[],
  startIndex: number,
  predicate: (row: OutboundEditableRow) => boolean,
): number {
  let count = 0;
  for (let index = startIndex; index < rows.length; index += 1) {
    if (!predicate(rows[index])) {
      break;
    }
    count += 1;
  }
  return count;
}

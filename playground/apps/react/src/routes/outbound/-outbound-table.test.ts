import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSubmitPayload,
  canDeleteWaybillRow,
  computeDisplayRows,
  computeStats,
  flattenOutboundOrder,
  validateRows,
  type OutboundOrderResponse,
} from './-table-model.ts';

const sampleOrder: OutboundOrderResponse = {
  orderId: '90001',
  orderNo: 'OUT202607140001',
  status: 'DRAFT',
  items: [
    {
      skuId: 'SKU001',
      waybills: [
        {
          waybillNo: 'WB001',
          allocations: [
            { warehouseId: 'WH001', outboundQty: 10 },
            { warehouseId: 'WH002', outboundQty: 5 },
          ],
        },
        {
          waybillNo: 'WB002',
          allocations: [{ warehouseId: 'WH003', outboundQty: 8 }],
        },
      ],
    },
    {
      skuId: 'SKU002',
      waybills: [
        {
          waybillNo: 'WB003',
          allocations: [{ warehouseId: 'WH004', outboundQty: 3 }],
        },
      ],
    },
  ],
};

test('flattenOutboundOrder creates one row per allocation', () => {
  const rows = flattenOutboundOrder(sampleOrder);

  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], {
    id: 'SKU001::WB001::WH001::0',
    skuId: 'SKU001',
    waybillNo: 'WB001',
    warehouseId: 'WH001',
    outboundQty: 10,
  });
});

test('computeDisplayRows calculates rowSpan for sku and waybill groups', () => {
  const rows = flattenOutboundOrder(sampleOrder);
  const displayRows = computeDisplayRows(rows);

  assert.equal(displayRows[0].skuRowSpan, 3);
  assert.equal(displayRows[0].waybillRowSpan, 2);
  assert.equal(displayRows[1].skuRowSpan, 0);
  assert.equal(displayRows[1].waybillRowSpan, 0);
  assert.equal(displayRows[2].skuRowSpan, 0);
  assert.equal(displayRows[2].waybillRowSpan, 1);
  assert.equal(displayRows[3].skuRowSpan, 1);
});

test('computeStats counts unique skus, waybills, and total quantity', () => {
  const stats = computeStats(flattenOutboundOrder(sampleOrder));

  assert.deepEqual(stats, {
    skuCount: 2,
    waybillCount: 3,
    totalOutboundQty: 26,
  });
});

test('validateRows rejects duplicate warehouse in same sku and waybill', () => {
  const rows = [
    {
      id: '1',
      skuId: 'SKU001',
      waybillNo: 'WB001',
      warehouseId: 'WH001',
      outboundQty: 10,
    },
    {
      id: '2',
      skuId: 'SKU001',
      waybillNo: 'WB001',
      warehouseId: 'WH001',
      outboundQty: 4,
    },
  ];

  const validation = validateRows(rows, {
    SKU001: [{ warehouseId: 'WH001', warehouseName: 'Shanghai', availableQty: 20 }],
  });

  assert.equal(validation.isValid, false);
  assert.equal(validation.rowErrors['1']?.warehouseId, 'Warehouse already exists for this SKU and waybill');
  assert.equal(validation.rowErrors['2']?.warehouseId, 'Warehouse already exists for this SKU and waybill');
});

test('validateRows rejects quantity above available stock', () => {
  const validation = validateRows(
    [
      {
        id: '1',
        skuId: 'SKU001',
        waybillNo: 'WB001',
        warehouseId: 'WH001',
        outboundQty: 21,
      },
    ],
    {
      SKU001: [{ warehouseId: 'WH001', warehouseName: 'Shanghai', availableQty: 20 }],
    },
  );

  assert.equal(validation.isValid, false);
  assert.equal(
    validation.rowErrors['1']?.outboundQty,
    'Outbound quantity cannot exceed available quantity (20)',
  );
});

test('buildSubmitPayload groups rows by sku and waybill', () => {
  const payload = buildSubmitPayload(flattenOutboundOrder(sampleOrder));

  assert.deepEqual(payload, {
    action: 'SUBMIT',
    items: [
      {
        skuId: 'SKU001',
        waybills: [
          {
            waybillNo: 'WB001',
            allocations: [
              { warehouseId: 'WH001', outboundQty: 10 },
              { warehouseId: 'WH002', outboundQty: 5 },
            ],
          },
          {
            waybillNo: 'WB002',
            allocations: [{ warehouseId: 'WH003', outboundQty: 8 }],
          },
        ],
      },
      {
        skuId: 'SKU002',
        waybills: [
          {
            waybillNo: 'WB003',
            allocations: [{ warehouseId: 'WH004', outboundQty: 3 }],
          },
        ],
      },
    ],
  });
});

test('canDeleteWaybillRow prevents deleting the last warehouse row under a waybill', () => {
  const rows = flattenOutboundOrder(sampleOrder);

  assert.equal(canDeleteWaybillRow(rows, rows[0].id), true);
  assert.equal(canDeleteWaybillRow(rows, rows[2].id), false);
});

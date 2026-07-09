import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCreateOutboundOrderRequest,
  countRowSpans,
  flattenOutboundOrderRecords,
  validateOutboundRows,
  type OutboundOrderRecord,
  type OutboundDraftRow,
  type WarehouseOption,
} from './-outbound-table.ts';

const rows: OutboundDraftRow[] = [
  {
    id: 'row-1',
    skuId: 'SKU001',
    waybillNo: 'SF123456',
    warehouseId: 'WH001',
    outboundQty: 6,
  },
  {
    id: 'row-2',
    skuId: 'SKU001',
    waybillNo: 'SF123456',
    warehouseId: 'WH002',
    outboundQty: 4,
  },
  {
    id: 'row-3',
    skuId: 'SKU001',
    waybillNo: 'SF789000',
    warehouseId: 'WH001',
    outboundQty: 7,
  },
];

const warehousesBySku: Record<string, WarehouseOption[]> = {
  SKU001: [
    { warehouseId: 'WH001', warehouseName: 'Shanghai Warehouse', availableQty: 12 },
    { warehouseId: 'WH002', warehouseName: 'Guangzhou Warehouse', availableQty: 8 },
  ],
};

test('buildCreateOutboundOrderRequest groups rows by sku and waybill', () => {
  assert.deepEqual(buildCreateOutboundOrderRequest(rows, 'SUBMIT'), {
    action: 'SUBMIT',
    items: [
      {
        skuId: 'SKU001',
        waybills: [
          {
            waybillNo: 'SF123456',
            allocations: [
              { warehouseId: 'WH001', outboundQty: 6 },
              { warehouseId: 'WH002', outboundQty: 4 },
            ],
          },
          {
            waybillNo: 'SF789000',
            allocations: [{ warehouseId: 'WH001', outboundQty: 7 }],
          },
        ],
      },
    ],
  });
});

test('validateOutboundRows rejects row quantity over available quantity', () => {
  const result = validateOutboundRows(
    [
      {
        ...rows[0],
        outboundQty: 13,
      },
    ],
    warehousesBySku,
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.rowErrors['row-1'], ['Outbound quantity exceeds available quantity 12']);
});

test('validateOutboundRows rejects duplicated details', () => {
  const duplicatedRows = [
    rows[0],
    {
      ...rows[0],
      id: 'row-duplicate',
    },
  ];

  const duplicateResult = validateOutboundRows(duplicatedRows, warehousesBySku);
  assert.deepEqual(duplicateResult.rowErrors['row-duplicate'], [
    'Duplicate sku, waybill and warehouse detail',
  ]);
});

test('validateOutboundRows allows totals across waybills to exceed inventory before save', () => {
  const result = validateOutboundRows(
    [
      {
        ...rows[0],
        outboundQty: 8,
      },
      {
        ...rows[2],
        outboundQty: 8,
      },
    ],
    warehousesBySku,
  );

  assert.equal(result.valid, true);
});

test('countRowSpans returns merged row spans for sku and waybill columns', () => {
  const spans = countRowSpans([
    ...rows,
    {
      id: 'row-4',
      skuId: 'SKU002',
      waybillNo: 'YT00001',
      warehouseId: 'WH010',
      outboundQty: 1,
    },
  ]);

  assert.deepEqual(spans, {
    'row-1': { sku: 3, waybill: 2 },
    'row-2': { sku: 0, waybill: 0 },
    'row-3': { sku: 0, waybill: 1 },
    'row-4': { sku: 1, waybill: 1 },
  });
});

test('flattenOutboundOrderRecords expands list response items into rows', () => {
  const records: OutboundOrderRecord[] = [
    {
      orderId: '90001',
      orderNo: 'OUT202607090001',
      status: 'DRAFT',
      skuCount: 1,
      waybillCount: 2,
      totalOutboundQty: 10,
      createdAt: '2026-07-09 10:30:00',
      updatedAt: '2026-07-09 10:35:00',
      items: [
        {
          skuId: 'SKU001',
          waybills: [
            {
              waybillNo: 'SF123456',
              allocations: [
                { warehouseId: 'WH001', outboundQty: 6 },
                { warehouseId: 'WH002', outboundQty: 4 },
              ],
            },
          ],
        },
      ],
    },
  ];

  assert.deepEqual(flattenOutboundOrderRecords(records), [
    {
      id: '90001-SKU001-SF123456-WH001-0',
      orderId: '90001',
      skuId: 'SKU001',
      waybillNo: 'SF123456',
      warehouseId: 'WH001',
      outboundQty: 6,
    },
    {
      id: '90001-SKU001-SF123456-WH002-1',
      orderId: '90001',
      skuId: 'SKU001',
      waybillNo: 'SF123456',
      warehouseId: 'WH002',
      outboundQty: 4,
    },
  ]);
});

test('flattenOutboundOrderRecords does not create default rows for an empty list', () => {
  assert.deepEqual(flattenOutboundOrderRecords([]), []);
});

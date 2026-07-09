# 前端关注的出库接口设计

## Summary

前端暂时只需要关心 3 类接口：

- 查询某个 SKU 可用仓库，用于仓库下拉框
- 创建草稿或提交出库单，用于保存 table 数据
- 获取出库单列表，用于列表页展示和查询

前端提交时建议使用结构化数据，不要按表格合并单元格传值。每个最小明细是：

```text
skuId + waybillNo + warehouseId + outboundQty
```

## 1. 查询 SKU 可用仓库

```http
GET /api/skus/{skuId}/available-warehouses
```

查询参数：

```ts
type Query = {
  keyword?: string; // 可选，搜索仓库 id / 仓库名称
};
```

响应：

```ts
type AvailableWarehouseResponse = {
  skuId: string;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    availableQty: number;
  }[];
};
```

示例：

```json
{
  "skuId": "SKU001",
  "warehouses": [
    {
      "warehouseId": "WH001",
      "warehouseName": "上海仓",
      "availableQty": 120
    },
    {
      "warehouseId": "WH002",
      "warehouseName": "广州仓",
      "availableQty": 80
    }
  ]
}
```

前端交互建议：

- 用户选择或输入 `skuId` 后再请求仓库列表。
- 仓库下拉框展示 `warehouseName`，提交 `warehouseId`。
- 出库数量输入框最大值用 `availableQty` 限制。
- 如果同一个 SKU 下多行选择了同一个仓库，前端应提示剩余可用数量，避免多行加总超出库存。

## 2. 创建或提交出库单

```http
POST /api/outbound-orders
```

请求：

```ts
type CreateOutboundOrderRequest = {
  action: 'SAVE_DRAFT' | 'SUBMIT';
  remark?: string;
  items: {
    skuId: string;
    waybills: {
      waybillNo: string;
      allocations: {
        warehouseId: string;
        outboundQty: number;
      }[];
    }[];
  }[];
};
```

示例：

```json
{
  "action": "SUBMIT",
  "remark": "本次出库备注",
  "items": [
    {
      "skuId": "SKU001",
      "waybills": [
        {
          "waybillNo": "SF123456",
          "allocations": [
            {
              "warehouseId": "WH001",
              "outboundQty": 10
            },
            {
              "warehouseId": "WH002",
              "outboundQty": 5
            }
          ]
        }
      ]
    }
  ]
}
```

响应：

```ts
type CreateOutboundOrderResponse = {
  orderId: string;
  orderNo: string;
  status: 'DRAFT' | 'SUBMITTED';
};
```

示例：

```json
{
  "orderId": "90001",
  "orderNo": "OUT202607090001",
  "status": "SUBMITTED"
}
```

前端校验建议：

- `skuId` 必填。
- `waybillNo` 必填。
- `warehouseId` 必填。
- `outboundQty` 必填，且必须大于 0。
- 同一个 `skuId + waybillNo + warehouseId` 不允许重复。
- 同一个 `skuId + warehouseId` 在多行中的出库数量总和，不应超过该仓库可用数量。

## 3. 获取出库单列表

```http
GET /api/outbound-orders
```

查询参数：

```ts
type OutboundOrderListQuery = {
  pageNo: number;
  pageSize: number;
  orderNo?: string;
  skuId?: string;
  waybillNo?: string;
  warehouseId?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'CANCELLED' | 'SHIPPED';
  createdStartTime?: string;
  createdEndTime?: string;
};
```

响应：

```ts
type OutboundOrderListResponse = {
  pageNo: number;
  pageSize: number;
  total: number;
  records: {
    orderId: string;
    orderNo: string;
    status: 'DRAFT' | 'SUBMITTED' | 'CANCELLED' | 'SHIPPED';
    skuCount: number;
    waybillCount: number;
    totalOutboundQty: number;
    createdByName?: string;
    createdAt: string;
    updatedAt: string;
  }[];
};
```

示例：

```json
{
  "pageNo": 1,
  "pageSize": 20,
  "total": 1,
  "records": [
    {
      "orderId": "90001",
      "orderNo": "OUT202607090001",
      "status": "SUBMITTED",
      "skuCount": 2,
      "waybillCount": 3,
      "totalOutboundQty": 35,
      "createdByName": "张三",
      "createdAt": "2026-07-09 10:30:00",
      "updatedAt": "2026-07-09 10:35:00"
    }
  ]
}
```

## Assumptions

- 前端只负责接口字段、页面校验和数据结构，不关心后端表设计。
- 创建接口同时支持保存草稿和提交，通过 `action` 区分。
- 列表页展示出库单维度，不直接展开 SKU / 运单 / 仓库明细。
- 如果列表页需要点进详情，后续再补一个 `GET /api/outbound-orders/{orderId}` 详情接口。

import { createFileRoute } from '@tanstack/react-router';
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { Plus, Save, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { createOutboundOrder, fetchSkuAvailableWarehouses, listOutboundOrders } from './-api';
import {
  buildCreateOutboundOrderRequest,
  countRowSpans,
  flattenOutboundOrderRecords,
  validateOutboundRows,
  type OutboundAction,
  type OutboundDraftRow,
  type WarehouseOption,
} from './-outbound-table';

export const Route = createFileRoute('/outbound/')({
  component: OutboundPage,
});

const emptyWarehouseRow = (skuId: string, waybillNo: string): OutboundDraftRow => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  skuId,
  waybillNo,
  warehouseId: '',
  outboundQty: 1,
});

function OutboundPage() {
  const [rows, setRows] = useState<OutboundDraftRow[]>([]);
  const [remark, setRemark] = useState('');
  const [warehousesBySku, setWarehousesBySku] = useState<Record<string, WarehouseOption[]>>({});
  const [loadingSkus, setLoadingSkus] = useState<string[]>([]);
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submittingRowId, setSubmittingRowId] = useState<string | null>(null);

  const skuIds = useMemo(
    () => Array.from(new Set(rows.map((row) => row.skuId.trim()).filter(Boolean))),
    [rows],
  );

  useEffect(() => {
    setListLoading(true);
    void listOutboundOrders()
      .then((response) => {
        setRows(flattenOutboundOrderRecords(response.records));
        setListError('');
      })
      .catch((error: unknown) => {
        setRows([]);
        setListError(error instanceof Error ? error.message : 'Failed to load outbound list');
      })
      .finally(() => {
        setListLoading(false);
      });
  }, []);

  useEffect(() => {
    for (const skuId of skuIds) {
      if (warehousesBySku[skuId] || loadingSkus.includes(skuId)) continue;

      setLoadingSkus((current) => [...current, skuId]);
      void fetchSkuAvailableWarehouses(skuId)
        .then((response) => {
          setWarehousesBySku((current) => ({
            ...current,
            [skuId]: response.warehouses,
          }));
          setLoadErrors((current) => {
            const next = { ...current };
            delete next[skuId];
            return next;
          });
        })
        .catch((error: unknown) => {
          setLoadErrors((current) => ({
            ...current,
            [skuId]: error instanceof Error ? error.message : 'Failed to load warehouses',
          }));
        })
        .finally(() => {
          setLoadingSkus((current) => current.filter((candidate) => candidate !== skuId));
        });
    }
  }, [loadingSkus, skuIds, warehousesBySku]);

  const validation = useMemo(
    () => validateOutboundRows(rows, warehousesBySku),
    [rows, warehousesBySku],
  );
  const rowSpans = useMemo(() => countRowSpans(rows), [rows]);

  const totalQty = rows.reduce(
    (sum, row) => sum + (Number.isFinite(row.outboundQty) ? row.outboundQty : 0),
    0,
  );
  const uniqueSkuCount = skuIds.length;
  const uniqueWaybillCount = new Set(rows.map((row) => row.waybillNo.trim()).filter(Boolean)).size;

  function updateRow(rowId: string, patch: Partial<Omit<OutboundDraftRow, 'skuId'>>) {
    setSubmitMessage('');
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          ...patch,
        };
      }),
    );
  }

  function addWarehouseRow(after: OutboundDraftRow) {
    setSubmitMessage('');
    setRows((current) => {
      const lastWaybillIndex = current.findLastIndex(
        (row) => row.skuId === after.skuId && row.waybillNo === after.waybillNo,
      );
      const next = [...current];
      next.splice(lastWaybillIndex + 1, 0, emptyWarehouseRow(after.skuId, after.waybillNo));
      return next;
    });
  }

  function removeWarehouseRow(rowId: string) {
    setSubmitMessage('');
    setRows((current) => {
      const row = current.find((candidate) => candidate.id === rowId);
      if (!row) return current;

      const waybillRows = current.filter(
        (candidate) => candidate.skuId === row.skuId && candidate.waybillNo === row.waybillNo,
      );
      if (waybillRows.length <= 1) return current;
      return current.filter((candidate) => candidate.id !== rowId);
    });
  }

  async function submitRow(row: OutboundDraftRow, action: OutboundAction) {
    const nextValidation = validateOutboundRows([row], warehousesBySku);
    if (!nextValidation.valid) {
      setSubmitMessage('Please fix this row before submitting.');
      return;
    }

    setSubmittingRowId(row.id);
    setSubmitMessage('');
    try {
      const payload = buildCreateOutboundOrderRequest([row], action, remark);
      const response = await createOutboundOrder(payload);
      setSubmitMessage(`${response.orderNo} ${response.status === 'DRAFT' ? 'saved' : 'submitted'}.`);
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Submit failed');
    } finally {
      setSubmittingRowId(null);
    }
  }

  const columns: TableColumnsType<OutboundDraftRow> = [
    {
      title: '序号',
      width: 72,
      render: (_value, _row, index) => index + 1,
    },
    {
      title: 'skuid',
      dataIndex: 'skuId',
      width: 160,
      onCell: (row) => ({ rowSpan: rowSpans[row.id]?.sku ?? 1 }),
      render: (skuId: string) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{skuId}</Typography.Text>
          {loadErrors[skuId] ? <Typography.Text type="danger">{loadErrors[skuId]}</Typography.Text> : null}
        </Space>
      ),
    },
    {
      title: '运单号',
      dataIndex: 'waybillNo',
      width: 220,
      onCell: (row) => ({ rowSpan: rowSpans[row.id]?.waybill ?? 1 }),
      render: (_value, row) => (
        <Input
          value={row.waybillNo}
          placeholder="请输入运单号"
          onChange={(event) => updateRow(row.id, { waybillNo: event.target.value })}
        />
      ),
    },
    {
      title: '仓库 id',
      dataIndex: 'warehouseId',
      width: 280,
      render: (_value, row) => {
        const skuId = row.skuId.trim();
        const warehouses = warehousesBySku[skuId] ?? [];
        const selectedWarehouse = warehouses.find((warehouse) => warehouse.warehouseId === row.warehouseId);

        return (
          <Space direction="vertical" size={4} className="w-full">
            <Space.Compact className="w-full">
              <Select
                value={row.warehouseId || undefined}
                placeholder={loadingSkus.includes(skuId) ? '加载中...' : '请选择仓库'}
                loading={loadingSkus.includes(skuId)}
                disabled={!skuId || loadingSkus.includes(skuId)}
                onChange={(warehouseId) => updateRow(row.id, { warehouseId })}
                options={warehouses.map((warehouse) => ({
                  label: `${warehouse.warehouseId} - ${warehouse.warehouseName}`,
                  value: warehouse.warehouseId,
                }))}
                className="w-full"
              />
              <Button icon={<Plus className="size-4" />} onClick={() => addWarehouseRow(row)}>
                仓库
              </Button>
            </Space.Compact>
            {selectedWarehouse ? (
              <Typography.Text type="secondary">可用数量：{selectedWarehouse.availableQty}</Typography.Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: '出库数量',
      dataIndex: 'outboundQty',
      width: 180,
      render: (_value, row) => {
        const selectedWarehouse = warehousesBySku[row.skuId.trim()]?.find(
          (warehouse) => warehouse.warehouseId === row.warehouseId,
        );

        return (
          <InputNumber
            min={1}
            max={selectedWarehouse?.availableQty}
            precision={0}
            value={row.outboundQty}
            onChange={(value) => updateRow(row.id, { outboundQty: value ?? 0 })}
            className="w-full"
          />
        );
      },
    },
    {
      title: '状态',
      width: 220,
      render: (_value, row) => {
        const rowErrors = validation.rowErrors[row.id] ?? [];
        if (!rowErrors.length) return <Tag color="success">Ready</Tag>;

        return (
          <Space direction="vertical" size={2}>
            {rowErrors.map((error) => (
              <Tag key={error} color="error">
                {error}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '操作',
      width: 240,
      render: (_value, row) => {
        const waybillRowCount = rows.filter(
          (candidate) => candidate.skuId === row.skuId && candidate.waybillNo === row.waybillNo,
        ).length;

        return (
          <Space>
            <Button
              icon={<Save className="size-4" />}
              loading={submittingRowId === row.id}
              onClick={() => void submitRow(row, 'SAVE_DRAFT')}
            >
              保存
            </Button>
            <Button
              type="primary"
              icon={<Send className="size-4" />}
              loading={submittingRowId === row.id}
              onClick={() => void submitRow(row, 'SUBMIT')}
            >
              提交
            </Button>
            <Button
              danger
              icon={<Trash2 className="size-4" />}
              disabled={waybillRowCount <= 1}
              onClick={() => removeWarehouseRow(row.id)}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Outbound Order</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Manage SKU, waybill, warehouse and outbound quantity allocations.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-96">
            <SummaryMetric label="SKUs" value={uniqueSkuCount} />
            <SummaryMetric label="Waybills" value={uniqueWaybillCount} />
            <SummaryMetric label="Total Qty" value={totalQty} />
          </div>
        </section>

        <Card title="Outbound details">
          <Space direction="vertical" size="middle" className="w-full">
            {listError ? <Alert message={listError} type="error" showIcon /> : null}
            <Table
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={listLoading}
              pagination={false}
              bordered
              size="middle"
              scroll={{ x: 1200 }}
              locale={{ emptyText: '暂无列表数据' }}
            />

            <Input.TextArea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              rows={3}
              placeholder="备注"
            />

            {submitMessage ? <Alert message={submitMessage} type="info" showIcon /> : null}
          </Space>
        </Card>
      </div>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card size="small">
      <Statistic title={label} value={value} />
    </Card>
  );
}

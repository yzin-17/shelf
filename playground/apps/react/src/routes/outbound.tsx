import 'antd/dist/reset.css';

import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  InputNumber,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import { Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useImmer, type Updater } from 'use-immer';
import { useEffect, useMemo, useRef } from 'react';

import { fetchAvailableWarehouses, fetchOutboundOrder, submitOutboundOrder } from './outbound/-api';
import {
  buildSubmitPayload,
  canDeleteWaybillRow,
  computeDisplayRows,
  computeStats,
  flattenOutboundOrder,
  formatBatchDate,
  getAvailableQty,
  validateRows,
  type AvailableWarehouse,
  type OutboundDisplayRow,
  type OutboundEditableRow,
} from './outbound/-table-model';

export const Route = createFileRoute('/outbound')({
  component: OutboundRoute,
});

const OUTBOUND_QUERY_KEY = ['outbound-order'];

function OutboundRoute() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, updateRows] = useImmer<OutboundEditableRow[]>([]);
  const [rowErrors, updateRowErrors] = useImmer<Record<string, Record<string, string | undefined>>>(
    {},
  );
  const [warehouseOptionsBySku, updateWarehouseOptionsBySku] = useImmer<
    Record<string, AvailableWarehouse[]>
  >({});
  const requestedSkuIdsRef = useRef<Set<string>>(new Set());

  const outboundQuery = useQuery({
    queryKey: OUTBOUND_QUERY_KEY,
    queryFn: fetchOutboundOrder,
  });

  const resetEditorState = () => {
    updateRowErrors(() => ({}));
    updateWarehouseOptionsBySku(() => ({}));
    requestedSkuIdsRef.current = new Set();
  };

  const ensureWarehouseOptions = async (skuId: string) => {
    if (!skuId || requestedSkuIdsRef.current.has(skuId)) {
      return;
    }

    requestedSkuIdsRef.current.add(skuId);
    try {
      const response = await fetchAvailableWarehouses(skuId);
      updateWarehouseOptionsBySku((draft) => {
        draft[skuId] = response.warehouses;
      });
    } catch (error) {
      requestedSkuIdsRef.current.delete(skuId);
      messageApi.error(
        error instanceof Error ? error.message : `Failed to load warehouses for ${skuId}`,
      );
    }
  };

  const hydrateFromOrder = (order: Awaited<ReturnType<typeof fetchOutboundOrder>>) => {
    resetEditorState();
    const nextRows = flattenOutboundOrder(order);
    updateRows(() => nextRows);
    nextRows.forEach((row) => {
      void ensureWarehouseOptions(row.skuId);
    });
  };

  useEffect(() => {
    if (!outboundQuery.data) {
      return;
    }

    hydrateFromOrder(outboundQuery.data);
  }, [outboundQuery.data]);

  const displayRows = useMemo(() => computeDisplayRows(rows), [rows]);
  const stats = useMemo(() => computeStats(rows), [rows]);

  const submitMutation = useMutation({
    mutationFn: submitOutboundOrder,
    onSuccess: async () => {
      messageApi.success('Outbound order submitted');
      const refreshed = await queryClient.fetchQuery({
        queryKey: OUTBOUND_QUERY_KEY,
        queryFn: fetchOutboundOrder,
      });
      hydrateFromOrder(refreshed);
    },
    onError: (error) => {
      messageApi.error(error instanceof Error ? error.message : 'Submit failed');
    },
  });

  const handleRefresh = async () => {
    try {
      const refreshed = await outboundQuery.refetch();
      if (refreshed.error) {
        throw refreshed.error;
      }
      if (refreshed.data) {
        hydrateFromOrder(refreshed.data);
      }
      messageApi.success('Outbound list refreshed');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Refresh failed');
    }
  };

  const handleWarehouseChange = (rowId: string, warehouseId: string | undefined) => {
    updateRows((draft) => {
      const row = draft.find((candidate) => candidate.id === rowId);
      if (row) {
        row.warehouseId = warehouseId;
        row.batchDate = undefined;
        row.outboundQty = undefined;
      }
    });
    clearRowError(rowId, 'warehouseId', updateRowErrors);
    clearRowError(rowId, 'batchDate', updateRowErrors);
    clearRowError(rowId, 'outboundQty', updateRowErrors);
  };

  const handleBatchChange = (rowId: string, batchDate: number | undefined) => {
    updateRows((draft) => {
      const row = draft.find((candidate) => candidate.id === rowId);
      if (row) {
        row.batchDate = batchDate;
        row.outboundQty = undefined;
      }
    });
    clearRowError(rowId, 'batchDate', updateRowErrors);
    clearRowError(rowId, 'outboundQty', updateRowErrors);
  };

  const handleQtyChange = (rowId: string, outboundQty: number | null) => {
    updateRows((draft) => {
      const row = draft.find((candidate) => candidate.id === rowId);
      if (row) {
        row.outboundQty = outboundQty ?? undefined;
      }
    });
    clearRowError(rowId, 'outboundQty', updateRowErrors);
  };

  const handleAddWarehouse = (rowId: string) => {
    updateRows((draft) => {
      const index = draft.findIndex((row) => row.id === rowId);
      if (index === -1) {
        return;
      }

      const anchor = draft[index];
      draft.splice(index + 1, 0, {
        id: createClientRowId(),
        skuId: anchor.skuId,
        waybillNo: anchor.waybillNo,
      });
    });
  };

  const handleDeleteRow = (rowId: string) => {
    if (!canDeleteWaybillRow(rows, rowId)) {
      messageApi.warning('Each waybill must keep at least one warehouse row');
      return;
    }

    updateRows((draft) => {
      const index = draft.findIndex((row) => row.id === rowId);
      if (index !== -1) {
        draft.splice(index, 1);
      }
    });
    updateRowErrors((draft) => {
      delete draft[rowId];
    });
  };

  const handleSubmit = () => {
    const validation = validateRows(rows, warehouseOptionsBySku);
    updateRowErrors(() => validation.rowErrors);

    if (!validation.isValid) {
      messageApi.error('Please fix validation errors before submitting');
      return;
    }

    submitMutation.mutate(buildSubmitPayload(rows));
  };

  const columns = useMemo(
    () =>
      buildColumns({
        rowErrors,
        warehouseOptionsBySku,
        onWarehouseFocus: ensureWarehouseOptions,
        onWarehouseChange: handleWarehouseChange,
        onBatchChange: handleBatchChange,
        onQtyChange: handleQtyChange,
        onAddWarehouse: handleAddWarehouse,
        onDeleteRow: handleDeleteRow,
        canDeleteRow: (rowId) => canDeleteWaybillRow(rows, rowId),
        onSubmit: handleSubmit,
        submitting: submitMutation.isPending,
      }),
    [rowErrors, warehouseOptionsBySku, submitMutation.isPending, rows],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.14),_transparent_32%),linear-gradient(180deg,_#f6fbff_0%,_#eef4f8_100%)] px-4 py-8 sm:px-6 lg:px-10">
      {contextHolder}
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <Typography.Title level={2} style={{ margin: 0 }}>
                Outbound Order Entry
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                Review each SKU, allocate warehouses by waybill, and submit the full outbound order
                as a single payload.
              </Typography.Paragraph>
            </div>
            <Button
              icon={<RefreshCw size={16} />}
              aria-label="Refresh outbound list"
              title="Refresh outbound list"
              onClick={() => {
                void handleRefresh();
              }}
              loading={outboundQuery.isFetching}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <Statistic title="SKU Count" value={stats.skuCount} />
          </Card>
          <Card>
            <Statistic title="Waybill Count" value={stats.waybillCount} />
          </Card>
          <Card>
            <Statistic title="Total Outbound Qty" value={stats.totalOutboundQty} />
          </Card>
        </div>

        <Card>
          <Space direction="vertical" size="large" style={{ display: 'flex' }}>
            {outboundQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : outboundQuery.isError ? (
              <Alert
                type="error"
                message="Failed to load outbound order"
                description={
                  outboundQuery.error instanceof Error
                    ? outboundQuery.error.message
                    : 'Unknown error'
                }
                showIcon
              />
            ) : rows.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="No outbound rows returned from the API"
                description="This page does not create default rows. Please provide source rows from the backend."
              />
            ) : (
              <Table<OutboundDisplayRow>
                rowKey="id"
                dataSource={displayRows}
                columns={columns}
                pagination={false}
                bordered
                scroll={{ x: 1200 }}
              />
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
}

type ColumnFactoryOptions = {
  rowErrors: Record<string, Record<string, string | undefined>>;
  warehouseOptionsBySku: Record<string, AvailableWarehouse[]>;
  onWarehouseFocus: (skuId: string) => Promise<void>;
  onWarehouseChange: (rowId: string, warehouseId: string | undefined) => void;
  onBatchChange: (rowId: string, batchDate: number | undefined) => void;
  onQtyChange: (rowId: string, outboundQty: number | null) => void;
  onAddWarehouse: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  canDeleteRow: (rowId: string) => boolean;
  onSubmit: () => void;
  submitting: boolean;
};

function buildColumns(options: ColumnFactoryOptions) {
  return [
    {
      title: 'Seq',
      key: 'seq',
      width: 72,
      onCell: (row: OutboundDisplayRow) => ({ rowSpan: row.skuRowSpan }),
      render: (_value: unknown, _row: OutboundDisplayRow, index: number) => index + 1,
    },
    {
      title: 'SKU ID',
      dataIndex: 'skuId',
      key: 'skuId',
      width: 160,
      onCell: (row: OutboundDisplayRow) => ({ rowSpan: row.skuRowSpan }),
      render: (value: string, row: OutboundDisplayRow) => (
        <FieldError error={options.rowErrors[row.id]?.skuId}>
          <Typography.Text>{value}</Typography.Text>
        </FieldError>
      ),
    },
    {
      title: 'Waybill No',
      dataIndex: 'waybillNo',
      key: 'waybillNo',
      width: 200,
      onCell: (row: OutboundDisplayRow) => ({ rowSpan: row.waybillRowSpan }),
      render: (value: string, row: OutboundDisplayRow) => (
        <FieldError error={options.rowErrors[row.id]?.waybillNo}>
          <Typography.Text>{value}</Typography.Text>
        </FieldError>
      ),
    },
    {
      title: 'Warehouse ID',
      dataIndex: 'warehouseId',
      key: 'warehouseId',
      width: 360,
      render: (_value: string | undefined, row: OutboundDisplayRow) => {
        const warehouseOptions = options.warehouseOptionsBySku[row.skuId] ?? [];
        const selectedWarehouse = warehouseOptions.find(
          (candidate) => candidate.warehouseId === row.warehouseId,
        );
        const batchOptions = selectedWarehouse?.batches ?? [];
        const availableQty = getAvailableQty(selectedWarehouse, row.batchDate);
        const canDeleteRow = options.canDeleteRow(row.id);

        return (
          <FieldError
            error={options.rowErrors[row.id]?.warehouseId ?? options.rowErrors[row.id]?.batchDate}
          >
            <Space direction="vertical" size={8} style={{ display: 'flex' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Select
                  value={row.warehouseId}
                  placeholder="Select warehouse"
                  style={{ flex: '1 1 0', minWidth: 0, maxWidth: 320 }}
                  options={warehouseOptions.map((warehouse) => ({
                    label: `${warehouse.warehouseId} | ${warehouse.warehouseName} | Available ${warehouse.availableQty}`,
                    value: warehouse.warehouseId,
                  }))}
                  onFocus={() => {
                    void options.onWarehouseFocus(row.skuId);
                  }}
                  onChange={(warehouseId) => {
                    options.onWarehouseChange(row.id, warehouseId);
                  }}
                  allowClear
                />
                <Select
                  value={row.batchDate}
                  placeholder="Select batch"
                  disabled={!selectedWarehouse?.isBatch}
                  style={{ width: 180 }}
                  options={batchOptions.map((batch) => ({
                    label: `${formatBatchDate(batch.batchDate)} | Available ${batch.availableQty}`,
                    value: batch.batchDate,
                  }))}
                  onChange={(batchDate) => {
                    options.onBatchChange(row.id, batchDate);
                  }}
                  allowClear
                />
                <Button
                  icon={<Plus size={16} />}
                  aria-label="Add warehouse"
                  title="Add warehouse"
                  onClick={() => options.onAddWarehouse(row.id)}
                />
                <Button
                  danger
                  icon={<Trash2 size={16} />}
                  aria-label="Delete warehouse row"
                  title={
                    canDeleteRow ? 'Delete warehouse row' : 'At least one warehouse row is required'
                  }
                  disabled={!canDeleteRow}
                  onClick={() => options.onDeleteRow(row.id)}
                />
              </Space.Compact>
              {selectedWarehouse ? (
                <Typography.Text type="secondary">
                  {selectedWarehouse.warehouseName} | Available Qty: {availableQty ?? '-'}
                </Typography.Text>
              ) : null}
            </Space>
          </FieldError>
        );
      },
    },
    {
      title: 'Outbound Qty',
      dataIndex: 'outboundQty',
      key: 'outboundQty',
      width: 180,
      render: (value: number | undefined, row: OutboundDisplayRow) => {
        const warehouse = (options.warehouseOptionsBySku[row.skuId] ?? []).find(
          (candidate) => candidate.warehouseId === row.warehouseId,
        );
        const availableQty = getAvailableQty(warehouse, row.batchDate);

        return (
          <FieldError error={options.rowErrors[row.id]?.outboundQty}>
            <InputNumber
              value={value}
              min={1}
              max={availableQty}
              precision={0}
              style={{ width: '100%' }}
              placeholder="Quantity"
              onChange={(nextValue) => {
                options.onQtyChange(row.id, nextValue);
              }}
            />
          </FieldError>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 140,
      render: () => (
        <Button
          type="primary"
          icon={<Send size={16} />}
          aria-label="Submit outbound order"
          title="Submit outbound order"
          loading={options.submitting}
          onClick={() => options.onSubmit()}
        />
      ),
    },
  ];
}

function FieldError({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
    </div>
  );
}

function clearRowError(
  rowId: string,
  field: string,
  updateRowErrors: Updater<Record<string, Record<string, string | undefined>>>,
) {
  updateRowErrors((draft) => {
    const rowError = draft[rowId];
    if (!rowError?.[field]) {
      return;
    }

    rowError[field] = undefined;
  });
}

function createClientRowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

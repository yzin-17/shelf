# Outbound 仓库批次选择设计

## 背景

Outbound 当前只支持按仓库选择可用数量。需求调整后，一个仓库可能是非批次仓库，也可能包含多个日期批次；批次仓库的每个日期批次拥有独立的可用数量。

## 目标

- 在可用仓库数据中表达非批次仓库和多批次仓库。
- 选择仓库后，批次选项与仓库同步；非批次仓库禁用批次选择。
- 切换仓库时清空批次和出库数量。
- 切换批次时清空出库数量。
- 数量校验使用当前仓库/批次的可用数量。
- 提交数据携带用户选择的日期批次。

## 数据模型

`AvailableWarehouse` 扩展为：

- `warehouseId: string`
- `warehouseName: string`
- `isBatch: boolean`
- `availableQty: number`：非批次仓库的可用数量。
- `batches: AvailableWarehouseBatch[]`：批次仓库的日期批次及可用数量；非批次仓库为空数组。

`AvailableWarehouseBatch` 包含：

- `batchDate: number`：以毫秒为单位的 Unix 时间戳。
- `availableQty: number`

`OutboundEditableRow` 增加可选的 `batchDate`，类型同样为毫秒时间戳。提交时每个 allocation 传递 `batchDate`；非批次仓库传递 `undefined`，由 JSON 序列化结果省略该字段。

## 页面行为

仓库下拉框保持现有行为。仓库选项展示仓库信息及非批次可用数量；选中仓库后：

- 批次仓库：批次下拉框启用，选项来自当前仓库的 `batches`，并将毫秒时间戳格式化为 `YYYY-MM-DD` 日期字符串展示，同时展示可用数量。
- 非批次仓库：批次下拉框禁用且为空。
- 仓库值变化时，行的 `batchDate` 和 `outboundQty` 均清空。
- 批次值变化时，行的 `outboundQty` 清空。

数量输入框继续要求大于 0，并根据当前选择的仓库和批次校验上限。批次仓库未选择批次时不使用仓库级数量作为上限。

## 校验与聚合

重复分配判断键从 `SKU + 运单 + 仓库` 调整为 `SKU + 运单 + 仓库 + 批次`，因此同仓库的不同批次可以分别出库。

提交 payload 保留现有 SKU、运单、分配聚合结构，并在 allocation 中增加 `batchDate`。页面初始化时从后端 allocation 还原 `batchDate`。

## 接口与测试

- 更新 outbound API 类型、OpenAPI 文档及 Mockoon artifact，使仓库响应包含批次字段，提交 schema 包含 `batchDate`。
- 补充表格模型测试：批次字段扁平化、批次切换相关状态辅助逻辑、按批次上限校验、不同批次允许重复仓库、提交 payload 携带批次。
- 保留并更新非批次仓库的既有测试。
- 运行 outbound 单元测试和 React 应用类型检查；若全仓类型检查包含既有无关错误，单独记录并确认本次文件无新增错误。

## 验收标准

- 选择批次仓库后可以选择日期批次，并能看到格式化后的 `YYYY-MM-DD` 日期和该批次的可用数量；接口和提交数据保存毫秒时间戳。
- 选择非批次仓库时批次控件为空且禁用。
- 仓库切换后批次、数量为空；批次切换后数量为空。
- 数量不能超过当前批次（或非批次仓库）的可用数量。
- 同一运单下同仓库不同批次可以提交，提交内容包含对应批次日期。

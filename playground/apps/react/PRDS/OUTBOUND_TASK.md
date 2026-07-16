# 出库表格任务文档

## 背景

基于 `PLAN.md` 实现一个出库录入 table。页面需要表达以下层级关系：

- 一个 `skuId` 对应一或多个运单号。
- 一个运单号对应一或多个仓库 id。
- 一个仓库 id 对应一个出库数量。

提交时不按合并单元格传值，而是组装为后端接口需要的结构化数据：

```text
skuId -> waybills[] -> allocations[]
```

## 待确认技术栈

当前实现按以下技术栈与项目约束执行，请确认是否接受：

- 页面框架：React 19。
- 路由：TanStack Router / TanStack Start 文件路由。
- 构建工具：Vite。
- 表格与表单控件：Ant Design `Table`、`Input`、`Select`、`InputNumber`、`Button`。
- 页面外层布局：沿用项目现有 Tailwind CSS 4 工具类。
- 图标：lucide-react。
- API 契约与 mock 生成：`$mockoon-gen`。
- Mock 服务：Mockoon，端口 `6000`。
- Whistle 转发：`localhost:3000/api/* -> 127.0.0.1:6000/api/*`。
- 页面路由：`/outbound`。
- 页面目录：`apps/react/src/routes/outbound`。
- mockoon-gen 产物目录：`apps/react/src/routes/outbound/mockoon-gen`。
- 页面 API 封装：`apps/react/src/routes/outbound/-api.ts`。
- 文件名前缀 `-`：这是 TanStack 文件路由的 ignore 约定，表示这些文件不是路由文件，避免路由生成器把 API、测试和工具函数当作页面扫描。

## 页面范围

新增 `/outbound` 出库录入页，包含：

- 明细表格。
- 在运单下添加仓库行、删除仓库行。
- 每行保存草稿。
- 每行提交出库单。
- 备注输入。
- SKU 数、运单数、出库总数统计。

## 表格字段

表头固定为：

- 序号
- skuid
- 运单号
- 仓库 id
- 出库数量

## 交互规则

- 每一行代表一个最小仓库明细：`skuId + waybillNo + warehouseId + outboundQty`。
- 表格行数据不允许使用前端默认值，只能从列表接口加载。
- `skuId` 不可修改，只展示文本。
- 页面按 `skuId -> waybillNo -> warehouse` 层级展示。
- 同一个 `skuId` 下可以有多个 `waybillNo`。
- 同一个 `waybillNo` 下可以有多个仓库 id。
- 同一个 `skuId` 和同一个 `waybillNo` 的连续行使用 antd `Table` 的 `rowSpan` 合并展示。
- 每个 `waybillNo` 至少保留一条仓库行。
- 不提供“添加运单”按钮。
- “添加仓库”按钮放在仓库 id 列内。
- 保存和提交按钮放在每一行。
- 页面根据只读 `skuId` 请求该 SKU 的可用仓库列表。
- 仓库 id 使用下拉框选择。
- 出库数量使用数字输入框。
- 下拉框展示仓库 id 与仓库名称。
- 选中仓库后展示可用数量。
- 同一个 `skuId + waybillNo + warehouseId` 不允许重复。
- 单行出库数量不能超过当前仓库的可用数量。
- 同一个 `skuId + warehouseId` 在多行中的出库数量合计是否超过总可用数量，前端不拦截，点击保存或提交后由后端判断。

## 接口范围

当前页面只直接使用：

- `GET /api/skus/{skuId}/available-warehouses`
- `GET /api/outbound-orders`
- `POST /api/outbound-orders`

## 校验规则

- `skuId` 必填。
- `waybillNo` 必填。
- `warehouseId` 必填。
- `outboundQty` 必填，且必须大于 0。
- `outboundQty` 不能超过当前行选择仓库的 `availableQty`。
- `skuId + waybillNo + warehouseId` 不允许重复。
- 不做同一个 `skuId + warehouseId` 的跨行合计校验。

## 测试与验证

当前验证方式：

- `node --test apps/react/src/routes/outbound/-outbound-table.test.ts`
- `node /Users/yzin/.agents/skills/mockoon-gen/bin/mockoon-gen.mjs validate --from apps/react/src/routes/outbound/mockoon-gen/api-artifact.json --strict --cwd /Users/yzin/code/shelf/playground`
- `pnpm --filter @vite-test/react build`

已知限制：

- 全仓 `pnpm run typecheck` 当前存在既有 demo/resume/vue 类型错误，和 `/outbound` 新增文件无关。

## 请确认

请确认以上技术栈、路径、Mockoon 端口、Whistle 转发方式和页面范围是否符合预期。确认后再继续调整实现细节或进入下一步联调。

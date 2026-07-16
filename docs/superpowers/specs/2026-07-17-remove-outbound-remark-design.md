# 删除出站页面备注字段设计

## 范围

删除出站 React 页面、表格模型和单元测试中的 `remark` 相关逻辑；不修改 outbound 的 OpenAPI 与 Mockoon 配置文件。

## 方案

在 `outbound.tsx` 中删除备注状态、订单回填、输入事件处理和备注输入框，提交时仅传入表格行数据。

在 `-table-model.ts` 中删除订单响应类型和提交 payload 类型的 `remark` 字段，使 `buildSubmitPayload` 仅接收 `rows`，并移除备注规范化函数。生成的提交 payload 保留 `action` 与 `items`。

在 `-outbound-table.test.ts` 中移除测试订单的备注字段，更新提交 payload 测试调用和断言，确保 payload 不再包含 `remark`。

## 验证

运行 outbound 表格模型单元测试，并使用 `rg` 检查页面、模型和测试源码中不再存在 `remark` 引用。OpenAPI/Mockoon 目录中的既有引用应保留。

# 工单记录工具 - SPEC

## 1. Concept & Vision

一个运维实施工程师的轻量级工单记录工具，嵌入现有 task 项目。核心理念：**2 秒记录，永久不忘**。解决"忙起来就忘了记录"的痛点，让工单记录从负担变成习惯。

视觉风格：简洁实用，不炫技，以效率和清晰为首要目标。

## 2. Design Language

**继承 task 项目现有风格（待确认）**，暂时使用简洁的中性风格。

## 3. Layout & Structure

```
/workorder            → 工单记录主页（表单 + 最近记录）
/workorder/list       → 历史工单列表
```

## 4. Features & Interactions

### 4.1 快速记录表单

**字段：**
- `date` — 开始时间（默认当天）
- `endDate` — 结束时间（可选）
- `service` — 项目名称（文本输入，常用下拉）
- `requester` — 需求人（可选）
- `type` — 问题类型（下拉：故障/咨询/变更/优化，支持自定义）
- `description` — 问题描述（工作内容）
- `solution` — 处理方案（措施）
- `duration` — 处理时长（分钟，数字输入）
- `handler` — 处理人

**行为：**
- 打开页面 → 日期自动填当天，处理人自动填当前用户
- 点击保存 → 追加到 JSON 文件，显示成功提示，表单不清空（方便连续记录）
- 保存失败 → 显示错误提示

### 4.2 工单列表

- 默认显示最近 20 条，支持按日期范围筛选
- 列表每行（折叠态）：类型、项目名称、需求人、处理人、时间范围、时长
- 点击展开查看完整详情（问题描述、处理方案、需求人/处理人）
- 支持删除（确认后再删）

### 4.3 Excel 导入/导出

- 导出字段顺序：项目名称、需求人、处理人、问题描述（工作内容）、开始时间、结束时间、处理方案（措施）、问题类型、处理时长(分钟)
- 导出为 `.csv` 文件（UTF-8 BOM，Excel 可直接打开）
- 导入支持 `.xlsx` 文件，列名自动匹配
- 导入模板含格式说明和示例行

### 4.4 Excel 导入模板

- 列顺序：项目名称、需求人、处理人、问题描述（工作内容）、开始时间、结束时间、处理方案（措施）、问题类型、处理时长(分钟)
- 含 4 行示例数据
- 下载地址：`/workorder_template.xlsx`

### 4.5 忘记记录提醒

- 每次打开工单页面时检测：今天是否已有记录
- 如果没有，顶部显示提示条："今天还没有记录，开始记录吧"
- 点击提示跳到表单

## 5. Component Inventory

### WorkOrderForm
- 状态：default（填写中）/ submitting（提交中）/ success（刚提交）/ error

### WorkOrderList
- 状态：loading / empty / populated / error

### WorkOrderItem
- 状态：collapsed / expanded

### ExportModal
- 日期范围选择器 + 导出按钮

### ReminderBanner
- 仅在今天无记录时显示

## 6. Technical Approach

### 安全要求（必须满足）

- JWT_SECRET 环境变量必须设置，启动时检查，未设置则拒绝启动
- 所有工单 API 必须带有效 Token 访问（authMiddleware）
- 工单数据按 userId 隔离，查询/修改/删除时验证所有权
- CSV 导出字段进行公式注入防护（`=+-@` 前缀转义）
- 登录/注册接口加防暴力限流（15分钟窗口期）
- 导入接口最大条数 5000 条
- 用户名检测接口始终返回 `available: true`（防枚举）
- 密码强度校验：至少 6 位且含两类字符

### Backend

**新增文件：**
- `src/server/workorder-store.ts` — 工单数据存储（复用 task store 模式）
- `src/types/workorder.ts` — 类型定义
- `src/server/index.ts` — 新增 `/api/workorders/*` 路由

**API 设计：**
```
GET    /api/workorders              → 列表（支持 page/pageSize/dateFrom/dateTo）
POST   /api/workorders              → 新建工单
DELETE /api/workorders/:id          → 删除工单
GET    /api/workorders/export       → 导出 Excel（query: dateFrom, dateTo）
GET    /api/workorders/today-count  → 今日记录数量（用于提醒检测）
```

**数据模型：**
```typescript
interface WorkOrder {
  id: string;
  date: string;          // YYYY-MM-DD 开始时间
  endDate: string;       // YYYY-MM-DD 结束时间
  service: string;       // 项目名称
  requester: string;     // 需求人
  type: string;           // 问题类型（支持自定义）
  description: string;   // 问题描述（工作内容）
  solution: string;      // 处理方案（措施）
  duration: number;      // 分钟
  handler: string;       // 处理人
  createdAt: string;     // ISO timestamp
}
```

### Frontend

**新增文件：**
- `src/pages/WorkOrderPage.tsx` — 主页面（表单 + 列表）
- `src/services/workorder-api.ts` — API 调用封装

### 数据存储

- 复用 task 项目的 JSON 文件存储模式
- 文件路径：`src/server/data/workorders.json`

## 7. 优先级排序

1. ✅ 工单快速记录（核心）
2. ✅ 工单列表查看
3. ✅ 忘记记录提醒
4. ✅ Excel 导出
5. ⬜ Dashboard 统计（后续迭代）

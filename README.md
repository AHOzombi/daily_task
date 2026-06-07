# Daily Task · 每日任务工单记录工具

> 运维实施工程师的轻量化工单记录工具，2 秒记录，永久不忘。

---

## 🎯 核心理念

**"忙起来就忘了记录"** —— 这是本工具要解决的唯一问题。

日常工作中，工单记录全靠手动整理到 Excel，容易忘、格式不统一、事后补全总是缺东少西。本工具将记录动作压缩到**2 秒**，嵌入日常工作流，让工单记录从负担变成习惯。

---

## ✨ 功能一览

### 📋 工单记录

| 功能 | 说明 |
|------|------|
| **快速记录** | 日期自动当天、处理人自动填充，打开即可录入 |
| **字段完整** | 项目名称 / 需求人 / 问题类型 / 问题描述 / 处理方案 / 处理时长 |
| **问题类型** | 故障 / 咨询 / 变更 / 优化（支持自定义） |
| **常用项目** | 下拉快速选择，减少重复输入 |
| **连续记录** | 保存后表单不清空，方便连续记录多条 |
| **编辑已有** | 点击列表项直接编辑 |
| **删除确认** | 删除前二次确认，防止误操作 |

### 📅 智能提醒

- 每次打开页面自动检测：**今天是否已有记录**
- 无记录时顶部显示提示条，点击直接跳到表单
- 再也不会漏记

### 📊 历史查询

- 最近工单列表，支持分页
- 按**日期范围**筛选
- 按**项目名称 / 问题类型 / 处理时长**排序
- 展开查看完整详情（问题描述 + 处理方案）

### 📥 Excel 导入 / 导出

| 操作 | 说明 |
|------|------|
| **CSV 导出** | UTF-8 BOM 编码，Excel 直接打开无乱码 |
| **日期范围** | 可选导出时间段 |
| **XLSX 导入** | 自动匹配列名，批量补录历史工单 |
| **导入模板** | 内置示例数据，可直接下载使用 |

### 🤖 任务管理（基础版）

- 任务增删改查
- 按优先级（高/中/低）和状态管理
- 支持 AI 优先级建议面板

---

## 🛠 技术架构

```
前端
├── React 19 + TypeScript
├── Vite 7（构建工具）
└── React Router（路由）

后端
├── Node.js + Express 5
├── JSON 文件存储（无数据库依赖）
└── XLSX（Excel 导入导出）
```

**API 端口：** `10124`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/workorders` | GET | 工单列表（支持分页 + 日期筛选） |
| `/api/workorders` | POST | 新建工单 |
| `/api/workorders/:id` | PUT | 编辑工单 |
| `/api/workorders/:id` | DELETE | 删除工单 |
| `/api/workorders/today-count` | GET | 今日记录数量（提醒检测） |
| `/api/workorders/export` | GET | CSV 导出（query: dateFrom, dateTo） |

**数据文件：** `src/server/data/workorders.json`（本地 JSON，纯前端存储）

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端 API

```bash
# 开发模式（支持热重载）
npm run api:dev

# 生产模式
npm run api
```

### 3. 启动前端

```bash
npm run dev
```

前端默认访问：`http://localhost:10123`  
API 端点：`http://localhost:10124`

### 4. 生产构建

```bash
npm run build
npm run preview
```

---

## 📁 目录结构

```
├── src/
│   ├── components/          # UI 组件
│   │   └── task/           # 任务相关组件
│   ├── pages/               # 页面
│   │   ├── WorkOrderPage.tsx    # 工单记录页
│   │   ├── TaskListPage.tsx     # 任务列表页
│   │   └── TaskDashboardPage.tsx
│   ├── server/              # 后端
│   │   ├── index.ts         # API 入口
│   │   ├── store.ts         # 任务数据存储
│   │   ├── workorder-store.ts   # 工单数据存储
│   │   ├── auth.ts          # 认证
│   │   └── data/            # JSON 数据文件
│   │       ├── tasks.json
│   │       └── workorders.json  # 工单数据
│   ├── services/            # API 调用封装
│   │   ├── task-api.ts
│   │   └── workorder-api.ts
│   ├── types/               # TypeScript 类型定义
│   └── styles/              # 全局样式
├── public/                  # 静态资源
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔧 配置说明

### 常用项目配置

修改 `src/pages/WorkOrderPage.tsx` 中的 `COMMON_SERVICES` 数组：

```typescript
const COMMON_SERVICES = [
  '新建区政务服务网',
  '新建区叫号系统',
  '赣服通',
  '新事新办系统',
  '政务晓屋',
  // 在这里添加你的常用项目...
];
```

### 问题类型配置

修改同文件的 `WORKORDER_TYPES` 数组：

```typescript
const WORKORDER_TYPES: WorkOrderType[] = ['故障', '咨询', '变更', '优化'];
```

### 端口配置

| 服务 | 默认端口 | 修改位置 |
|------|---------|---------|
| 前台 | `10123` | `vite.config.ts` |
| 后台 API | `10124` | `ecosystem.config.cjs` |

---

## 📦 数据格式

### 工单数据模型

```typescript
interface WorkOrder {
  id: string;           // 唯一 ID（时间戳 + 随机字符串）
  date: string;         // 开始日期 YYYY-MM-DD
  endDate: string;      // 结束日期 YYYY-MM-DD
  service: string;      // 项目名称
  requester: string;    // 需求人
  type: WorkOrderType;  // 问题类型
  description: string;  // 问题描述（工作内容）
  solution: string;     // 处理方案（措施）
  duration: number;     // 处理时长（分钟）
  handler: string;      // 处理人
  createdAt: string;    // 记录创建时间（ISO 时间戳）
}
```

### 导出 CSV 字段顺序

```
项目名称, 需求人, 处理人, 问题描述（工作内容）, 开始时间, 结束时间, 处理方案（措施）, 问题类型, 处理时长(分钟)
```

---

## 🔒 数据安全说明

- **数据存储在本地**：`src/server/data/workorders.json`，不依赖任何云数据库
- **导入 / 导出均由本地处理**，无任何数据上报
- **部署建议**：在内网环境部署，数据完全自主可控
- **备份**：定期备份 `data/` 目录即可

### 安全机制

| 措施 | 说明 |
|------|------|
| **JWT 鉴权** | 所有工单操作需登录后进行，JWT_SECRET 必须通过环境变量配置 |
| **用户数据隔离** | 每个用户只能查看/修改自己的工单数据 |
| **防暴力破解** | 登录/注册接口 15 分钟内最多 20 次 |
| **防公式注入** | CSV 导出对以 `=+-@` 开头的单元格加前缀，防止 Excel 公式注入 |
| **防数据耗尽** | 单次导入上限 5000 条 |
| **请求体限制** | JSON 请求体最大 1MB |
| **安全响应头** | Helmet 提供 CSP/X-Content-Type-Options 等安全头 |
| **防用户名枚举** | 用户名检测接口始终返回 available: true |
| **密码强度** | 注册时强制校验：至少6位且包含两类字符 |

### 环境变量（必须设置）

```bash
JWT_SECRET=<your-secret-key>   # 必须设置，生成方式：openssl rand -hex 64
```

---

## 📌 更新日志

- **2026-04-12** — 安全加固：JWT 强制鉴权、用户数据隔离、防暴力破解、CSV 公式注入防护、密码强度校验
- **2026-04-11** — 工单记录工具正式交付，支持快速记录、列表查询、CSV 导出、忘记提醒

---

## 👤 作者

**AHOzombi** · 政务领域实施工程师

---

## 📄 License

MIT

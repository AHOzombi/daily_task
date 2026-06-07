import type { TaskRecord } from '../types/task';

export const seedTasks: TaskRecord[] = [
  {
    id: 'task-001',
    userId: '',
    isPublic: true,
    title: '完成 Task 独立项目布局',
    description: '把 memory-admin 中的任务模块独立成正式版前端项目骨架。',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-20T12:00:00.000Z',
    createdAt: '2026-03-19T08:30:00.000Z',
    updatedAt: '2026-03-19T14:30:00.000Z',
    tags: ['工作', '自动化'],
    project: 'Task系统',
    subtasks: [
      { id: 'sub-001', title: '拆分独立前端骨架', done: true },
      { id: 'sub-002', title: '补基础布局', done: true },
      { id: 'sub-003', title: '联调真实 API', done: false }
    ],
    notes: '先把独立项目搭起来，再逐步接真实 API 和产品能力。',
    review: '前端与后端骨架已初步成型，后续重点提升完成度与可用性。'
  },
  {
    id: 'task-002',
    userId: '',
    isPublic: true,
    title: '定义任务 mock 数据服务',
    description: '为 Dashboard 提供独立的数据来源和 CRUD 能力。',
    status: 'pending',
    priority: 'urgent',
    dueDate: '2026-03-19T18:00:00.000Z',
    createdAt: '2026-03-19T09:20:00.000Z',
    updatedAt: '2026-03-19T09:20:00.000Z',
    tags: ['AI Agent', '工作'],
    project: 'OpenClaw',
    subtasks: [
      { id: 'sub-004', title: '定义 API 接口', done: true },
      { id: 'sub-005', title: '整理数据结构', done: false }
    ],
    notes: '这里主要承接 OpenClaw 相关接口和数据流设计。',
    review: '接口边界逐渐清晰，但还要继续做产品化收敛。'
  },
  {
    id: 'task-003',
    userId: '',
    isPublic: true,
    title: '设计任务统计卡片',
    description: '准备任务总数、进行中、已完成、逾期等统计信息。',
    status: 'completed',
    priority: 'medium',
    dueDate: '2026-03-18T16:00:00.000Z',
    createdAt: '2026-03-18T10:00:00.000Z',
    updatedAt: '2026-03-18T17:20:00.000Z',
    tags: ['学习', '复盘'],
    project: '阅读复盘',
    subtasks: [
      { id: 'sub-006', title: '输出复盘草稿', done: true }
    ],
    notes: '把阶段性结果沉淀成可复用的复盘内容。',
    review: '适合后续接 AI 自动总结和周报生成。'
  },
  {
    id: 'task-004',
    userId: '',
    isPublic: true,
    title: '补 Dashboard 任务列表区域',
    description: '将筛选、表格、分页、弹窗串联到主页。',
    status: 'cancelled',
    priority: 'low',
    dueDate: null,
    createdAt: '2026-03-17T13:00:00.000Z',
    updatedAt: '2026-03-18T09:10:00.000Z',
    tags: ['工作'],
    project: 'Task系统',
    subtasks: [
      { id: 'sub-001', title: '拆分独立前端骨架', done: true },
      { id: 'sub-002', title: '补基础布局', done: true },
      { id: 'sub-003', title: '联调真实 API', done: false }
    ],
    notes: '先把独立项目搭起来，再逐步接真实 API 和产品能力。',
    review: '前端与后端骨架已初步成型，后续重点提升完成度与可用性。'
  }
];

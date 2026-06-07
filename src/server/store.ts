import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { CreateTaskInput, TaskFilters, TaskPageResult, TaskRecord, UpdateTaskInput } from '../types/task';
import { seedTasks } from '../mocks/task-data';
import { appendActivity } from './activity-store';

const STORE_PATH = resolve(process.cwd(), 'src/server/data/tasks.json');

const MAX_PAGE_SIZE = 100;

async function ensureStore() {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, 'utf8');
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(seedTasks, null, 2), 'utf8');
  }
}

function normalizeTask(task: Partial<TaskRecord> & { id: string; title: string; description: string; status: TaskRecord['status']; priority: TaskRecord['priority']; createdAt: string; updatedAt: string; dueDate?: string | null; userId?: string }): TaskRecord {
  return {
    id: task.id,
    userId: task.userId ?? '',
    isPublic: task.isPublic ?? false,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    tags: Array.isArray(task.tags) ? task.tags : [],
    project: task.project ?? 'Task系统',
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    notes: task.notes ?? '',
    review: task.review ?? ''
  };
}

async function readStore(): Promise<TaskRecord[]> {
  await ensureStore();
  const raw = await readFile(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as Array<Partial<TaskRecord> & { id: string; title: string; description: string; status: TaskRecord['status']; priority: TaskRecord['priority']; createdAt: string; updatedAt: string }>;
  return parsed.map(normalizeTask);
}

async function writeStore(tasks: TaskRecord[]) {
  const tempPath = `${STORE_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(tasks, null, 2), 'utf8');
  await rename(tempPath, STORE_PATH);
}

function applyFilters(tasks: TaskRecord[], filters: TaskFilters, userId?: string) {
  return tasks.filter((task) => {
    const taskUserId = task.userId ?? '';
    const isPublic = task.isPublic === true;
    const effectiveUserId = userId ?? '';

    // 自己的任务或公开任务可看
    if (taskUserId !== effectiveUserId && !isPublic) return false;

    const keyword = filters.keyword.trim().toLowerCase();
    const keywordOk = !keyword || task.title.toLowerCase().includes(keyword) || task.description.toLowerCase().includes(keyword);
    let statusOk = filters.status === 'all' || task.status === filters.status;
    if (filters.status === 'active') {
      statusOk = task.status === 'pending' || task.status === 'in_progress';
    }
    const priorityOk = filters.priority === 'all' || task.priority === filters.priority;
    const tagOk = filters.tag === 'all' || task.tags.includes(filters.tag);
    const projectOk = filters.project === 'all' || task.project === filters.project;
    return keywordOk && statusOk && priorityOk && tagOk && projectOk;
  });
}

function sortTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'completed' || a.status === 'cancelled';
    const bDone = b.status === 'completed' || b.status === 'cancelled';
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}

function paginate(tasks: TaskRecord[], filters: TaskFilters): TaskPageResult {
  // pageSize 上限，防止内存耗尽
  const safePageSize = Math.min(Math.max(1, Number(filters.pageSize ?? 10)), MAX_PAGE_SIZE);
  const page = Math.max(1, Number(filters.page ?? 1));
  const total = tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const actualPage = Math.min(page, totalPages);
  const start = (actualPage - 1) * safePageSize;
  return {
    list: tasks.slice(start, start + safePageSize),
    total,
    totalPages,
    page: actualPage,
    pageSize: safePageSize,
  };
}

export async function listTasks(filters: TaskFilters, userId?: string): Promise<TaskPageResult> {
  const tasks = await readStore();
  return paginate(sortTasks(applyFilters(tasks, filters, userId)), filters);
}

export async function getAllTasks(userId?: string): Promise<TaskRecord[]> {
  const tasks = await readStore();
  // 不分页但限制最大返回条数，防止大文件打爆内存
  return applyFilters(tasks, { keyword: '', status: 'all', priority: 'all', tag: 'all', project: 'all', page: 1, pageSize: MAX_PAGE_SIZE }, userId);
}

export async function createTask(input: CreateTaskInput, userId?: string): Promise<TaskRecord> {
  const tasks = await readStore();
  const now = new Date().toISOString();
  const created: TaskRecord = {
    id: `task-${Date.now()}`,
    userId: userId ?? '',
    isPublic: input.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  tasks.unshift(created);
  await writeStore(tasks);
  await appendActivity({ taskId: created.id, taskTitle: created.title, action: 'create', detail: '创建了任务', userId });
  return created;
}

export async function updateTask(input: UpdateTaskInput, userId?: string): Promise<TaskRecord> {
  const tasks = await readStore();
  const index = tasks.findIndex((task) => task.id === input.id);
  if (index < 0) throw new Error('Task not found');

  const original = tasks[index];

  // 所有权检查：原始任务有 userId 时必须匹配
  if (original.userId && userId !== undefined && original.userId !== userId) {
    throw new Error('无权更新此任务');
  }

  // 禁止通过 input 覆盖 userId，防止劫持
  const { userId: _ignoredUserId, ...safeInput } = input;

  const updated: TaskRecord = {
    ...original,
    ...safeInput,
    id: original.id,          // id 不可改
    userId: original.userId, // userId 不可改（由创建者决定）
    updatedAt: new Date().toISOString(),
  };
  tasks[index] = updated;
  await writeStore(tasks);
  await appendActivity({ taskId: updated.id, taskTitle: updated.title, action: 'update', detail: '更新了任务内容', userId });
  return updated;
}

export async function deleteTask(id: string, userId?: string): Promise<void> {
  const tasks = await readStore();
  const target = tasks.find((task) => task.id === id);
  // 无主人的任务（遗留数据）不允许删除
  if (!target) return;
  if (target.userId && userId !== undefined && target.userId !== userId) {
    throw new Error('无权删除此任务');
  }
  await writeStore(tasks.filter((task) => task.id !== id));
  if (target) {
    await appendActivity({ taskId: target.id, taskTitle: target.title, action: 'delete', detail: '删除了任务', userId });
  }
}

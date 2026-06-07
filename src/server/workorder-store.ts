import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { CreateWorkOrderInput, WorkOrder, WorkOrderFilters } from '../types/workorder';

const STORE_PATH = resolve(process.cwd(), 'src/server/data/workorders.json');

async function ensureStore() {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, 'utf8');
  } catch {
    await writeFile(STORE_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readStore(): Promise<WorkOrder[]> {
  await ensureStore();
  const raw = await readFile(STORE_PATH, 'utf8');
  return JSON.parse(raw) as WorkOrder[];
}

async function writeStore(orders: WorkOrder[]) {
  const tempPath = `${STORE_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(orders, null, 2), 'utf8');
  await rename(tempPath, STORE_PATH);
}

// 防止 Excel 公式注入：对以 = + - @ 开头的字段内容加前缀
function safeCell(value: string): string {
  const trimmed = String(value ?? '');
  if (/^[=+\-@\t\r\n]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

function applyFilters(orders: WorkOrder[], filters: WorkOrderFilters, userId?: string) {
  return orders.filter((order) => {
    // 用户隔离：只看自己的工单
    if (userId && order.userId !== userId) return false;

    if (filters.dateFrom && order.date < filters.dateFrom) return false;
    if (filters.dateTo && order.date > filters.dateTo) return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const match =
        order.service.toLowerCase().includes(kw) ||
        order.description.toLowerCase().includes(kw) ||
        order.solution.toLowerCase().includes(kw) ||
        order.requester.toLowerCase().includes(kw);
      if (!match) return false;
    }
    return true;
  });
}

function sortOrders(orders: WorkOrder[]) {
  return [...orders].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}

export async function listWorkOrders(
  filters: WorkOrderFilters,
  userId?: string,
): Promise<{ list: WorkOrder[]; total: number }> {
  const orders = await readStore();
  const filtered = sortOrders(applyFilters(orders, filters, userId));
  const total = filtered.length;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const list = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { list, total };
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
  userId: string,
): Promise<WorkOrder> {
  const orders = await readStore();
  const created: WorkOrder = {
    id: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    createdAt: new Date().toISOString(),
    date: input.date,
    endDate: input.endDate ?? '',
    service: input.service,
    requester: input.requester ?? '',
    type: input.type,
    description: input.description ?? '',
    solution: input.solution ?? '',
    duration: input.duration ?? 0,
    handler: input.handler ?? '',
  };
  orders.unshift(created);
  await writeStore(orders);
  return created;
}

export async function updateWorkOrder(
  id: string,
  patch: Partial<WorkOrder>,
  userId: string,
): Promise<WorkOrder | null> {
  const store = await readStore();
  const idx = store.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  // 所有权检查
  if (store[idx].userId !== userId) {
    throw new Error('无权修改此工单');
  }
  store[idx] = { ...store[idx], ...patch };
  await writeStore(store);
  return store[idx];
}

export async function deleteWorkOrder(id: string, userId: string): Promise<void> {
  const store = await readStore();
  const target = store.find((o) => o.id === id);
  if (!target) return;
  // 所有权检查
  if (target.userId !== userId) {
    throw new Error('无权删除此工单');
  }
  await writeStore(store.filter((o) => o.id !== id));
}

export async function getTodayCount(userId: string): Promise<number> {
  const orders = await readStore();
  const today = new Date().toISOString().split('T')[0];
  return orders.filter((o) => o.date === today && o.userId === userId).length;
}

export async function importWorkOrders(
  inputs: CreateWorkOrderInput[],
  userId: string,
): Promise<WorkOrder[]> {
  const store = await readStore();
  const created: WorkOrder[] = [];
  for (const input of inputs) {
    const wo: WorkOrder = {
      id: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      createdAt: new Date().toISOString(),
      date: input.date,
      endDate: input.endDate || '',
      service: input.service,
      requester: input.requester || '',
      type: input.type,
      description: input.description || '',
      solution: input.solution || '',
      duration: input.duration || 0,
      handler: input.handler || '',
    };
    store.unshift(wo);
    created.push(wo);
  }
  await writeStore(store);
  return created;
}

export async function getWorkOrdersForExport(
  filters: WorkOrderFilters,
  userId: string,
): Promise<WorkOrder[]> {
  const orders = await readStore();
  return sortOrders(applyFilters(orders, filters, userId));
}

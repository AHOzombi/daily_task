import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { TaskActivityAction, TaskActivityRecord } from '../types/activity';

const STORE_PATH = resolve(process.cwd(), 'src/server/data/activities.json');

async function ensureStore() {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, 'utf8');
  } catch {
    await writeFile(STORE_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readStore(): Promise<TaskActivityRecord[]> {
  await ensureStore();
  return JSON.parse(await readFile(STORE_PATH, 'utf8')) as TaskActivityRecord[];
}

async function writeStore(items: TaskActivityRecord[]) {
  const tempPath = `${STORE_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
  await rename(tempPath, STORE_PATH);
}

export async function listActivities(userId?: string): Promise<TaskActivityRecord[]> {
  const items = await readStore();
  const effectiveUserId = userId ?? '';
  // Return activities for this user only (or anonymous/legacy if no userId)
  return items.filter((item) => (item.userId ?? '') === effectiveUserId);
}

export async function appendActivity(input: {
  taskId: string;
  taskTitle: string;
  action: TaskActivityAction;
  detail: string;
  userId?: string;
}) {
  const items = await readStore();
  const record: TaskActivityRecord = {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    userId: input.userId ?? '',
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    action: input.action,
    detail: input.detail
  };
  items.unshift(record);
  await writeStore(items);
  return record;
}

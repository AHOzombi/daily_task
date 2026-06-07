import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import {
  createTask,
  deleteTask,
  getAllTasks,
  listTasks,
  updateTask,
} from './store';
import { listActivities } from './activity-store';
import {
  createWorkOrder,
  deleteWorkOrder,
  getTodayCount,
  getWorkOrdersForExport,
  importWorkOrders,
  listWorkOrders,
  updateWorkOrder,
} from './workorder-store';
import { createUser, findUserByUsername, verifyPassword, toPublicUser } from './users';
import { authMiddleware, optionalAuth, signToken } from './auth';
import type { CreateWorkOrderInput, WorkOrder } from '../types/workorder';
import type { CreateTaskInput, TaskFilters, TaskRecord, UpdateTaskInput } from '../types/task';
import type { LoginInput, RegisterInput } from '../types/user';

const app = express();
const port = Number(process.env.TASK_API_PORT ?? 10124);

// 信任一层代理（Nginx），使 req.ip 限流有效
app.set('trust proxy', 1);

// ── 安全响应头 ────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  'http://127.0.0.1:10123',
  'http://localhost:10123',
  'http://127.0.0.1:10122',
  'http://localhost:10122',
  'https://task.601856.xyz',
  'http://task.601856.xyz',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    try {
      const { hostname } = new URL(origin);
      const isLanHost = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(hostname);
      if (allowedOrigins.has(origin) || isLanHost) {
        callback(null, true);
        return;
      }
    } catch {
      // ignore invalid origin
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));

app.use(express.json({ limit: '1mb' })); // 请求体大小限制
app.use(express.static(path.join(process.cwd(), 'public')));

// ── 简易内存限流（登录/注册） ─────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15分钟内
const RATE_LIMIT_MAX = 20; // 最多20次

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

// ── 防止 Excel 公式注入 ───────────────────────────────────────────────────────
function safeCell(value: string): string {
  const trimmed = String(value ?? '');
  if (/^[=+\-@\t\r\n]/.test(trimmed)) return `'${trimmed}`;
  return trimmed;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const ip = req.ip ?? 'unknown';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ code: 429, message: '请求过于频繁，请15分钟后再试' });
    return;
  }
  const input = req.body as RegisterInput;
  if (!input.username || !input.password) {
    res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    return;
  }
  if (input.username.length < 3 || input.password.length < 6) {
    res.status(400).json({ code: 400, message: '用户名至少3位，密码至少6位' });
    return;
  }
  try {
    const user = await createUser(input);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ code: 0, message: '注册成功', data: { token, user } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '注册失败';
    res.status(409).json({ code: 409, message: msg });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip ?? 'unknown';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ code: 429, message: '请求过于频繁，请15分钟后再试' });
    return;
  }
  const input = req.body as LoginInput;
  if (!input.username || !input.password) {
    res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    return;
  }
  const user = await verifyPassword(input);
  if (!user) {
    res.status(401).json({ code: 401, message: '用户名或密码错误' });
    return;
  }
  const token = signToken({ userId: user.id, username: user.username });
  res.json({ code: 0, message: '登录成功', data: { token, user: toPublicUser(user) } });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { user } = req as any;
  res.json({ code: 0, message: 'success', data: { userId: user.userId, username: user.username } });
});

// 始终返回 available: true，防止用户名枚举
app.get('/api/auth/check-username', async (_req, res) => {
  res.json({ code: 0, message: 'success', data: { available: true } });
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

app.get('/api/tasks', optionalAuth, async (req, res) => {
  const filters: TaskFilters = {
    keyword: String(req.query.keyword ?? ''),
    status: (req.query.status as TaskFilters['status']) ?? 'all',
    priority: (req.query.priority as TaskFilters['priority']) ?? 'all',
    tag: (req.query.tag as TaskFilters['tag']) ?? 'all',
    project: (req.query.project as TaskFilters['project']) ?? 'all',
    page: Math.max(1, Number(req.query.page ?? 1)),
    pageSize: Math.min(Math.max(1, Number(req.query.pageSize ?? 10)), 100),
  };
  const user = (req as any).user as { userId: string; username: string } | undefined;
  const result = await listTasks(filters, user?.userId);
  res.json({ code: 0, message: 'success', data: result });
});

app.get('/api/tasks/all', optionalAuth, async (req, res) => {
  const user = (req as any).user as { userId: string; username: string } | undefined;
  const result = await getAllTasks(user?.userId);
  res.json({ code: 0, message: 'success', data: result });
});

app.get('/api/activities', optionalAuth, async (req, res) => {
  const user = (req as any).user as { userId: string; username: string } | undefined;
  const result = await listActivities(user?.userId);
  res.json({ code: 0, message: 'success', data: result });
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const payload = req.body as CreateTaskInput;
  const { user } = req as any;
  const created = await createTask(payload, user.userId);
  res.json({ code: 0, message: 'success', data: created });
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const payload = req.body as CreateTaskInput;
  const { user } = req as any;
  try {
    const updated = await updateTask(
      { ...(payload as UpdateTaskInput), id: String(req.params.id) },
      user.userId,
    );
    res.json({ code: 0, message: 'success', data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '更新失败';
    res.status(403).json({ code: 403, message: msg });
  }
});

app.patch('/api/tasks/:id/status', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const all = await getAllTasks(user.userId);
  const current = all.find((task: TaskRecord) => task.id === String(req.params.id));
  if (!current) {
    res.status(404).json({ code: 404, message: 'Task not found' });
    return;
  }
  try {
    const updated = await updateTask(
      { ...current, status: req.body.status, id: String(req.params.id) },
      user.userId,
    );
    res.json({ code: 0, message: 'success', data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '状态更新失败';
    res.status(403).json({ code: 403, message: msg });
  }
});

app.patch('/api/tasks/:id/subtasks/:subtaskId', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const all = await getAllTasks(user.userId);
  const current = all.find((task: TaskRecord) => task.id === String(req.params.id));
  if (!current) {
    res.status(404).json({ code: 404, message: 'Task not found' });
    return;
  }
  const subtasks = current.subtasks.map((item) =>
    item.id === req.params.subtaskId ? { ...item, done: Boolean(req.body.done) } : item,
  );
  try {
    const updated = await updateTask(
      { ...current, id: String(req.params.id), subtasks },
      user.userId,
    );
    res.json({ code: 0, message: 'success', data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '更新失败';
    res.status(403).json({ code: 403, message: msg });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { user } = req as any;
  try {
    await deleteTask(String(req.params.id), user.userId);
    res.json({ code: 0, message: 'success', data: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '删除失败';
    res.status(403).json({ code: 403, message: msg });
  }
});

// ── WorkOrders（全部需要登录） ─────────────────────────────────────────────────

app.get('/api/workorders', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const filters: import('../types/workorder').WorkOrderFilters = {
    page: Number(req.query.page ?? 1),
    pageSize: Number(req.query.pageSize ?? 20),
    dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
    dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
    keyword: req.query.keyword ? String(req.query.keyword) : undefined,
  };
  const result = await listWorkOrders(filters, user.userId);
  res.json({ code: 0, message: 'success', data: result });
});

app.post('/api/workorders', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const body = req.body;
  if (!body.date || !body.service || !body.type) {
    res.status(400).json({ code: 400, message: 'date, service, type 为必填字段' });
    return;
  }
  const created = await createWorkOrder(
    {
      date: body.date,
      endDate: body.endDate ?? '',
      service: body.service,
      requester: body.requester ?? '',
      type: body.type,
      description: body.description ?? '',
      solution: body.solution ?? '',
      duration: Number(body.duration) || 0,
      handler: body.handler ?? '',
    },
    user.userId,
  );
  res.json({ code: 0, message: 'success', data: created });
});

app.delete('/api/workorders/:id', authMiddleware, async (req, res) => {
  const { user } = req as any;
  try {
    await deleteWorkOrder(String(req.params.id), user.userId);
    res.json({ code: 0, message: 'success', data: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '删除失败';
    res.status(403).json({ code: 403, message: msg });
  }
});

app.put('/api/workorders/:id', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const body = req.body as Partial<CreateWorkOrderInput>;
  try {
    const updated = await updateWorkOrder(String(req.params.id), body, user.userId);
    if (!updated) {
      res.status(404).json({ code: 404, message: '工单不存在' });
      return;
    }
    res.json({ code: 0, message: 'success', data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '无权修改此工单';
    res.status(403).json({ code: 403, message: msg });
  }
});

app.get('/api/workorders/today-count', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const count = await getTodayCount(user.userId);
  res.json({ code: 0, message: 'success', data: { count } });
});

app.get('/api/workorders/export', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const dateFrom = String(req.query.dateFrom ?? '');
  const dateTo = String(req.query.dateTo ?? '');
  const orders = await getWorkOrdersForExport({ dateFrom, dateTo }, user.userId);

  // CSV 防公式注入
  const header =
    '项目名称,需求人,处理人,问题描述（工作内容）,开始时间,结束时间,处理方案（措施）,问题类型,处理时长(分钟)\n';
  const rows = orders
    .map((o) =>
      [
        `"${safeCell(o.service)}"`,
        `"${safeCell(o.requester || '')}"`,
        `"${safeCell(o.handler)}"`,
        `"${safeCell(o.description)}"`,
        o.date,
        o.endDate || '',
        `"${safeCell(o.solution)}"`,
        o.type,
        o.duration ?? 0,
      ].join(','),
    )
    .join('\n');
  const csv = header + rows;
  const filename = `工单记录_${dateFrom || 'start'}_${dateTo || 'end'}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send('\ufeff' + csv); // BOM for Excel UTF-8
});

app.post('/api/workorders/import', authMiddleware, async (req, res) => {
  const { user } = req as any;
  const { orders } = req.body as { orders: CreateWorkOrderInput[] };
  if (!Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ code: 400, message: '请提供有效的工单数据' });
    return;
  }
  // 数据量限制：最多5000条
  if (orders.length > 5000) {
    res.status(400).json({ code: 400, message: '单次导入不超过5000条，请分批导入' });
    return;
  }
  const validOrders = orders.filter((o) => o.date && o.service);
  const skipped = orders.length - validOrders.length;
  const created = await importWorkOrders(validOrders, user.userId);
  res.json({
    code: 0,
    message: `成功导入 ${created.length} 条${skipped > 0 ? `，${skipped} 条因日期或服务名称为空已跳过` : ''}`,
    data: { imported: created.length, skipped },
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(port, '0.0.0.0', () => {
  console.log(`task api listening on http://0.0.0.0:${port}`);
});

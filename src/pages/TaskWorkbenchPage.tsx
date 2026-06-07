/**
 * TaskWorkbenchPage — 任务处理工作台
 * React + Tailwind CSS
 *
 * 组件结构：
 * TaskWorkbenchPage
 * ├── TopStatsBar        — 4 个核心指标
 * ├── MainToolbar        — 搜索 + 筛选 + 视图切换
 * ├── TaskTableView      — 主表格（行操作收敛）
 * ├── AiSidebar         — 右侧 AI 辅助（弱化视觉 + 可执行）
 * ├── TaskModal         — 新建 / 编辑弹窗
 * └── ConfirmModal      — 确认删除
 */

import { useEffect, useMemo, useState } from 'react';
import { taskApi } from '../services/task-api';
import type { CreateTaskInput, TaskFilters, TaskRecord } from '../types/task';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(t: TaskRecord) {
  if (!t.dueDate) return false;
  return new Date(t.dueDate).getTime() < Date.now() && t.status !== 'completed';
}

function statusText(s: TaskRecord['status']) {
  return { pending: '待处理', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }[s];
}
function priorityLabel(p: TaskRecord['priority']) {
  return { low: '低', medium: '中', high: '高', urgent: '紧急' }[p];
}
function nextStatus(s: TaskRecord['status']): TaskRecord['status'] {
  if (s === 'pending') return 'in_progress';
  if (s === 'in_progress') return 'completed';
  return s;
}
function dueStateLabel(task: TaskRecord) {
  if (!task.dueDate) return { text: '—', tone: 'normal' };
  if (task.status === 'completed') return { text: '完成', tone: 'done' };
  const due = new Date(task.dueDate);
  const now = new Date();
  const same = due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
  if (due.getTime() < now.getTime()) return { text: '逾期', tone: 'overdue' };
  if (same) return { text: '今日', tone: 'today' };
  return { text: '正常', tone: 'normal' };
}

// ─── Chip 组件 ────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: TaskRecord['status'] }) {
  const cls = {
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  }[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{statusText(status)}</span>;
}

function PriorityChip({ priority }: { priority: TaskRecord['priority'] }) {
  const cls = {
    low: 'bg-gray-50 text-gray-500 border-gray-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    high: 'bg-red-50 text-red-600 border-red-200',
    urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  }[priority];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{priorityLabel(priority)}</span>;
}

// ─── TopStatsBar ──────────────────────────────────────────────────────────────

function TopStatsBar({ tasks }: { tasks: TaskRecord[] }) {
  const stats = useMemo(() => [
    { label: '全部', value: tasks.length, cls: 'border border-blue-200 bg-blue-50' },
    { label: '待处理', value: tasks.filter((t) => t.status === 'pending').length, cls: 'border border-blue-300 bg-white' },
    { label: '进行中', value: tasks.filter((t) => t.status === 'in_progress').length, cls: 'border border-purple-300 bg-white' },
    { label: '已完成', value: tasks.filter((t) => t.status === 'completed').length, cls: 'border border-green-300 bg-white' },
  ], [tasks]);

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.cls}`}>
          <strong className="text-2xl font-bold text-gray-800">{s.value}</strong>
          <span className="text-sm text-gray-500 font-medium">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MainToolbar ──────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'board' | 'calendar';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
];
const PRIORITY_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];
const TAG_OPTIONS = [
  { value: 'all', label: '全部标签' },
  { value: '工作', label: '工作' },
  { value: '学习', label: '学习' },
  { value: 'AI Agent', label: 'AI Agent' },
  { value: '自动化', label: '自动化' },
  { value: '复盘', label: '复盘' },
];
const PROJECT_OPTIONS = ['Task系统', 'OpenClaw', '自动化实验', '阅读复盘', '个人事务'];

function MainToolbar({
  filters,
  onChange,
  viewMode,
  onViewChange,
  onCreate,
}: {
  filters: TaskFilters;
  onChange: (patch: Partial<TaskFilters>) => void;
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onCreate: () => void;
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/* 主工具栏行 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 搜索 */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            value={filters.keyword}
            onChange={(e) => onChange({ keyword: e.target.value, page: 1 })}
            placeholder="搜索任务..."
          />
        </div>

        {/* 状态筛选 */}
        <select
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as TaskFilters['status'], page: 1 })}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* 更多筛选 */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showMore ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
        >
          筛选 {showMore ? '▲' : '▼'}
        </button>

        <div className="flex-1" />

        {/* 视图切换 */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['table', 'board', 'calendar'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {v === 'table' ? '表格' : v === 'board' ? '看板' : '日历'}
            </button>
          ))}
        </div>

        {/* 新建 */}
        <button
          type="button"
          onClick={onCreate}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          + 新建任务
        </button>
      </div>

      {/* 展开的筛选行 */}
      {showMore && (
        <div className="flex items-center gap-2 flex-wrap pb-1">
          <select
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filters.priority}
            onChange={(e) => onChange({ priority: e.target.value as TaskFilters['priority'], page: 1 })}
          >
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filters.tag}
            onChange={(e) => onChange({ tag: e.target.value as TaskFilters['tag'], page: 1 })}
          >
            {TAG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filters.project}
            onChange={(e) => onChange({ project: e.target.value as TaskFilters['project'], page: 1 })}
          >
            <option value="all">全部项目</option>
            {PROJECT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            type="button"
            onClick={() => onChange({ keyword: '', status: 'all', priority: 'all', tag: 'all', project: 'all', page: 1 })}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 hover:bg-gray-50"
          >
            重置
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TaskTable ───────────────────────────────────────────────────────────────

function TaskRowActions({
  task,
  onStatusChange,
  onEdit,
  onView,
  onDelete,
}: {
  task: TaskRecord;
  onStatusChange: (id: string, s: TaskRecord['status']) => void;
  onEdit: (t: TaskRecord) => void;
  onView: (t: TaskRecord) => void;
  onDelete: (t: TaskRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const upcoming = nextStatus(task.status);

  return (
    <div className="flex items-center gap-1">
      {/* 完成推进按钮 */}
      {upcoming !== task.status && (
        <button
          type="button"
          onClick={() => onStatusChange(task.id, upcoming)}
          className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${task.status === 'pending' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {task.status === 'pending' ? '▶ 开始' : '✓ 完成'}
        </button>
      )}

      {/* 更多下拉 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          ···
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden text-sm">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
              onClick={() => { onView(task); setOpen(false); }}
            >
              详情
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
              onClick={() => { onEdit(task); setOpen(false); }}
            >
              编辑
            </button>
            <div className="border-t border-gray-100" />
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
              onClick={() => { onDelete(task); setOpen(false); }}
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskTableView({
  tasks,
  loading,
  updating,
  onEdit,
  onView,
  onDelete,
  onStatusChange,
  onCreate,
}: {
  tasks: TaskRecord[];
  loading: boolean;
  updating?: boolean;
  onEdit: (t: TaskRecord) => void;
  onView: (t: TaskRecord) => void;
  onDelete: (t: TaskRecord) => void;
  onStatusChange: (id: string, s: TaskRecord['status']) => void;
  onCreate: () => void;
}) {
  if (loading && !tasks.length) return <div className="text-center py-12 text-gray-400">加载中…</div>;

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="text-4xl">📋</div>
        <h3 className="text-lg font-semibold text-gray-700">暂无任务</h3>
        <p className="text-sm text-gray-400">当前筛选条件下没有匹配的任务</p>
        <button type="button" onClick={onCreate} className="mt-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          新建第一个任务
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
      {updating && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-gray-800/70 text-white text-xs">更新中…</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">标题</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">状态</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">优先级</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">截止日期</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const due = dueStateLabel(task);
              return (
                <tr key={task.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{task.title}</div>
                    {task.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</div>}
                    {task.subtasks.length > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">子任务 {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusChip status={task.status} /></td>
                  <td className="px-4 py-3"><PriorityChip priority={task.priority} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '—'}</span>
                      <span className={`inline-block w-fit text-xs px-1.5 py-0.5 rounded-full ${due.tone === 'overdue' ? 'bg-red-50 text-red-600' : due.tone === 'today' ? 'bg-orange-50 text-orange-600' : due.tone === 'done' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {due.text}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TaskRowActions
                      task={task}
                      onStatusChange={onStatusChange}
                      onEdit={onEdit}
                      onView={onView}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AiSidebar ───────────────────────────────────────────────────────────────

function AiSidebar({
  tasks,
  onImport,
}: {
  tasks: TaskRecord[];
  onImport: (items: CreateTaskInput[]) => void;
}) {
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [drafts, setDrafts] = useState<CreateTaskInput[]>([]);
  const [generating, setGenerating] = useState(false);

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);
  const todayCount = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const due = new Date(t.dueDate);
      return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
    }).length;
  }, [tasks]);

  function buildDrafts(g: string): CreateTaskInput[] {
    if (!g.trim()) return [];
    const tags = g.toLowerCase().includes('agent') ? (['AI Agent'] as any) : (['工作'] as any);
    const project = g.toLowerCase().includes('openclaw') ? 'OpenClaw' : '个人事务';
    return [
      `明确目标：${g.trim()}`,
      '拆解核心模块与关键流程',
      '确定数据接口与边界',
      '完成第一轮实现',
      '验证结果并整理优化点',
    ].map((title, i) => ({
      title,
      description: `AI 拆解目标「${g.trim()}」生成`,
      status: 'pending' as const,
      priority: (i < 2 ? 'high' : 'medium') as TaskRecord['priority'],
      dueDate: null,
      tags,
      project: project as any,
      subtasks: [],
      notes: 'AI 拆解草案',
      review: '',
    }));
  }

  function handleGenerate() {
    setGenerating(true);
    try {
      setDrafts(buildDrafts(goal));
    } finally {
      setGenerating(false);
    }
  }

  function handleImport() {
    if (!drafts.length) return;
    setGenerating(true);
    Promise.resolve(onImport(drafts)).finally(() => {
      setDrafts([]);
      setGoal('');
      setPlannerOpen(false);
      setGenerating(false);
    });
  }

  return (
    <aside className="flex flex-col gap-3 w-72 shrink-0">
      {/* 快速概览 — 始终可见，轻量化 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">⚡ 快速概览</h3>
        <div className="flex gap-3">
          <div className={`flex-1 rounded-lg p-3 text-center ${overdueCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>{overdueCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">已逾期</div>
          </div>
          <div className={`flex-1 rounded-lg p-3 text-center ${todayCount > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`text-xl font-bold ${todayCount > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{todayCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">今日到期</div>
          </div>
        </div>
      </div>

      {/* AI 任务拆解 — 可折叠 */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setPlannerOpen((v) => !v)}
        >
          <h3 className="text-sm font-semibold text-gray-600">🤖 AI 任务拆解</h3>
          <span className="text-xs text-gray-400">{plannerOpen ? '▲' : '▼'}</span>
        </button>

        {plannerOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            <textarea
              className="w-full rounded-lg border border-gray-200 p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="输入一个目标，系统自动拆解任务草案…"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!goal.trim() || generating}
                onClick={handleGenerate}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '生成中…' : '生成草案'}
              </button>
              {drafts.length > 0 && (
                <button
                  type="button"
                  disabled={generating}
                  onClick={handleImport}
                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  导入 {drafts.length} 条
                </button>
              )}
            </div>

            {drafts.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {drafts.map((d, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                    <div className="text-xs font-semibold text-gray-700">{d.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── TaskModal ───────────────────────────────────────────────────────────────

function TaskModal({
  open,
  task,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: {
  open: boolean;
  task: TaskRecord | null;
  submitting: boolean;
  submitError: string;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskRecord['priority']>('medium');
  const [status, setStatus] = useState<TaskRecord['status']>('pending');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<TaskRecord['tags']>([]);
  const [project, setProject] = useState<TaskRecord['project']>('个人事务');

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title); setDescription(task.description);
        setPriority(task.priority); setStatus(task.status);
        setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
        setTags(task.tags); setProject(task.project);
      } else {
        setTitle(''); setDescription(''); setPriority('medium'); setStatus('pending');
        setDueDate(''); setTags([]); setProject('个人事务');
      }
    }
  }, [open, task]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(), description: description.trim(),
      priority, status, dueDate: dueDate || null,
      tags, project,
      subtasks: task?.subtasks ?? [],
      notes: task?.notes ?? '', review: task?.review ?? '',
    });
  }

  if (!open) return null;

  const TAG_LIST = ['工作', '学习', 'AI Agent', '自动化', '复盘'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{task ? '编辑任务' : '新建任务'}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg">×</button>
        </div>

        <form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
          {/* 标题 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">标题 *</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="任务标题" required autoFocus
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* 描述 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">描述</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="补充说明（可选）" rows={2}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* 优先级 + 状态 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">优先级</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskRecord['priority'])}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="urgent">紧急</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">状态</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskRecord['status'])}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="pending">待处理</option><option value="in_progress">进行中</option><option value="completed">已完成</option><option value="cancelled">已取消</option>
              </select>
            </div>
          </div>

          {/* 截止日期 + 项目 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">截止日期</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">项目</label>
              <select value={project} onChange={(e) => setProject(e.target.value as TaskRecord['project'])}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {PROJECT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">标签</label>
            <div className="flex flex-wrap gap-2">
              {TAG_LIST.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setTags((prev) => prev.includes(t as any) ? prev.filter((x) => x !== t) : [...prev, t as any])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tags.includes(t as any) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {submitError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{submitError}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">取消</button>
            <button type="submit" disabled={submitting || !title.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? '保存中…' : task ? '保存修改' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  task,
  onClose,
  onConfirm,
}: {
  task: TaskRecord;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除任务</h3>
        <p className="text-sm text-gray-500 mb-4">删除后不可恢复，是否继续？</p>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4">
          <strong className="text-sm text-gray-800">{task.title}</strong>
          {task.description && <p className="text-xs text-gray-400 mt-1">{task.description}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">确认删除</button>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TaskFilters = {
  keyword: '', status: 'all', priority: 'all', tag: 'all', project: 'all',
  page: 1, pageSize: 10,
};

export function TaskWorkbenchPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [allTasks, setAllTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating]= useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [detailTask, setDetailTask] = useState<TaskRecord | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function loadPage(nextFilters = filters) {
    const pageOnlyChange =
      nextFilters.page !== filters.page &&
      nextFilters.pageSize === filters.pageSize &&
      nextFilters.keyword === filters.keyword &&
      nextFilters.status === filters.status &&
      nextFilters.priority === filters.priority &&
      nextFilters.tag === filters.tag &&
      nextFilters.project === filters.project;

    try {
      pageOnlyChange ? setUpdating(true) : setLoading(true);
      setError('');
      const [pageResult, fullList] = await Promise.all([taskApi.list(nextFilters), taskApi.getAll()]);
      setTasks(pageResult.list);
      setTotalPages(pageResult.totalPages);
      setAllTasks(fullList);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }

  useEffect(() => { void loadPage(filters); }, [filters]);

  useEffect(() => {
    const handler = () => { setSubmitError(''); setEditingTask(null); setModalOpen(true); };
    window.addEventListener('task:create', handler);
    return () => window.removeEventListener('task:create', handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function handleSubmit(input: CreateTaskInput) {
    if (submitting) return;
    try {
      setSubmitting(true); setSubmitError('');
      if (editingTask) {
        await taskApi.update({ id: editingTask.id, ...input });
        setToast({ tone: 'success', text: '任务已更新' });
      } else {
        await taskApi.create(input);
        setToast({ tone: 'success', text: '任务已创建' });
      }
      setModalOpen(false); setEditingTask(null);
      await loadPage();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setSubmitError(msg); setToast({ tone: 'error', text: msg }); throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(task: TaskRecord) { setDeletingTask(task); }

  async function confirmDelete() {
    if (!deletingTask) return;
    try {
      await taskApi.remove(deletingTask.id);
      setToast({ tone: 'success', text: '任务已删除' });
      setDeletingTask(null);
      await loadPage();
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof Error ? err.message : '删除失败' });
    }
  }

  async function handleStatusChange(id: string, status: TaskRecord['status']) {
    try {
      await taskApi.updateStatus(id, status);
      setToast({ tone: 'success', text: `已更新为${statusText(status)}` });
      await loadPage();
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof Error ? err.message : '状态更新失败' });
    }
  }

  async function handleImportDrafts(items: CreateTaskInput[]) {
    for (const item of items) await taskApi.create(item);
    setToast({ tone: 'success', text: `已导入 ${items.length} 条任务` });
    await loadPage();
  }

  return (
    <div className="flex flex-col gap-4 min-h-full">
      {/* 顶部统计 */}
      <TopStatsBar tasks={allTasks} />

      {/* 主体：左侧主面板 + 右侧 AI */}
      <div className="flex gap-4 items-start">
        {/* 左侧主面板 */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* 工具栏 */}
          <MainToolbar
            filters={filters}
            onChange={(patch) => setFilters((cur) => ({ ...cur, ...patch }))}
            viewMode={viewMode}
            onViewChange={setViewMode}
            onCreate={() => { setSubmitError(''); setEditingTask(null); setModalOpen(true); }}
          />

          {/* Toast */}
          {toast && (
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${toast.tone === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {toast.text}
            </div>
          )}
          {error && <div className="rounded-xl px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200">{error}</div>}

          {/* 视图内容 */}
          {viewMode === 'table' && (
            <>
              <TaskTableView
                tasks={tasks} loading={loading} updating={updating}
                onEdit={(t) => { setSubmitError(''); setEditingTask(t); setModalOpen(true); }}
                onView={(t) => setDetailTask(t)}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onCreate={() => { setSubmitError(''); setEditingTask(null); setModalOpen(true); }}
              />
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">第 {filters.page} / {totalPages} 页，共 {allTasks.length} 条</span>
                  <div className="flex gap-1">
                    <button
                      type="button" disabled={filters.page <= 1}
                      onClick={() => setFilters((c) => ({ ...c, page: c.page - 1 }))}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >‹ 上一页</button>
                    <button
                      type="button" disabled={filters.page >= totalPages}
                      onClick={() => setFilters((c) => ({ ...c, page: c.page + 1 }))}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >下一页 ›</button>
                  </div>
                </div>
              )}
            </>
          )}

          {viewMode === 'board' && (
            <div className="grid grid-cols-4 gap-3">
              {(['pending', 'in_progress', 'completed', 'cancelled'] as TaskRecord['status'][]).map((col) => {
                const colTasks = tasks.filter((t) => t.status === col);
                return (
                  <div key={col} className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">{statusText(col)}</span>
                      <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{colTasks.length}</span>
                    </div>
                    {colTasks.map((t) => (
                      <div key={t.id} className="rounded-lg bg-white border border-gray-100 p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                        onClick={() => setDetailTask(t)}>
                        <div className="text-sm font-semibold text-gray-800 line-clamp-2">{t.title}</div>
                        {t.description && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</div>}
                        <div className="mt-2"><PriorityChip priority={t.priority} /></div>
                      </div>
                    ))}
                    {colTasks.length === 0 && <div className="text-xs text-gray-300 text-center py-4">暂无</div>}
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
              📅 日历视图 — 后续接入日历组件
            </div>
          )}
        </div>

        {/* 右侧 AI 辅助区 */}
        <AiSidebar tasks={allTasks} onImport={handleImportDrafts} />
      </div>

      {/* 弹窗 */}
      <TaskModal
        open={modalOpen} task={editingTask} submitting={submitting} submitError={submitError}
        onClose={() => { if (!submitting) { setSubmitError(''); setModalOpen(false); setEditingTask(null); } }}
        onSubmit={handleSubmit}
      />
      {deletingTask && (
        <ConfirmModal task={deletingTask} onClose={() => setDeletingTask(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}

// ─── DetailDrawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ task, onClose }: { task: TaskRecord; onClose: () => void }) {
  const due = dueStateLabel(task);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-[slideInRight_240ms_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800">任务详情</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg">×</button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">标题</span>
            <p className="font-semibold text-gray-800 text-base">{task.title}</p>
          </div>
          {task.description && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">描述</span>
              <p className="text-sm text-gray-600">{task.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">状态</span>
              <StatusChip status={task.status} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">优先级</span>
              <PriorityChip priority={task.priority} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">截止日期</span>
              <p className="text-sm text-gray-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '未设置'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">到期状态</span>
              <span className={`inline-block w-fit text-xs px-2 py-1 rounded-full ${due.tone === 'overdue' ? 'bg-red-50 text-red-600' : due.tone === 'today' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>{due.text}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">项目</span>
            <p className="text-sm text-gray-700">{task.project}</p>
          </div>
          {task.tags.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">标签</span>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {task.subtasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">子任务</span>
              {task.subtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${st.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                    {st.done ? '✓' : ''}
                  </div>
                  <span className={`text-sm ${st.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{st.title}</span>
                </div>
              ))}
            </div>
          )}
          {task.notes && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">备注</span>
              <p className="text-sm text-gray-600">{task.notes}</p>
            </div>
          )}
          {task.review && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">复盘</span>
              <p className="text-sm text-gray-600">{task.review}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

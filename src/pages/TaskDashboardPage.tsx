import { useEffect, useMemo, useState } from 'react';
import { TaskCalendar } from '../components/task/TaskCalendar';
import { TaskDetailDrawer } from '../components/task/TaskDetailDrawer';
import { AiTaskPlanner } from '../components/task/AiTaskPlanner';
import { AiWeeklyReview } from '../components/task/AiWeeklyReview';
import { TaskReminderPanel } from '../components/task/TaskReminderPanel';
import { TaskBoard } from '../components/task/TaskBoard';
import { TaskFilterBar } from '../components/task/TaskFilterBar';
import { TaskModal } from '../components/task/TaskModal';
import { TaskPagination } from '../components/task/TaskPagination';
import { TaskTable } from '../components/task/TaskTable';
import { ACTIVITY_API, taskApi } from '../services/task-api';
import type { CreateTaskInput, TaskFilters, TaskRecord } from '../types/task';
import type { PublicUser } from '../types/user';

interface Props {
  user: PublicUser | null;
  onPromptLogin: () => void;
}

const defaultFilters: TaskFilters = {
  keyword: '',
  status: 'active',
  priority: 'all',
  tag: 'all',
  project: 'all',
  page: 1,
  pageSize: 5
};

function isOverdue(task: TaskRecord) {
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now() && task.status !== 'completed';
}

function statusText(status: TaskRecord['status']) {
  return {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }[status];
}

export function TaskDashboardPage({ user, onPromptLogin }: Props) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [allTasks, setAllTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageUpdating, setPageUpdating] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'calendar'>('table');

  const isGuest = !user?.id;

  function handleViewModeChange(mode: 'table' | 'board' | 'calendar') {
    setViewMode(mode);
    // Table view defaults to showing active tasks (pending + in_progress)
    if (mode === 'table') {
      setFilters((prev) => ({ ...prev, status: 'active', page: 1 }));
    } else {
      setFilters((prev) => ({ ...prev, status: 'all', page: 1 }));
    }
  }
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [detailTask, setDetailTask] = useState<TaskRecord | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskRecord | null>(null);

  async function loadPage(nextFilters = filters) {
    const pageOnlyChange = nextFilters.page !== filters.page
      && nextFilters.pageSize === filters.pageSize
      && nextFilters.keyword === filters.keyword
      && nextFilters.status === filters.status
      && nextFilters.priority === filters.priority
      && nextFilters.tag === filters.tag
      && nextFilters.project === filters.project;

    try {
      if (tasks.length === 0 || !pageOnlyChange) {
        setLoading(true);
      } else {
        setPageUpdating(true);
      }
      setError('');
      const [pageResult, fullList, activityRes] = await Promise.all([
        taskApi.list(nextFilters),
        taskApi.getAll(),
        fetch(ACTIVITY_API).then((res) => res.json())
      ]);
      setTasks(pageResult.list);
      setTotalPages(pageResult.totalPages);
      setAllTasks(fullList);
      setActivities(activityRes.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载任务失败');
    } finally {
      setLoading(false);
      setPageUpdating(false);
    }
  }

  useEffect(() => {
    void loadPage(filters);
  }, [filters]);

  useEffect(() => {
    const handler = () => {
      if (isGuest) {
        onPromptLogin();
        return;
      }
      setSubmitError('');
      setEditingTask(null);
      setModalOpen(true);
    };
    window.addEventListener('task:create', handler);
    return () => window.removeEventListener('task:create', handler);
  }, [isGuest]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const summary = useMemo(() => {
    const pending = allTasks.filter((task) => task.status === 'pending').length;
    const inProgress = allTasks.filter((task) => task.status === 'in_progress').length;
    const completed = allTasks.filter((task) => task.status === 'completed').length;
    const overdue = allTasks.filter(isOverdue).length;
    const dueToday = allTasks.filter((task) => {
      if (!task.dueDate || task.status === 'completed') return false;
      const due = new Date(task.dueDate);
      const now = new Date();
      return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
    }).length;

    return [
      { label: '任务总数', value: allTasks.length, tone: 'neutral' },
      { label: '待处理', value: pending, tone: 'blue' },
      { label: '进行中', value: inProgress, tone: 'purple' },
      { label: '已完成', value: completed, tone: 'green' },
      { label: '今日到期', value: dueToday, tone: 'amber' },
      { label: '已逾期', value: overdue, tone: 'red' }
    ];
  }, [allTasks]);

  async function handleSubmit(input: CreateTaskInput) {
    if (submitting) return;
    if (isGuest) {
      onPromptLogin();
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      const actionLabel = editingTask ? '任务已更新' : '任务已创建';
      if (editingTask) {
        await taskApi.update({ id: editingTask.id, ...input });
      } else {
        await taskApi.create(input);
      }
      setModalOpen(false);
      setEditingTask(null);
      setSubmitError('');
      setToast({ tone: 'success', text: actionLabel });
      await loadPage();
    } catch (error) {
      const message = error instanceof Error ? `保存失败：${error.message}` : '保存失败，请稍后重试';
      setSubmitError(message);
      setToast({ tone: 'error', text: message });
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(task: TaskRecord) {
    if (isGuest) {
      onPromptLogin();
      return;
    }
    setDeletingTask(task);
  }

  async function confirmDelete() {
    if (!deletingTask) return;

    try {
      await taskApi.remove(deletingTask.id);
      setDeletingTask(null);
      setToast({ tone: 'success', text: '任务已删除' });
      await loadPage();
    } catch (error) {
      setToast({ tone: 'error', text: error instanceof Error ? `删除失败：${error.message}` : '删除失败，请稍后重试' });
    }
  }

  async function handleStatusChange(id: string, status: TaskRecord['status']) {
    if (isGuest) {
      onPromptLogin();
      return;
    }
    try {
      await taskApi.updateStatus(id, status);
      setToast({ tone: 'success', text: `状态已更新为${statusText(status)}` });
      await loadPage();
    } catch (error) {
      setToast({ tone: 'error', text: error instanceof Error ? `状态更新失败：${error.message}` : '状态更新失败，请稍后重试' });
    }
  }

  async function handleDetailUpdate(updated: TaskRecord) {
    if (isGuest) {
      onPromptLogin();
      return;
    }
    try {
      await taskApi.update(updated);
      setToast({ tone: 'success', text: '任务已更新' });
      setDetailTask(null);
      await loadPage();
    } catch (error) {
      setToast({ tone: 'error', text: error instanceof Error ? `更新失败：${error.message}` : '更新失败，请稍后重试' });
    }
  }

  async function handleImportDrafts(items: CreateTaskInput[]) {
    if (isGuest) {
      onPromptLogin();
      return;
    }
    for (const item of items) {
      await taskApi.create(item);
    }
    setToast({ tone: 'success', text: `已导入 ${items.length} 条任务草稿` });
    await loadPage();
  }

  return (
    <section className="task-dashboard-page">
      <section className="task-summary-grid">
        {summary.map((item) => (
          <article key={item.label} className={`task-summary-card tone-${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="task-dashboard-layout">
        <div className="task-dashboard-main">
          <section className="task-dashboard-panel task-management-panel">
            <div className="task-dashboard-panel-head">
              <div>
                <h2>任务管理</h2>

              </div>
              <div className="task-view-toggle">
                <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => handleViewModeChange('table')}>表格视图</button>
                <button type="button" className={viewMode === 'board' ? 'active' : ''} onClick={() => handleViewModeChange('board')}>看板视图</button>
                <button type="button" className={viewMode === 'calendar' ? 'active' : ''} onClick={() => handleViewModeChange('calendar')}>日历视图</button>
              </div>
            </div>

            <TaskFilterBar filters={filters} onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))} onCreate={() => { setSubmitError(''); setEditingTask(null); setModalOpen(true); }} />

            {toast ? <div className={`task-feedback-toast ${toast.tone}`}>{toast.text}</div> : null}
            {error ? <div className="task-state-block error">{error}</div> : null}

            {viewMode === 'table' ? (
              <>
                <TaskTable
                  tasks={tasks}
                  loading={loading}
                  updating={pageUpdating}
                  onEdit={(task) => { setSubmitError(''); setEditingTask(task); setModalOpen(true); }}
                  onView={(task) => setDetailTask(task)}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onCreate={() => { setSubmitError(''); setEditingTask(null); setModalOpen(true); }}
                />
                <TaskPagination
                  page={filters.page}
                  totalPages={totalPages}
                  updating={pageUpdating}
                  onChange={(page) => setFilters((current) => ({ ...current, page }))}
                />
              </>
            ) : viewMode === 'board' ? (
              <TaskBoard tasks={tasks} onView={(task) => setDetailTask(task)} />
            ) : (
              <TaskCalendar tasks={allTasks} />
            )}
          </section>
        </div>

        <aside className="task-dashboard-side">
          <TaskReminderPanel tasks={allTasks} />
          <AiWeeklyReview tasks={allTasks} activities={activities} />
          <AiTaskPlanner onImport={handleImportDrafts} />
        </aside>
      </section>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        submitting={submitting}
        submitError={submitError}
        onClose={() => {
          if (submitting) return;
          setSubmitError('');
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmit}
      />

      {deletingTask ? (
        <div className="task-modal-backdrop">
          <div className="task-modal task-confirm-modal">
            <div className="task-modal-head">
              <div>
                <h3>确认删除任务</h3>
                <p>删除后不可恢复，请确认是否继续。</p>
              </div>
              <button type="button" onClick={() => setDeletingTask(null)}>×</button>
            </div>
            <div className="task-modal-form">
              <div className="task-confirm-body">
                <strong>{deletingTask.title}</strong>
                <p>{deletingTask.description || '这条任务没有补充描述。'}</p>
              </div>
              <div className="task-modal-actions">
                <button type="button" onClick={() => setDeletingTask(null)}>取消</button>
                <button className="task-action-btn delete" type="button" onClick={() => void confirmDelete()}>确认删除</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <TaskDetailDrawer open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} onTaskUpdate={handleDetailUpdate} />
    </section>
  );
}

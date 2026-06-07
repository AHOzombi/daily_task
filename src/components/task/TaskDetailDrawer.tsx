import { useEffect, useState } from 'react';
import { ACTIVITY_API } from '../../services/task-api';
import type { TaskActivityRecord } from '../../types/activity';
import type { TaskRecord } from '../../types/task';

type Props = {
  task: TaskRecord | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdate: (task: TaskRecord) => void;
};

function actionText(action: TaskActivityRecord['action']) {
  return { create: '新建', update: '编辑', delete: '删除', status_change: '状态变更' }[action];
}

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
] as const;

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
] as const;

export function TaskDetailDrawer({ task, open, onClose, onTaskUpdate }: Props) {
  const [activities, setActivities] = useState<TaskActivityRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [review, setReview] = useState('');
  const [status, setStatus] = useState<TaskRecord['status']>('pending');
  const [priority, setPriority] = useState<TaskRecord['priority']>('medium');
  const [localSubtasks, setLocalSubtasks] = useState(task?.subtasks ?? []);

  useEffect(() => {
    if (!open || !task) return;
    setNotes(task.notes);
    setReview(task.review);
    setStatus(task.status);
    setPriority(task.priority);
    setLocalSubtasks(task.subtasks);
    setEditing(false);
    let active = true;
    fetch(ACTIVITY_API)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const rows = (data.data ?? []) as TaskActivityRecord[];
        setActivities(rows.filter((item) => item.taskId === task.id));
      });
    return () => { active = false; };
  }, [open, task]);

  if (!open || !task) return null;

  function handleSubtaskToggle(id: string) {
    setLocalSubtasks((prev) =>
      prev.map((s) => s.id === id ? { ...s, done: !s.done } : s)
    );
  }

  function handleSave() {
    if (!task) return;
    const updated: TaskRecord = {
      ...task,
      notes,
      review,
      status,
      priority,
      subtasks: localSubtasks,
      updatedAt: new Date().toISOString()
    };
    onTaskUpdate(updated);
    setEditing(false);
  }

  function handleCancel() {
    if (!task) return;
    setNotes(task.notes);
    setReview(task.review);
    setStatus(task.status);
    setPriority(task.priority);
    setLocalSubtasks(task.subtasks);
    setEditing(false);
  }

  return (
    <div className="task-drawer-backdrop" onClick={onClose}>
      <aside className="task-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="task-drawer-head">
          <div>
            <h3>{task.title}</h3>
            <p>任务详情</p>
          </div>
          <div className="task-drawer-head-actions">
            {editing ? (
              <>
                <button type="button" onClick={handleCancel}>取消</button>
                <button type="button" className="task-primary-btn" onClick={handleSave}>保存修改</button>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)}>编辑</button>
            )}
            <button type="button" onClick={onClose}>关闭</button>
          </div>
        </div>

        <div className="task-drawer-body">
          <div className="task-drawer-section">
            <span>任务描述</span>
            <p>{task.description || '暂无描述'}</p>
          </div>

          <div className="task-drawer-grid">
            <div className="task-drawer-field">
              <span>状态</span>
              {editing ? (
                <select value={status} onChange={(e) => setStatus(e.target.value as TaskRecord['status'])}>
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <strong>{statusOptions.find((o) => o.value === task.status)?.label}</strong>
              )}
            </div>
            <div className="task-drawer-field">
              <span>优先级</span>
              {editing ? (
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskRecord['priority'])}>
                  {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <strong>{priorityOptions.find((o) => o.value === task.priority)?.label}</strong>
              )}
            </div>
            <div className="task-drawer-field">
              <span>截止时间</span>
              <strong>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '未设置'}</strong>
            </div>
            <div className="task-drawer-field">
              <span>更新时间</span>
              <strong>{new Date(task.updatedAt).toLocaleString('zh-CN')}</strong>
            </div>
            <div className="task-drawer-field">
              <span>所属项目</span>
              <strong>{task.project}</strong>
            </div>
            <div className="task-drawer-field">
              <span>标签</span>
              <strong>{task.tags.length ? task.tags.join('、') : '未设置'}</strong>
            </div>
          </div>

          <div className="task-drawer-section">
            <span>子任务 {localSubtasks.length > 0 ? `(${localSubtasks.filter((s) => s.done).length}/${localSubtasks.length})` : ''}</span>
            <div className="task-drawer-subtasks">
              {localSubtasks.length > 0 ? localSubtasks.map((item) => (
                <label key={item.id} className={`task-subtask-row ${item.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleSubtaskToggle(item.id)}
                    disabled={!editing}
                  />
                  <span>{item.title}</span>
                </label>
              )) : <p>暂无子任务。</p>}
            </div>
          </div>

          <div className="task-drawer-section">
            <span>过程备注</span>
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="填写过程备注，记录执行中的关键信息"
                rows={4}
              />
            ) : (
              <p className="task-drawer-text">{notes || '暂无过程备注。'}</p>
            )}
          </div>

          <div className="task-drawer-section">
            <span>复盘结论</span>
            {editing ? (
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="填写复盘结论，总结经验与教训"
                rows={4}
              />
            ) : (
              <p className="task-drawer-text">{review || '暂无复盘结论。'}</p>
            )}
          </div>

          <div className="task-drawer-section">
            <span>相关活动</span>
            <div className="task-drawer-activity-list">
              {activities.length > 0 ? activities.map((item) => (
                <article key={item.id} className="task-drawer-activity-item">
                  <div>
                    <strong>{actionText(item.action)}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <time>{new Date(item.createdAt).toLocaleString('zh-CN')}</time>
                </article>
              )) : <p>暂无相关活动记录。</p>}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

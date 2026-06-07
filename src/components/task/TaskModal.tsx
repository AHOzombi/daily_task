import { useEffect, useMemo, useState } from 'react';
import { TaskDatePicker } from './TaskDatePicker';
import { TaskSelect } from './TaskSelect';
import type { CreateTaskInput, TaskPriority, TaskProject, TaskRecord, TaskStatus, TaskTag, TaskSubtask } from '../../types/task';

type Props = {
  open: boolean;
  task?: TaskRecord | null;
  submitting?: boolean;
  submitError?: string;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void> | void;
};

function getDefaultState(): CreateTaskInput {
  const now = new Date();
  const defaultProject: TaskProject = now.getHours() >= 18 ? '阅读复盘' : 'Task系统';
  const defaultTag: TaskTag[] = defaultProject === '阅读复盘' ? ['复盘'] : [];

  return {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: null,
    tags: defaultTag,
    project: defaultProject,
    subtasks: [],
    notes: '',
    review: ''
  };
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
];

const tagOptions: TaskTag[] = ['工作', '学习', '生活', 'AI Agent', '自动化', '复盘'];
const projectOptions: Array<{ value: TaskProject; label: string }> = [
  { value: 'Task系统', label: 'Task系统' },
  { value: 'OpenClaw', label: 'OpenClaw' },
  { value: '自动化实验', label: '自动化实验' },
  { value: '阅读复盘', label: '阅读复盘' },
  { value: '个人事务', label: '个人事务' }
];

export function TaskModal({ open, task, submitting = false, submitError = '', onClose, onSubmit }: Props) {
  const defaultState = useMemo(() => getDefaultState(), [open]);
  const [form, setForm] = useState<CreateTaskInput>(defaultState);
  const [validationError, setValidationError] = useState('');
  const isEditing = Boolean(task);

  useEffect(() => {
    if (!open) {
      setValidationError('');
      return;
    }

    setValidationError('');
    setForm(task ? {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags,
      project: task.project,
      subtasks: task.subtasks,
      notes: task.notes,
      review: task.review
    } : defaultState);
  }, [defaultState, open, task]);

  async function handleSubmit() {
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setValidationError('任务标题不能为空');
      return;
    }

    if (submitting) return;

    setValidationError('');
    try {
      await onSubmit({
        ...form,
        title: trimmedTitle,
        description: form.description.trim(),
        notes: form.notes.trim(),
        review: form.review.trim()
      });
    } catch {
      // submitError 由上层展示
    }
  }

  function handleClose() {
    if (submitting) return;
    setValidationError('');
    onClose();
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function addSubtask() {
    setForm((current) => ({
      ...current,
      subtasks: [
        ...current.subtasks,
        { id: `subtask-${Date.now()}`, title: '', done: false }
      ]
    }));
  }

  function removeSubtask(id: string) {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.filter((s) => s.id !== id)
    }));
  }

  function updateSubtaskTitle(id: string, title: string) {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((s) => s.id === id ? { ...s, title } : s)
    }));
  }

  function toggleSubtaskDone(id: string) {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((s) => s.id === id ? { ...s, done: !s.done } : s)
    }));
  }

  if (!open) return null;

  const doneCount = form.subtasks.filter((s) => s.done).length;

  return (
    <div className="task-modal-backdrop" onClick={handleClose}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-modal-head">
          <div>
            <h3>{isEditing ? '编辑任务' : '新建任务'}</h3>
            <p>{isEditing ? '修改已有任务内容，保存后会立即刷新。' : '支持 Ctrl/Cmd + Enter 快速保存。'}</p>
          </div>
          <button type="button" onClick={handleClose} disabled={submitting}>关闭</button>
        </div>

        <div className="task-modal-form">
          <input
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (validationError) setValidationError('');
            }}
            onKeyDown={handleTitleKeyDown}
            placeholder="任务标题（必填）"
            disabled={submitting}
          />

          {validationError ? <div className="task-state-block error">{validationError}</div> : null}
          {submitError ? <div className="task-state-block error">{submitError}</div> : null}

          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onKeyDown={handleTextareaKeyDown}
            placeholder="任务描述"
            rows={4}
            disabled={submitting}
          />

          <TaskSelect value={form.status} options={statusOptions} onChange={(status) => setForm({ ...form, status })} disabled={submitting} />
          <TaskSelect value={form.priority} options={priorityOptions} onChange={(priority) => setForm({ ...form, priority })} disabled={submitting} />
          <TaskDatePicker value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} disabled={submitting} />
          <TaskSelect value={form.project} options={projectOptions} onChange={(project) => setForm({ ...form, project })} disabled={submitting} />

          <div className="task-quick-picks">
            {projectOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={submitting}
                className={`task-quick-pick ${form.project === item.value ? 'active' : ''}`}
                onClick={() => setForm((current) => ({ ...current, project: item.value }))}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="task-subtask-editor">
            <div className="task-subtask-editor-head">
              <span>子任务 {form.subtasks.length > 0 ? `(${doneCount}/${form.subtasks.length})` : ''}</span>
              <button type="button" onClick={addSubtask} disabled={submitting}>+ 添加子任务</button>
            </div>
            {form.subtasks.length > 0 ? (
              <div className="task-subtask-list">
                {form.subtasks.map((s) => (
                  <div key={s.id} className="task-subtask-row-inline">
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() => toggleSubtaskDone(s.id)}
                      disabled={submitting}
                    />
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => updateSubtaskTitle(s.id, e.target.value)}
                      placeholder="子任务描述"
                      disabled={submitting}
                    />
                    <button type="button" onClick={() => removeSubtask(s.id)} disabled={submitting}>×</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            onKeyDown={handleTextareaKeyDown}
            placeholder="过程备注"
            rows={3}
            disabled={submitting}
          />

          <textarea
            value={form.review}
            onChange={(e) => setForm({ ...form, review: e.target.value })}
            onKeyDown={handleTextareaKeyDown}
            placeholder="复盘结论"
            rows={3}
            disabled={submitting}
          />

          <div className="task-tag-picker">
            {tagOptions.map((tag) => {
              const active = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`task-tag-toggle ${active ? 'active' : ''}`}
                  disabled={submitting}
                  onClick={() => setForm((current) => ({
                    ...current,
                    tags: active ? current.tags.filter((item) => item !== tag) : [...current.tags, tag]
                  }))}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="task-modal-actions">
            <button type="button" onClick={handleClose} disabled={submitting}>取消</button>
            <button className="task-primary-btn" type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

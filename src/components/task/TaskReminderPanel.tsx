import { useMemo, useState } from 'react';
import type { TaskRecord } from '../../types/task';

type Props = {
  tasks: TaskRecord[];
};

type ReminderDraft = {
  id: string;
  title: string;
  suggestion: string;
  level: 'high' | 'medium';
};

function buildReminderDrafts(tasks: TaskRecord[]): ReminderDraft[] {
  const now = Date.now();
  const drafts: ReminderDraft[] = [];

  tasks.forEach((task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return;
    const due = new Date(task.dueDate).getTime();
    const diff = due - now;
    if (diff <= 0) {
      drafts.push({ id: `${task.id}-overdue`, title: task.title, suggestion: `任务已逾期，建议立即处理：${task.title}`, level: 'high' });
      return;
    }
    if (diff <= 2 * 60 * 60 * 1000) {
      drafts.push({ id: `${task.id}-soon`, title: task.title, suggestion: `任务将在 2 小时内到期，建议发送临近到期提醒：${task.title}`, level: 'high' });
      return;
    }
    if (diff <= 24 * 60 * 60 * 1000) {
      drafts.push({ id: `${task.id}-today`, title: task.title, suggestion: `任务将在 24 小时内到期，可加入今日提醒列表：${task.title}`, level: 'medium' });
    }
  });

  return drafts;
}

export function TaskReminderPanel({ tasks }: Props) {
  const drafts = useMemo(() => buildReminderDrafts(tasks), [tasks]);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <section className="task-dashboard-panel reminder-panel">
      <div className="task-dashboard-panel-head collapsible" onClick={() => setCollapsed((v) => !v)}>
        <div>
          <h2>提醒联动草案</h2>
          <p>基于截止时间与任务状态生成提醒建议，为后续接 OpenClaw cron 做准备。</p>
        </div>
        <button
          type="button"
          className={`collapse-btn ${collapsed ? 'collapsed' : ''}`}
          onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
        >
          {collapsed ? '▶' : '▼'}
        </button>
      </div>

      {collapsed ? null : (
        <>
          {drafts.length ? (
            <div className="reminder-draft-list">
              {drafts.map((item) => (
                <article key={item.id} className={`reminder-draft-card ${item.level}`}>
                  <strong>{item.title}</strong>
                  <p>{item.suggestion}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="task-state-block">当前没有需要提醒的任务。</div>
          )}
        </>
      )}
    </section>
  );
}

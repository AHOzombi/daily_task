import { useMemo } from 'react';
import type { TaskRecord } from '../../types/task';

type Props = {
  tasks: TaskRecord[];
};

type PrioritySuggestion = {
  id: string;
  title: string;
  score: number;
  reason: string;
};

function computeScore(task: TaskRecord) {
  let score = 0;
  const now = Date.now();
  if (task.status === 'completed' || task.status === 'cancelled') return -1;
  if (task.priority === 'urgent') score += 40;
  if (task.priority === 'high') score += 28;
  if (task.status === 'in_progress') score += 18;
  if (task.dueDate) {
    const diff = new Date(task.dueDate).getTime() - now;
    if (diff <= 0) score += 50;
    else if (diff <= 2 * 60 * 60 * 1000) score += 35;
    else if (diff <= 24 * 60 * 60 * 1000) score += 20;
  }
  if (task.subtasks.length) {
    const done = task.subtasks.filter((item) => item.done).length;
    const ratio = done / task.subtasks.length;
    if (ratio < 0.4) score += 10;
    else if (ratio < 1) score += 6;
  }
  return score;
}

function buildSuggestions(tasks: TaskRecord[]): PrioritySuggestion[] {
  return tasks
    .map((task) => {
      const score = computeScore(task);
      return {
        id: task.id,
        title: task.title,
        score,
        reason: [
          task.priority === 'urgent' ? '紧急优先级' : null,
          task.priority === 'high' ? '高优先级' : null,
          task.status === 'in_progress' ? '已在进行中' : null,
          task.dueDate && new Date(task.dueDate).getTime() <= Date.now() ? '已逾期' : null,
          task.dueDate && new Date(task.dueDate).getTime() > Date.now() && new Date(task.dueDate).getTime() - Date.now() <= 24 * 60 * 60 * 1000 ? '临近到期' : null
        ].filter(Boolean).join(' / ') || '常规建议'
      };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function AiPriorityPanel({ tasks }: Props) {
  const suggestions = useMemo(() => buildSuggestions(tasks), [tasks]);

  return (
    <section className="task-dashboard-panel priority-panel">
      <div className="task-dashboard-panel-head">
        <div>
          <h2>AI 优先级建议</h2>
          <p>基于截止时间、状态、优先级、逾期情况和子任务进度给出当前最值得优先处理的事项。</p>
        </div>
      </div>

      {suggestions.length ? (
        <div className="priority-suggestion-list">
          {suggestions.map((item, index) => (
            <article key={item.id} className="priority-suggestion-card">
              <div>
                <span className="priority-rank">建议 #{index + 1}</span>
                <strong>{item.title}</strong>
                <p>{item.reason}</p>
              </div>
              <div className="priority-score">{item.score}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="task-state-block">当前没有需要特别优先推进的任务。</div>
      )}
    </section>
  );
}

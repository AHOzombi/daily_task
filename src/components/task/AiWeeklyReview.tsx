import { useState } from 'react';
import type { TaskActivityRecord } from '../../types/activity';
import type { TaskRecord } from '../../types/task';

type Props = {
  tasks: TaskRecord[];
  activities: TaskActivityRecord[];
};

function buildSummary(tasks: TaskRecord[], activities: TaskActivityRecord[]) {
  const completed = tasks.filter((task) => task.status === 'completed');
  const inProgress = tasks.filter((task) => task.status === 'in_progress');
  const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'completed');
  const latestActivities = activities.slice(0, 5);

  return {
    headline: `本期共追踪 ${tasks.length} 项任务，已完成 ${completed.length} 项，进行中 ${inProgress.length} 项。`,
    completed: completed.slice(0, 5).map((task) => `- ${task.title}`),
    focus: inProgress.slice(0, 5).map((task) => `- ${task.title}`),
    risks: overdue.length ? overdue.slice(0, 5).map((task) => `- ${task.title}（已逾期）`) : ['- 当前无明显逾期风险'],
    activities: latestActivities.length ? latestActivities.map((item) => `- ${item.taskTitle}：${item.detail}`) : ['- 当前暂无活动记录'],
    review: tasks.filter((task) => task.review.trim()).slice(0, 3).map((task) => `- ${task.title}：${task.review}`)
  };
}

export function AiWeeklyReview({ tasks, activities }: Props) {
  const [generated, setGenerated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const summary = buildSummary(tasks, activities);

  return (
    <section className="task-dashboard-panel ai-review-panel">
      <div className="task-dashboard-panel-head collapsible" onClick={() => setCollapsed((v) => !v)}>
        <div>
          <h2>AI 周报 / 复盘生成</h2>
          <p>基于当前任务、活动记录、备注与复盘字段自动整理阶段总结。</p>
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
          <div className="ai-planner-actions">
            {generated ? (
              <button type="button" onClick={() => setGenerated(false)}>收起总结</button>
            ) : (
              <button type="button" className="task-primary-btn" onClick={() => setGenerated(true)}>生成总结草案</button>
            )}
          </div>

          {generated ? (
            <article className="ai-review-card">
              <h3>本期总结</h3>
              <p>{summary.headline}</p>
              <section>
                <strong>已完成事项</strong>
                <div>{summary.completed.join('\n')}</div>
              </section>
              <section>
                <strong>当前重点</strong>
                <div>{summary.focus.length ? summary.focus.join('\n') : '- 当前无进行中任务'}</div>
              </section>
              <section>
                <strong>风险提示</strong>
                <div>{summary.risks.join('\n')}</div>
              </section>
              <section>
                <strong>最近活动</strong>
                <div>{summary.activities.join('\n')}</div>
              </section>
              <section>
                <strong>复盘摘录</strong>
                <div>{summary.review.length ? summary.review.join('\n') : '- 当前暂无复盘内容'}</div>
              </section>
            </article>
          ) : null}
        </>
      )}
    </section>
  );
}

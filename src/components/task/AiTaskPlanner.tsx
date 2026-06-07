import { useMemo, useState } from 'react';
import type { CreateTaskInput, TaskProject, TaskTag } from '../../types/task';

type DraftTask = CreateTaskInput & {
  key: string;
};

type Props = {
  onImport: (tasks: CreateTaskInput[]) => Promise<void> | void;
};

const projectOptions: TaskProject[] = ['Task系统', 'OpenClaw', '自动化实验', '阅读复盘', '个人事务'];
const tagOptions: TaskTag[] = ['工作', '学习', '生活', 'AI Agent', '自动化', '复盘'];

function inferProject(goal: string): TaskProject {
  const lower = goal.toLowerCase();
  if (lower.includes('openclaw')) return 'OpenClaw';
  if (lower.includes('复盘') || lower.includes('阅读')) return '阅读复盘';
  if (lower.includes('自动化') || lower.includes('workflow')) return '自动化实验';
  if (lower.includes('task')) return 'Task系统';
  return '个人事务';
}

function inferTags(goal: string): TaskTag[] {
  const tags: TaskTag[] = [];
  const lower = goal.toLowerCase();
  if (lower.includes('agent')) tags.push('AI Agent');
  if (lower.includes('自动化')) tags.push('自动化');
  if (lower.includes('复盘') || lower.includes('阅读')) tags.push('复盘');
  if (!tags.length) tags.push('工作');
  return tags;
}

function buildDrafts(goal: string): DraftTask[] {
  const trimmed = goal.trim();
  if (!trimmed) return [];
  const project = inferProject(trimmed);
  const tags = inferTags(trimmed);
  const base = [
    `明确目标与范围：${trimmed}`,
    '拆分核心模块与关键流程',
    '确定数据结构 / 接口边界',
    '完成第一轮实现',
    '验证结果并整理后续优化点'
  ];

  return base.map((title, index) => ({
    key: `draft-${index}`,
    title,
    description: `由 AI 拆解目标"${trimmed}"生成的任务草案。`,
    status: 'pending',
    priority: index < 2 ? 'high' : 'medium',
    dueDate: null,
    tags,
    project,
    subtasks: [],
    notes: 'AI 拆解草案，可继续手动调整。',
    review: ''
  }));
}

export function AiTaskPlanner({ onImport }: Props) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<DraftTask[]>([]);
  const [collapsed, setCollapsed] = useState(true);

  const canGenerate = useMemo(() => goal.trim().length > 0, [goal]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const drafts = buildDrafts(goal);
      setGenerated(drafts);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!generated.length) return;
    setLoading(true);
    try {
      await onImport(generated.map(({ key, ...rest }) => rest));
      setGenerated([]);
      setGoal('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="task-dashboard-panel ai-planner-panel">
      <div className="task-dashboard-panel-head collapsible" onClick={() => setCollapsed((v) => !v)}>
        <div>
          <h2>AI 任务拆解</h2>
          <p>输入一个目标，系统会先生成一版结构化任务草案。</p>
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
        <div className="ai-planner-form">
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="例如：做一个 OpenClaw 控制台，支持任务管理、活动记录和提醒能力"
            rows={4}
          />
          <div className="ai-planner-actions">
            <button type="button" className="task-primary-btn" disabled={!canGenerate || loading} onClick={handleGenerate}>
              {loading ? '生成中…' : '生成任务草案'}
            </button>
            <button type="button" disabled={!generated.length || loading} onClick={handleImport}>
              一键导入任务
            </button>
          </div>
        </div>

        {generated.length ? (
          <div className="ai-planner-list">
            {generated.map((item) => (
              <article key={item.key} className="task-board-card">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <div className="task-board-meta">
                  <span>{item.project}</span>
                  {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </>
      )}
    </section>
  );
}

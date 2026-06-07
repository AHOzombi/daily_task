import { useState } from 'react';
import type { TaskFilters, TaskPriority, TaskProject, TaskStatus, TaskTag } from '../../types/task';

type Props = {
  filters: TaskFilters;
  onChange: (patch: Partial<TaskFilters>) => void;
  onCreate: () => void;
};

const statusOptions: Array<{ value: TaskStatus | 'all' | 'active'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '进行中' },
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中（仅）' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];
const priorityOptions: Array<{ value: TaskPriority | 'all'; label: string }> = [
  { value: 'all', label: '全部优先级' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
];
const tagOptions: Array<{ value: TaskTag | 'all'; label: string }> = [
  { value: 'all', label: '全部标签' },
  { value: '工作', label: '工作' },
  { value: '学习', label: '学习' },
  { value: '生活', label: '生活' },
  { value: 'AI Agent', label: 'AI Agent' },
  { value: '自动化', label: '自动化' },
  { value: '复盘', label: '复盘' }
];
const projectOptions: Array<{ value: TaskProject | 'all'; label: string }> = [
  { value: 'all', label: '全部项目' },
  { value: 'Task系统', label: 'Task系统' },
  { value: 'OpenClaw', label: 'OpenClaw' },
  { value: '自动化实验', label: '自动化实验' },
  { value: '阅读复盘', label: '阅读复盘' },
  { value: '个人事务', label: '个人事务' }
];

export function TaskFilterBar({ filters, onChange, onCreate }: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="task-filter-bar">
      <input
        value={filters.keyword}
        onChange={(event) => onChange({ keyword: event.target.value, page: 1 })}
        placeholder="搜索任务标题或描述"
        className="filter-search"
      />

      <select value={filters.status} onChange={(event) => onChange({ status: event.target.value as TaskFilters['status'], page: 1 })}>
        {statusOptions.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>

      <select value={filters.project} onChange={(event) => onChange({ project: event.target.value as TaskFilters['project'], page: 1 })}>
        {projectOptions.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>

      <button
        type="button"
        className={`filter-more-btn ${showMore ? 'active' : ''}`}
        onClick={() => setShowMore((v) => !v)}
      >
        {showMore ? '收起筛选' : '更多筛选'}
      </button>

      <button className="task-primary-btn" type="button" onClick={onCreate}>新建任务</button>

      {showMore && (
        <div className="filter-more-panel">
          <select value={filters.priority} onChange={(event) => onChange({ priority: event.target.value as TaskFilters['priority'], page: 1 })}>
            {priorityOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select value={filters.tag} onChange={(event) => onChange({ tag: event.target.value as TaskFilters['tag'], page: 1 })}>
            {tagOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}

import type { TaskRecord } from '../../types/task';

type Props = {
  tasks: TaskRecord[];
  onView: (task: TaskRecord) => void;
};

const columns: Array<{ key: TaskRecord['status']; title: string }> = [
  { key: 'pending', title: '待处理' },
  { key: 'in_progress', title: '进行中' },
  { key: 'completed', title: '已完成' },
  { key: 'cancelled', title: '已取消' }
];

export function TaskBoard({ tasks, onView }: Props) {
  return (
    <section className="task-board">
      {columns.map((column) => {
        const items = tasks.filter((task) => task.status === column.key);
        return (
          <article key={column.key} className="task-board-column">
            <header className="task-board-column-head">
              <h3>{column.title}</h3>
              <span>{items.length}</span>
            </header>
            <div className="task-board-list">
              {items.length ? items.map((task) => (
                <button key={task.id} type="button" className="task-board-card" onClick={() => onView(task)}>
                  <strong>{task.title}</strong>
                  <p>{task.description || '暂无描述'}</p>
                  <div className="task-board-meta">
                    <span>{task.project}</span>
                    <span>{task.tags.join(' / ') || '无标签'}</span>
                    <span>进度 {task.subtasks.filter((item) => item.done).length}/{task.subtasks.length}</span>
                  </div>
                </button>
              )) : <div className="task-state-block">暂无任务</div>}
            </div>
          </article>
        );
      })}
    </section>
  );
}

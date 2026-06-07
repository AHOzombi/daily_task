import { useEffect, useMemo, useState } from 'react';
import { TaskPagination } from '../components/task/TaskPagination';
import { taskApi } from '../services/task-api';
import type { TaskRecord } from '../types/task';

const PAGE_SIZE = 5;

export function TaskListPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    void taskApi.getAll().then((data) => {
      if (!active) return;
      setTasks(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
  const pagedTasks = useMemo(() => tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, tasks]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="task-dashboard-panel">
      <div className="task-dashboard-panel-head">
        <div>
          <h2>任务列表</h2>
          <p>这里展示当前全部任务，方便快速浏览。</p>
        </div>
      </div>

      {loading ? <div className="task-state-block">任务加载中…</div> : (
        <>
          <div className="task-dashboard-list">
            {pagedTasks.map((task) => (
              <article key={task.id} className="task-dashboard-item">
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                </div>
                <div className="task-dashboard-meta">
                  <span>{task.status}</span>
                  <span>{task.priority}</span>
                  <span>{task.project}</span>
                  {task.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
          <TaskPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}

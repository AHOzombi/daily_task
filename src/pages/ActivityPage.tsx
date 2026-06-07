import { useEffect, useMemo, useState } from 'react';
import { TaskPagination } from '../components/task/TaskPagination';
import { ACTIVITY_API } from '../services/task-api';
import type { TaskActivityRecord } from '../types/activity';

const PAGE_SIZE = 5;

function actionText(action: TaskActivityRecord['action']) {
  return { create: '新建', update: '编辑', delete: '删除', status_change: '状态变更' }[action];
}

export function ActivityPage() {
  const [items, setItems] = useState<TaskActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    fetch(ACTIVITY_API).then((r) => r.json()).then((data) => {
      if (!active) return;
      setItems(data.data ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="task-dashboard-panel">
      <div className="task-dashboard-panel-head">
        <div>
          <h2>活动记录</h2>
          <p>这里展示任务创建、编辑、删除等真实操作日志。</p>
        </div>
      </div>
      {loading ? <div className="task-state-block">活动记录加载中…</div> : (
        <>
          <div className="task-dashboard-list">
            {items.length ? pagedItems.map((item) => (
              <article key={item.id} className="task-dashboard-item">
                <div>
                  <h3>{item.taskTitle}</h3>
                  <p>{item.detail}</p>
                </div>
                <div className="task-dashboard-meta">
                  <span>{actionText(item.action)}</span>
                  <span>{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </article>
            )) : <div className="task-state-block">还没有活动记录。</div>}
          </div>
          {items.length ? <TaskPagination page={page} totalPages={totalPages} onChange={setPage} /> : null}
        </>
      )}
    </section>
  );
}

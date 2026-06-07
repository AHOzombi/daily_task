import type { TaskRecord } from '../../types/task';

type Props = {
  tasks: TaskRecord[];
  loading: boolean;
  updating?: boolean;
  onEdit: (task: TaskRecord) => void;
  onView: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  onStatusChange: (id: string, status: TaskRecord['status']) => void;
  onCreate: () => void;
};

function nextStatus(status: TaskRecord['status']) {
  if (status === 'pending') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return status;
}

function statusLabel(status: TaskRecord['status']) {
  return {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }[status];
}

function priorityLabel(priority: TaskRecord['priority']) {
  return {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }[priority];
}

function dueStateLabel(task: TaskRecord) {
  if (!task.dueDate) return { text: '未设置', tone: 'normal' };
  if (task.status === 'completed') return { text: '已完成', tone: 'done' };
  const due = new Date(task.dueDate);
  const now = new Date();
  const sameDay = due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
  if (due.getTime() < now.getTime()) return { text: '已逾期', tone: 'overdue' };
  if (sameDay) return { text: '今日到期', tone: 'today' };
  return { text: '未到期', tone: 'normal' };
}

export function TaskTable({ tasks, loading, updating = false, onEdit, onView, onDelete, onStatusChange, onCreate }: Props) {
  if (loading && !tasks.length) return <div className="task-state-block">任务加载中…</div>;

  if (!tasks.length) {
    return (
      <div className="task-empty-state">
        <div className="task-empty-icon">📋</div>
        <h3>暂无任务</h3>
        <p>当前筛选条件下没有匹配的任务</p>
        <button type="button" className="task-primary-btn" onClick={onCreate}>新建第一个任务</button>
      </div>
    );
  }

  return (
    <section className={`task-table-wrap ${updating ? 'updating' : ''}`}>
      {updating ? <div className="task-table-overlay">正在切换分页…</div> : null}
      <table className="task-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>优先级</th>
            <th>截止时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const upcoming = nextStatus(task.status);
            const dueMeta = dueStateLabel(task);
            return (
              <tr key={task.id}>
                <td>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                  <p>子任务：{task.subtasks.filter((item) => item.done).length}/{task.subtasks.length}</p>
                </td>
                <td><span className={`task-chip status-${task.status}`}>{statusLabel(task.status)}</span></td>
                <td><span className={`task-chip priority-${task.priority}`}>{priorityLabel(task.priority)}</span></td>
                <td>
                  <div className="task-due-cell">
                    <strong>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '—'}</strong>
                    <span className={`task-due-badge ${dueMeta.tone}`}>{dueMeta.text}</span>
                  </div>
                </td>
                <td>
                  <div className="task-table-actions">
                    <button className="task-action-btn view" type="button" onClick={() => onView(task)}>详情</button>
                    <button className="task-action-btn edit" type="button" onClick={() => onEdit(task)}>编辑</button>
                    <button className="task-action-btn delete" type="button" onClick={() => onDelete(task)}>删除</button>
                    {upcoming !== task.status ? <button className="task-action-btn advance" type="button" onClick={() => onStatusChange(task.id, upcoming)}>推进到{statusLabel(upcoming)}</button> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

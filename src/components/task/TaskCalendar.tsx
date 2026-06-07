import type { TaskRecord } from '../../types/task';

type Props = {
  tasks: TaskRecord[];
};

function buildMonthDays(base: Date) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const pad = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function TaskCalendar({ tasks }: Props) {
  const now = new Date();
  const cells = buildMonthDays(now);

  return (
    <section className="task-calendar">
      <div className="task-calendar-head">
        <h3>{now.getFullYear()} 年 {now.getMonth() + 1} 月</h3>
        <p>按截止日期查看任务分布</p>
      </div>
      <div className="task-calendar-weekdays">
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="task-calendar-grid">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="task-calendar-empty" />;
          const items = tasks.filter((task) => task.dueDate && sameDay(new Date(task.dueDate), date));
          const isToday = sameDay(date, now);
          return (
            <article key={date.toISOString()} className={`task-calendar-cell ${isToday ? 'today' : ''}`}>
              <div className="task-calendar-date">{date.getDate()}</div>
              <div className="task-calendar-items">
                {items.length ? items.map((task) => (
                  <div key={task.id} className="task-calendar-item">{task.title}</div>
                )) : <span className="task-calendar-none">—</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';

type Props = {
  value: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDisplay(value: string | null) {
  if (!value) return '选择截止日期';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function toIso(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)).toISOString();
}

export function TaskDatePicker({ value, disabled = false, onChange }: Props) {
  const selectedDate = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const startWeekday = (monthStart.getDay() + 6) % 7;
    const cells: Array<Date | null> = [];

    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  return (
    <div className="task-date-picker">
      <button
        type="button"
        className={`task-date-trigger ${value ? 'has-value' : ''}`}
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
      >
        <span>{formatDisplay(value)}</span>
        <strong>📅</strong>
      </button>

      {open ? (
        <div className="task-date-panel">
          <div className="task-date-head">
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} disabled={disabled}>‹</button>
            <strong>
              {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
            </strong>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} disabled={disabled}>›</button>
          </div>

          <div className="task-date-weekdays">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="task-date-grid">
            {days.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} className="task-date-empty" />;
              const selected = sameDay(date, selectedDate);
              const today = sameDay(date, new Date());
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={`task-date-cell ${selected ? 'selected' : ''} ${today ? 'today' : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    onChange(toIso(date));
                    setOpen(false);
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="task-date-actions">
            <button type="button" onClick={() => !disabled && onChange(null)} disabled={disabled}>清空</button>
            <button type="button" onClick={() => setOpen(false)} disabled={disabled}>关闭</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

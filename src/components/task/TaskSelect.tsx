import { useState } from 'react';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
};

export function TaskSelect<T extends string>({ value, options, placeholder, disabled = false, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.value === value);

  return (
    <div className="task-select">
      <button type="button" className={`task-select-trigger ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span>{current?.label ?? placeholder ?? '请选择'}</span>
        <strong>{open ? '▴' : '▾'}</strong>
      </button>

      {open ? (
        <div className="task-select-panel">
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`task-select-option ${item.value === value ? 'selected' : ''}`}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange(item.value);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

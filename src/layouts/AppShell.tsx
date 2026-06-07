import type { ReactNode } from 'react';

type AppShellProps = {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="task-shell">
      <aside className="task-sidebar">{sidebar}</aside>
      <section className="task-main-frame">
        <header className="task-topbar">{topbar}</header>
        <main className="task-content">{children}</main>
      </section>
    </div>
  );
}

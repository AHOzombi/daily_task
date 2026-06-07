import { useEffect, useMemo, useState } from 'react';
import { TaskDashboardPage } from './pages/TaskDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { WorkOrderPage } from './pages/WorkOrderPage';
import { GuestPromptModal } from './components/GuestPromptModal';
import { AppShell } from './layouts/AppShell';
import type { PublicUser } from './types/user';

type ViewKey = 'dashboard' | 'workorder';

function Sidebar({
  view,
  onChange,
  user,
  onLogout
}: {
  view: ViewKey;
  onChange: (view: ViewKey) => void;
  user: PublicUser | null;
  onLogout: () => void;
}) {
  return (
    <div className="task-sidebar-inner">
      <div className="task-brand">
        <div className="task-brand-mark">⚡</div>
        <div>
          <strong>Task</strong>
          <p>独立任务系统</p>
        </div>
      </div>

      <nav className="task-nav">
        <button className={`task-nav-item ${view === 'dashboard' ? 'active' : ''}`} type="button" onClick={() => onChange('dashboard')}>
          总览面板
        </button>
        <button className={`task-nav-item ${view === 'workorder' ? 'active' : ''}`} type="button" onClick={() => onChange('workorder')}>
          📋 工单记录
        </button>
      </nav>

      <section className="task-sidebar-card">
        <span>当前用户</span>
        <strong>{user?.username ?? '游客'}</strong>
        {user && (
          <button className="task-nav-item" type="button" onClick={onLogout} style={{ marginTop: 4, fontSize: 12 }}>
            退出登录
          </button>
        )}
      </section>

      <section className="task-sidebar-card">
        <span>当前阶段</span>
        <strong>界面体验优化中</strong>
        <p>下一步继续强化中文化表达、按钮反馈和整体可读性。</p>
      </section>
    </div>
  );
}

function Topbar({ view }: { view: ViewKey }) {
  const title = {
    dashboard: '总览',
    workorder: '工单记录'
  }[view];

  const description = {
    dashboard: '查看整体任务状态、统计信息和关键操作入口。',
    workorder: '运维工单快速记录、查询与报表导出。'
  }[view];

  return (
    <div className="task-topbar-inner">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('task_user');
    const token = localStorage.getItem('task_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored) as PublicUser);
      } catch {
        // ignore
      }
    }
    setAuthChecked(true);
  }, []);

  function handleLogin(_token: string, userData: { userId: string; username: string }) {
    const u: PublicUser = {
      id: userData.userId,
      username: userData.username,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('task_user', JSON.stringify(u));
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem('task_token');
    localStorage.removeItem('task_user');
    setUser(null);
  }

  function handleGuestLogin(userData: { userId: string; username: string }) {
    const u: PublicUser = {
      id: userData.userId,
      username: userData.username,
      createdAt: new Date().toISOString()
    };
    setUser(u);
  }

  const content = useMemo(() => {
    if (view === 'workorder') return <WorkOrderPage />;
    return (
      <TaskDashboardPage
        user={user}
        onPromptLogin={() => setGuestPromptOpen(true)}
      />
    );
  }, [view, user]);

  if (!authChecked) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-mark">⚡</div>
            <strong>Task</strong>
          </div>
          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>加载中…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <AppShell
        sidebar={<Sidebar view={view} onChange={setView} user={user} onLogout={handleLogout} />}
        topbar={<Topbar view={view} />}
      >
        <div key={view} className="view-page">
          {content}
        </div>
      </AppShell>

      <GuestPromptModal
        open={guestPromptOpen}
        onClose={() => setGuestPromptOpen(false)}
        onLogin={handleGuestLogin}
      />
    </>
  );
}

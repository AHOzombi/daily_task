import { useState } from 'react';
import { authApi } from '../services/auth-api';

interface Props {
  onLogin: (token: string, user: { userId: string; username: string }) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await authApi.login(username, password)
        : await authApi.register(username, password);
      localStorage.setItem('task_token', result.token);
      localStorage.setItem('task_user', JSON.stringify(result.user));
      onLogin(result.token, { userId: result.user.id, username: result.user.username });
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">⚡</div>
          <strong>Task</strong>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(''); }}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(''); }}
          >
            注册
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'register' ? '至少3位' : '输入用户名'}
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '至少6位' : '输入密码'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error ? <div className="login-error">{error}</div> : null}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="login-guest">
          <button type="button" onClick={() => onLogin('', { userId: '', username: '游客' })}>
            游客模式（不保存任务）
          </button>
        </div>
      </div>
    </div>
  );
}

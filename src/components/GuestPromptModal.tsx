import { useState } from 'react';
import { authApi } from '../services/auth-api';
import type { PublicUser } from '../types/user';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (user: { userId: string; username: string }) => void;
}

export function GuestPromptModal({ open, onClose, onLogin }: Props) {
  const [mode, setMode] = useState<'select' | 'login' | 'register'>('select');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function handleClose() {
    setMode('select');
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = mode === 'login'
        ? await authApi.login(username, password)
        : await authApi.register(username, password);
      localStorage.setItem('task_token', result.token);
      localStorage.setItem('task_user', JSON.stringify({ userId: result.user.id, username: result.user.username }));
      onLogin({ userId: result.user.id, username: result.user.username });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="task-modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="guest-prompt-modal">
        {mode === 'select' && (
          <div className="guest-prompt-content">
            <div className="guest-prompt-icon">📝</div>
            <h3>登录后可保存任务</h3>
            <p>注册只需 1 分钟，你的任务会安全保存在账号里，换设备也不丢失。</p>
            <div className="guest-prompt-actions">
              <button type="button" className="guest-btn primary" onClick={() => setMode('login')}>
                登录已有账号
              </button>
              <button type="button" className="guest-btn secondary" onClick={() => setMode('register')}>
                注册新账号
              </button>
              <button type="button" className="guest-btn ghost" onClick={handleClose}>
                稍后再说
              </button>
            </div>
          </div>
        )}

        {mode !== 'select' && (
          <form className="guest-prompt-form" onSubmit={handleSubmit}>
            <div className="guest-prompt-form-head">
              <button type="button" className="guest-back-btn" onClick={() => { setMode('select'); setError(''); }}>
                ← 返回
              </button>
              <h3>{mode === 'login' ? '登录账号' : '注册账号'}</h3>
            </div>
            <div className="login-field">
              <label htmlFor="guest-username">用户名</label>
              <input
                id="guest-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                autoComplete="username"
              />
            </div>
            <div className="login-field">
              <label htmlFor="guest-password">密码</label>
              <input
                id="guest-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少6位' : '输入密码'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {error ? <div className="login-error">{error}</div> : null}
            <button type="submit" className="guest-btn primary full" disabled={loading}>
              {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

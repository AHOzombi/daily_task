module.exports = {
  apps : [
    {
      name  : 'task-api',
      cwd   : '/root/.openclaw/workspace/apps/task',
      script: 'node',
      args  : '--import tsx --watch src/server/index.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name  : 'task-frontend',
      cwd   : '/root/.openclaw/workspace/apps/task',
      script: 'npx',
      args  : 'vite',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};

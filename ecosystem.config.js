module.exports = {
  apps: [
    {
      name: 'sync-live',
      script: '/home/dor/fifa/scripts/sync-live-loop.mjs',
      cwd: '/home/dor/fifa',
      autorestart: true,
      watch: false,
    },
    {
      name: 'mondial-2026',
      script: 'node_modules/.bin/next',
      args: 'start -p 3011',
      cwd: '/home/dor/fifa',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};

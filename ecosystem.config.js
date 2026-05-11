module.exports = {
  apps: [
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

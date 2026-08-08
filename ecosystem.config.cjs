module.exports = {
  apps: [
    {
      name: 'tradingbible-api',
      cwd: '/var/www/tradingbible/apps/api',
      script: 'src/main.js',
      interpreter: 'node',
      interpreter_args: '--env-file=.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};

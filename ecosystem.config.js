module.exports = {
  apps: [
    {
      name: 'Chess_API',
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 0,
      autorestart: true,
      max_restarts: 10,
      watch: false,
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

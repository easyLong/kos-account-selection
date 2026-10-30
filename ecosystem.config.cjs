module.exports = {
  apps: [
    {
      name: 'htf-kos-server',
      script: './server/prodServer.js',
      instances: 'max', // Utilize all available CPU cores on the server
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      }
    }
  ]
};

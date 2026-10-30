module.exports = {
  apps: [
    {
      name: 'htf-kos-server',
      script: './server/prodServer.js',
      instances: 'max', // 自动匹配服务器 CPU 核心数 (2核即启动2个高可用 Worker)
      exec_mode: 'cluster', // 集群多进程模式：实现自动负载均衡与无缝热重载
      max_memory_restart: '500M', // 针对 2核4G 服务器的最佳内存防护阈值，防内存泄漏
      restart_delay: 3000, // 异常退出后延迟 3 秒拉起，避免闪退死循环
      min_uptime: '5s', // 进程正常存活基准
      max_restarts: 15, // 连续异常最大重启保护
      time: true, // 日志自动添加 ISO 时间戳
      error_file: './logs/pm2-error.log', // 错误日志统一归档
      out_file: './logs/pm2-out.log', // 标准输出日志统一归档
      merge_logs: true, // 集群进程合并写入同一日志流
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      }
    }
  ]
};


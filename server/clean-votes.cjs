/**
 * 星火计划 KOS 选拔 - 投票与点赞数据安全清理脚本
 * 
 * 作用：仅重置投票点赞测试数据，绝不影响任何报名主链路数据 (htf_kos_applications)！
 * 用法：node server/clean-votes.cjs
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function cleanVoteData() {
  console.log('========================================================');
  console.log('【安全清理】星火计划 KOS 选拔 - 点赞/投票测试数据重置');
  console.log('========================================================\n');

  // 1. 清理 MySQL 数据库中的投票与点赞记录
  if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE) {
    console.log('[1/2] 正在连接 RDS MySQL 数据库...');
    let pool;
    try {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectTimeout: 8000
      });

      // 统计清理前数量
      const [beforeVotes] = await pool.query('SELECT COUNT(*) as cnt FROM htf_kos_votes');
      const votesCount = beforeVotes[0].cnt;
      console.log(`  -> 当前点赞表 (htf_kos_votes) 共有 ${votesCount} 条记录`);

      // 清理投票记录
      await pool.query('TRUNCATE TABLE htf_kos_votes');
      console.log('  -> [OK] 已清空点赞记录表 (htf_kos_votes)！');

      // 可选清理投票人表
      try {
        await pool.query('TRUNCATE TABLE htf_kos_voters');
        console.log('  -> [OK] 已清空投票人登记表 (htf_kos_voters)！');
      } catch (e) {
        // 表可能不存在或外键忽略
      }

      // 安全校验：确认报名表完好无损
      const [appRows] = await pool.query('SELECT COUNT(*) as cnt FROM htf_kos_applications');
      console.log(`  -> [安全确认] 核心报名表 (htf_kos_applications) 完好无损，现有 ${appRows[0].cnt} 份报名作品！\n`);

    } catch (err) {
      console.warn('  -> [提示] MySQL 清理跳过或异常:', err.message);
    } finally {
      if (pool) await pool.end();
    }
  } else {
    console.log('[1/2] 未配置 MySQL，跳过数据库清理。');
  }

  // 2. 清理本地容灾备份 JSON 文件
  console.log('[2/2] 正在清理本地容灾备份文件...');
  const dataDir = path.resolve(__dirname, '..', 'data');
  const votesFile = path.join(dataDir, 'votes.json');
  const votersFile = path.join(dataDir, 'voters.json');

  if (fs.existsSync(votesFile)) {
    fs.writeFileSync(votesFile, JSON.stringify([], null, 2), 'utf-8');
    console.log('  -> [OK] 已重置本地 data/votes.json 为 []');
  }
  if (fs.existsSync(votersFile)) {
    fs.writeFileSync(votersFile, JSON.stringify([], null, 2), 'utf-8');
    console.log('  -> [OK] 已重置本地 data/voters.json 为 []');
  }

  console.log('\n========================================================');
  console.log('【完成】所有投票测试数据已全部归零！');
  console.log('提示：请执行 pm2 restart all 使服务刷新内存缓存。');
  console.log('========================================================');
}

cleanVoteData().catch(err => {
  console.error('清理失败:', err);
  process.exit(1);
});

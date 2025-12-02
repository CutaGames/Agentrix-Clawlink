/**
 * 快速修复 agent_sessions 表的 userId NULL 值问题
 * 使用后端的数据库配置来连接数据库
 */

const { Client } = require('pg');

// 使用后端默认配置
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'paymind',
  password: process.env.DB_PASSWORD || 'paymind_password',
  database: process.env.DB_DATABASE || 'paymind_db',
});

async function fixDatabase() {
  try {
    console.log('🔌 正在连接数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 1. 检查并删除 userId 为 NULL 的记录
    console.log('\n📊 检查 agent_sessions 表中的 NULL userId 记录...');
    const nullCountResult = await client.query(
      'SELECT COUNT(*) as count FROM agent_sessions WHERE "userId" IS NULL'
    );
    const nullCount = parseInt(nullCountResult.rows[0].count, 10);
    console.log(`   找到 ${nullCount} 条 userId 为 NULL 的记录`);

    if (nullCount > 0) {
      console.log('🗑️  正在删除 NULL userId 记录...');
      const deleteResult = await client.query(
        'DELETE FROM agent_sessions WHERE "userId" IS NULL'
      );
      console.log(`   ✅ 已删除 ${deleteResult.rowCount} 条记录`);
    }

    // 2. 删除外键约束（如果存在）
    console.log('\n🔓 检查并删除外键约束...');
    try {
      await client.query(
        'ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_40a6b0600d60c067ae0f8659ce0"'
      );
      console.log('   ✅ 外键约束已删除（如果存在）');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ℹ️  外键约束不存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 将 userId 设置为 NOT NULL
    console.log('\n🔧 将 userId 设置为 NOT NULL...');
    await client.query(
      'ALTER TABLE agent_sessions ALTER COLUMN "userId" SET NOT NULL'
    );
    console.log('   ✅ userId 列已设置为 NOT NULL');

    console.log('\n🎉 数据库修复完成！');
    console.log('   现在可以重启后端服务了。');

  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 提示：数据库密码可能不正确。');
      console.error('   请检查环境变量 DB_PASSWORD 或修改脚本中的密码。');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 执行修复
fixDatabase();


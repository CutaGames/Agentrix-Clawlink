/**
 * 运行多资产商品种子数据脚本
 * 使用: npx ts-node src/database/seeds/run-multi-asset-seed.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import multiAssetProductsSeed from './multi-asset-products.seed';

// 加载环境变量
config({ path: join(__dirname, '../../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'agentrix',
  entities: [join(__dirname, '../../entities/*.entity{.ts,.js}')],
  synchronize: false,
});

async function runSeed() {
  try {
    console.log('🔌 连接数据库...');
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    console.log('🌱 开始创建多资产类型商品...\n');
    await multiAssetProductsSeed(dataSource);

    console.log('\n✅ 种子数据创建完成！');
  } catch (error) {
    console.error('❌ 运行种子数据失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 数据库连接已关闭');
  }
}

runSeed();

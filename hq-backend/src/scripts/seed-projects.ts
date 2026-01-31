/**
 * HQ 项目初始化脚本
 * 
 * 自动注册 Agentrix 和 HQ 两个项目
 */

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedProjects() {
  console.log('🌱 Seeding HQ projects...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.HQ_DB_HOST || 'localhost',
    port: parseInt(process.env.HQ_DB_PORT || '5432'),
    username: process.env.HQ_DB_USERNAME || 'hq_admin',
    password: process.env.HQ_DB_PASSWORD || 'hq_secure_2026',
    database: process.env.HQ_DB_DATABASE || 'hq_database',
  });

  await dataSource.initialize();
  console.log('✅ Connected to HQ database\n');

  // 检查表是否存在
  const tableExists = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'hq_projects'
    );
  `);

  if (!tableExists[0].exists) {
    console.log('⚠️  Tables not created yet. Please start the app first to run migrations.');
    await dataSource.destroy();
    return;
  }

  // 注册 Agentrix 项目
  const agentrixId = uuidv4();
  await dataSource.query(`
    INSERT INTO hq_projects (id, name, slug, description, api_url, status, capabilities, config, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET
      api_url = EXCLUDED.api_url,
      updated_at = NOW()
  `, [
    agentrixId,
    'Agentrix',
    'agentrix',
    'AI Agent Marketplace & Payment Platform',
    process.env.AGENTRIX_API_URL || 'http://localhost:3001',
    'active',
    ['user_management', 'payment', 'risk_control', 'product_catalog', 'analytics', 'order_management', 'developer_tools'],
    JSON.stringify({
      healthCheckPath: '/api/health',
      metricsPath: '/api/hq/metrics',
      eventsPath: '/api/hq/events',
      authType: 'api_key',
    }),
    true,
  ]);
  console.log('✅ Registered project: Agentrix');

  // 注册 HQ 项目（自身）
  const hqId = uuidv4();
  await dataSource.query(`
    INSERT INTO hq_projects (id, name, slug, description, api_url, status, capabilities, config, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET
      api_url = EXCLUDED.api_url,
      updated_at = NOW()
  `, [
    hqId,
    'HQ',
    'hq',
    'CEO Command Center - Multi-Project Management',
    process.env.HQ_API_URL || 'http://localhost:3005',
    'active',
    ['analytics'],
    JSON.stringify({
      healthCheckPath: '/api/health',
      metricsPath: '/api/hq/dashboard',
      authType: 'api_key',
    }),
    true,
  ]);
  console.log('✅ Registered project: HQ');

  await dataSource.destroy();
  console.log('\n🎉 Project seeding completed!');
}

seedProjects().catch(console.error);

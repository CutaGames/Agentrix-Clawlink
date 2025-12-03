import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

async function fixPayeeTypeEnum() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'agentrix',
    password: process.env.DB_PASSWORD || 'agentrix_password',
    database: process.env.DB_DATABASE || 'agentrix',
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = dataSource.createQueryRunner();

    console.log('\n📋 Step 1: 检查当前状态...');
    const currentState = await queryRunner.query(`
      SELECT 
        table_name,
        column_name,
        udt_name
      FROM information_schema.columns 
      WHERE table_name IN ('commissions', 'commission_settlements') 
      AND column_name = 'payeeType'
      ORDER BY table_name
    `);
    console.log('当前状态:', currentState);

    console.log('\n📋 Step 2: 将列类型改为 text...');
    await queryRunner.query(`
      ALTER TABLE "commissions" 
      ALTER COLUMN "payeeType" TYPE text
    `);
    console.log('✅ commissions 表已改为 text');

    await queryRunner.query(`
      ALTER TABLE "commission_settlements" 
      ALTER COLUMN "payeeType" TYPE text
    `);
    console.log('✅ commission_settlements 表已改为 text');

    console.log('\n📋 Step 3: 删除旧的枚举类型...');
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE
    `);
    console.log('✅ 已删除 commissions_payeetype_enum_old');

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."commission_settlements_payeetype_enum" CASCADE
    `);
    console.log('✅ 已删除 commission_settlements_payeetype_enum');

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."commissions_payeetype_enum" CASCADE
    `);
    console.log('✅ 已删除 commissions_payeetype_enum');

    console.log('\n📋 Step 4: 创建统一的枚举类型...');
    await queryRunner.query(`
      CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix')
    `);
    console.log('✅ 已创建 commissions_payeetype_enum');

    console.log('\n📋 Step 5: 将列改回枚举类型...');
    await queryRunner.query(`
      ALTER TABLE "commissions" 
      ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
      USING "payeeType"::"public"."commissions_payeetype_enum"
    `);
    console.log('✅ commissions 表已改为枚举类型');

    await queryRunner.query(`
      ALTER TABLE "commission_settlements" 
      ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
      USING "payeeType"::"public"."commissions_payeetype_enum"
    `);
    console.log('✅ commission_settlements 表已改为枚举类型');

    console.log('\n📋 Step 6: 验证修复结果...');
    const enumTypes = await queryRunner.query(`
      SELECT 
        t.typname as enum_name,
        e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname LIKE '%payeetype%'
      ORDER BY t.typname, e.enumsortorder
    `);
    console.log('枚举类型:', enumTypes);

    const finalState = await queryRunner.query(`
      SELECT 
        table_name,
        column_name,
        udt_name
      FROM information_schema.columns 
      WHERE table_name IN ('commissions', 'commission_settlements') 
      AND column_name = 'payeeType'
      ORDER BY table_name
    `);
    console.log('最终状态:', finalState);

    await queryRunner.release();
    await dataSource.destroy();
    console.log('\n✅ 修复完成！');
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixPayeeTypeEnum();


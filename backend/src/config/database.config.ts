import { Injectable, OnModuleInit } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { onTypeORMInitialized } from './database-init-hook';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory, OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    console.log('[DatabaseConfig] onModuleInit() called');
    const dataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'agentrix'),
      password: this.configService.get('DB_PASSWORD', 'agentrix_secure_2024'),
      database: this.configService.get('DB_DATABASE', 'paymind'),
      synchronize: false,
    });

    console.log('[DatabaseConfig] Scheduling init hook to run in 3s...');
    setTimeout(async () => {
      try {
        console.log('[DatabaseConfig] Running init hook now...');
        await onTypeORMInitialized(dataSource);
        console.log('[DatabaseConfig] Init hook completed');
      } catch (error) {
        console.warn('[Database] Init hook failed (non-critical):', error.message);
      }
    }, 3000);
    console.log('[DatabaseConfig] onModuleInit() finished');
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const dbName = this.configService.get('DB_DATABASE', 'paymind'); // 默认使用 paymind 数据库
    const dbHost = this.configService.get('DB_HOST', 'localhost');
    const dbSyncConfig = this.configService.get('DB_SYNC');
    
    // 安全检查：生产环境绝对禁止使用开发数据库名（以 _dev 结尾）
    if (nodeEnv === 'production' && (dbName.endsWith('_dev') || dbName === 'agentrix_dev')) {
      throw new Error(`[Database] FATAL: Production environment (${nodeEnv}) is attempting to connect to a development database (${dbName})! Access denied for safety.`);
    }

    // 安全检查：非 localhost 的远程数据库严禁自动同步，除非明确设置
    const isRemote = dbHost !== 'localhost' && dbHost !== '127.0.0.1' && !dbHost.includes('postgres'); // postgres is docker internal host
    
    let finalSync = false;
    if (dbSyncConfig === 'true') {
      finalSync = true;
    } else if (nodeEnv !== 'production') {
      if (dbSyncConfig !== 'false' && (nodeEnv === 'test' || nodeEnv === 'development')) {
        // 远程库默认不同步，本地库默认同步
        finalSync = !isRemote;
      }
    }
    
    if (nodeEnv === 'production' && dbSyncConfig === 'true') {
      console.warn('[Database] WARNING: DB_SYNC=true detected in production! Proceeding with auto-sync as requested.');
    }
    
    console.log(`[Database] 🚀 Environment: ${nodeEnv}, Host: ${dbHost}, DB: ${dbName}, Sync: ${finalSync}`);

    return {
      type: 'postgres',
      host: dbHost,
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'agentrix'),
      password: this.configService.get('DB_PASSWORD', 'agentrix_secure_2024'), // 正确的密码
      database: dbName,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: finalSync, // 根据配置决定是否同步
      namingStrategy: new SnakeNamingStrategy(),
      logging: this.configService.get('NODE_ENV') === 'development',
      retryAttempts: 5, // 增加重试次数
      retryDelay: 2000,
      autoLoadEntities: true,
      connectTimeoutMS: 15000,
      extra: {
        max: 10,
        connectionTimeoutMillis: 15000,
      },
      subscribers: [],
    };
  }
}


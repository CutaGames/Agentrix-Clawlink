import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'paymind'),
      password: this.configService.get<string>('DB_PASSWORD', 'paymind_password'),
      database: this.configService.get<string>('DB_DATABASE', 'paymind'), // 实际数据库名是 paymind
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      // 临时禁用 synchronize，使用迁移来管理数据库结构
      // 修复 agent_sessions 表的 userId NULL 值问题后，可以重新启用
      // 测试环境启用 synchronize 以确保 schema 同步
      // 开发环境也启用 synchronize 以自动创建管理后台表（仅用于开发）
      synchronize: 
        this.configService.get<string>('NODE_ENV') === 'test' || 
        this.configService.get<string>('NODE_ENV') === 'development' ||
        this.configService.get<string>('DB_SYNC') === 'true',
      logging: this.configService.get<string>('NODE_ENV') === 'development',
      retryAttempts: 3,
      retryDelay: 3000,
      autoLoadEntities: true,
      connectTimeoutMS: 10000, // 10秒连接超时
      extra: {
        max: 10,
        connectionTimeoutMillis: 10000,
      },
    };
  }
}


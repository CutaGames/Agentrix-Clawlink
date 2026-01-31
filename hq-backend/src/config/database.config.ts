/**
 * HQ Database Configuration
 * 
 * 独立于 Agentrix 的数据库配置
 */

import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Injectable()
export class HqDatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const dbHost = this.configService.get('HQ_DB_HOST', 'localhost');
    const dbPort = this.configService.get('HQ_DB_PORT', 5432);
    const dbUsername = this.configService.get('HQ_DB_USERNAME', 'hq_admin');
    const dbPassword = this.configService.get('HQ_DB_PASSWORD', 'hq_secure_2026');
    const dbDatabase = this.configService.get('HQ_DB_DATABASE', 'hq_database');

    console.log(`[HQ Database] Connecting to ${dbHost}:${dbPort}/${dbDatabase}`);

    return {
      type: 'postgres',
      host: dbHost,
      port: parseInt(dbPort, 10),
      username: dbUsername,
      password: dbPassword,
      database: dbDatabase,
      entities: [
        __dirname + '/../entities/*.entity{.ts,.js}',
        __dirname + '/../modules/**/entities/*.entity{.ts,.js}',
      ],
      synchronize: nodeEnv === 'development', // 开发环境自动同步
      logging: nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
      namingStrategy: new SnakeNamingStrategy(),
      extra: {
        max: 20,
        connectionTimeoutMillis: 10000,
      },
    };
  }
}

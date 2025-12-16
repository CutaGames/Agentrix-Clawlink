import { Injectable, OnModuleInit } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { onTypeORMInitialized } from './database-init-hook';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory, OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const dataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'agentrix'),
      password: this.configService.get('DB_PASSWORD', 'agentrix_password'),
      database: this.configService.get('DB_DATABASE', 'agentrix'),
      synchronize: false,
    });

    setTimeout(async () => {
      try {
        await onTypeORMInitialized(dataSource);
      } catch (error) {
        // Silent fail
      }
    }, 3000);
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const shouldSync =
      this.configService.get('NODE_ENV') === 'test' ||
      this.configService.get('NODE_ENV') === 'development' ||
      this.configService.get('DB_SYNC') === 'true';

    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'agentrix'),
      password: this.configService.get('DB_PASSWORD', 'agentrix_password'),
      database: this.configService.get('DB_DATABASE', 'agentrix'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: shouldSync,
      logging: this.configService.get('NODE_ENV') === 'development',
      retryAttempts: 3,
      retryDelay: 3000,
      autoLoadEntities: true,
      connectTimeoutMS: 10000,
      extra: {
        max: 10,
        connectionTimeoutMillis: 10000,
      },
      subscribers: [],
      ...(shouldSync && {}),
    };
  }
}


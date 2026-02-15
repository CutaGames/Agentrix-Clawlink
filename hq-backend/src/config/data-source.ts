import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.HQ_DB_HOST || 'localhost',
  port: parseInt(process.env.HQ_DB_PORT || '5432'),
  username: process.env.HQ_DB_USERNAME || 'postgres',
  password: process.env.HQ_DB_PASSWORD || 'postgres',
  database: process.env.HQ_DB_DATABASE || 'agentrix_hq',
  entities: [join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  synchronize: false,
  logging: false,
});

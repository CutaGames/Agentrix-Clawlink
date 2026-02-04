/**
 * HQ App Module
 * 
 * 独立的 HQ 应用模块
 * - Core: Agent 和会话管理
 * - Memory: 记忆系统和向量搜索
 * - Project: 项目管理
 * - Skill: 技能包系统
 * - Knowledge: 知识库系统
 * - Workspace: IDE 工作区
 * - Telegram: 远程控制
 * - WebSocket: 实时通信
 * - CLI: IDE 命令行接口
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HqDatabaseConfig } from './config/database.config';
import { HqCoreModule } from './modules/core/hq-core.module';
import { MemoryModule } from './modules/memory/memory.module';
import { ProjectModule } from './modules/project/project.module';
import { SkillModule } from './modules/skill/skill.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { CLIModule } from './modules/cli/cli.module';
import { SocialModule } from './modules/social/social.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // 事件发射器（用于模块间通信）
    EventEmitterModule.forRoot(),

    // 数据库模块 (独立的 HQ 数据库)
    TypeOrmModule.forRootAsync({
      useClass: HqDatabaseConfig,
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // 核心模块
    HqCoreModule,
    MemoryModule,
    ProjectModule,

    // 技能系统
    SkillModule,

    // 知识库与工作区
    KnowledgeModule,
    WorkspaceModule,

    // 通信模块
    TelegramModule,
    WebSocketModule,

    // 社交媒体管理
    SocialModule,

    // IDE/CLI 接口
    CLIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

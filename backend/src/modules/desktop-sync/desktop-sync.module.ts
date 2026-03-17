import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesktopSyncController } from './desktop-sync.controller';
import { DesktopSyncService } from './desktop-sync.service';
import { NotificationModule } from '../notification/notification.module';
import {
  DesktopDevicePresence,
  DesktopSession,
  DesktopTask,
  DesktopApproval,
  DesktopCommand,
} from '../../entities/desktop-sync.entity';

@Module({
  imports: [
    NotificationModule,
    TypeOrmModule.forFeature([DesktopDevicePresence, DesktopSession, DesktopTask, DesktopApproval, DesktopCommand]),
  ],
  controllers: [DesktopSyncController],
  providers: [DesktopSyncService],
  exports: [DesktopSyncService],
})
export class DesktopSyncModule {}
import { Module } from '@nestjs/common';
import { DesktopSyncController } from './desktop-sync.controller';
import { DesktopSyncService } from './desktop-sync.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [DesktopSyncController],
  providers: [DesktopSyncService],
  exports: [DesktopSyncService],
})
export class DesktopSyncModule {}
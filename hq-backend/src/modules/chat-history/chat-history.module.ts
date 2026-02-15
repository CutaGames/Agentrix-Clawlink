import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatHistory } from '../../entities/chat-history.entity';
import { ChatHistoryService } from './chat-history.service';
import { ChatHistoryController } from './chat-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatHistory])],
  providers: [ChatHistoryService],
  controllers: [ChatHistoryController],
  exports: [ChatHistoryService],
})
export class ChatHistoryModule {}

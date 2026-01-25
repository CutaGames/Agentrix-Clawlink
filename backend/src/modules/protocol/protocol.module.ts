import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProtocolController } from './protocol.controller';
import { ProtocolService } from './protocol.service';
import { Skill } from '../../entities/skill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill])],
  controllers: [ProtocolController],
  providers: [ProtocolService],
  exports: [ProtocolService],
})
export class ProtocolModule {}

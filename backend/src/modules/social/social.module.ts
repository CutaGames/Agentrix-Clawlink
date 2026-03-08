import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialPost, SocialComment, SocialLike, SocialFollow } from '../../entities/social.entity';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { SocialCallbackController } from './social-callback.controller';
import { OpenClawConnectionModule } from '../openclaw-connection/openclaw-connection.module';

@Module({
  imports: [TypeOrmModule.forFeature([SocialPost, SocialComment, SocialLike, SocialFollow]), OpenClawConnectionModule],
  providers: [SocialService],
  controllers: [SocialController, SocialCallbackController],
  exports: [SocialService],
})
export class SocialModule {}

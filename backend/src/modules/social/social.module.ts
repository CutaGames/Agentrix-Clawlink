import { Module } from '@nestjs/common';
import { SocialCallbackController } from './social-callback.controller';

@Module({
  controllers: [SocialCallbackController],
})
export class SocialModule {}

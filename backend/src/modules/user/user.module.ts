import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { MerchantModule } from '../merchant/merchant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => MerchantModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}


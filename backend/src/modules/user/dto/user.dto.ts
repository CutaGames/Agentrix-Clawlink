import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '用户邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '用户简介' })
  @IsOptional()
  @IsString()
  bio?: string;
}

export class UploadAvatarDto {
  @ApiProperty({ type: 'string', format: 'binary', description: '头像文件' })
  file: Express.Multer.File;
}

export class RegisterRoleDto {
  @ApiProperty({ 
    description: '要注册的角色', 
    enum: ['merchant', 'agent'],
    example: 'merchant'
  })
  @IsEnum(['merchant', 'agent'], { message: '角色只能是 merchant 或 agent' })
  role: 'merchant' | 'agent';

  @ApiPropertyOptional({ description: '商家/Agent名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '业务类型' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '网站' })
  @IsOptional()
  @IsString()
  website?: string;
}


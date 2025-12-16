import {
  Controller,
  Post,
  Get,
  Put,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateUserDto, UploadAvatarDto, RegisterRoleDto } from './dto/user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '../../entities/user.entity';
import { MerchantProfileService } from '../merchant/merchant-profile.service';

@ApiTags('用户')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => MerchantProfileService))
    private readonly merchantProfileService: MerchantProfileService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '返回用户信息' })
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProfile(@Request() req, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: '上传用户头像' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: '头像上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(req.user.id, file);
  }

  @Get('avatar')
  @ApiOperation({ summary: '获取用户头像URL' })
  @ApiResponse({ status: 200, description: '返回头像URL' })
  async getAvatar(@Request() req) {
    return this.userService.getAvatar(req.user.id);
  }

  @Post('register-role')
  @ApiOperation({ summary: '注册角色（商户/Agent）' })
  @ApiResponse({ status: 200, description: '角色注册成功' })
  async registerRole(@Request() req, @Body() dto: RegisterRoleDto) {
    const role = dto.role === 'merchant' ? UserRole.MERCHANT : UserRole.AGENT;
    const user = await this.userService.addRole(req.user.id, role);

    if (role === UserRole.MERCHANT) {
      await this.merchantProfileService.updateProfile(req.user.id, {
        businessName: dto.businessName,
        businessInfo: dto.businessInfo,
        contactInfo: dto.contactInfo,
      });
    }

    return {
      success: true,
      message: `已成功注册为${dto.role === 'merchant' ? '商户' : 'Agent'}`,
      user: {
        id: user.id,
        paymindId: user.paymindId,
        roles: user.roles,
        email: user.email,
        nickname: user.nickname,
      }
    };
  }
}


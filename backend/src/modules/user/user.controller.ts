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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateUserDto, UploadAvatarDto, UpdatePayoutSettingsDto } from './dto/user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('用户')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  @ApiOperation({ summary: '注册用户角色（商户/Agent/开发者）' })
  @ApiResponse({ status: 201, description: '注册成功' })
  async registerRole(@Request() req, @Body() body: { role: string; [key: string]: any }) {
    return this.userService.registerRole(req.user.id, body.role, body);
  }

  // ==================== 佣金结算设置 ====================

  @Get('me/payout-settings')
  @ApiOperation({ summary: '获取用户佣金结算设置' })
  @ApiResponse({ status: 200, description: '返回结算设置' })
  async getPayoutSettings(@Request() req) {
    return this.userService.getPayoutSettings(req.user.id);
  }

  @Put('me/payout-settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新用户佣金结算设置' })
  @ApiBody({ type: UpdatePayoutSettingsDto })
  @ApiResponse({ status: 200, description: '设置更新成功' })
  async updatePayoutSettings(
    @Request() req,
    @Body() dto: UpdatePayoutSettingsDto,
  ) {
    return this.userService.updatePayoutSettings(req.user.id, dto);
  }
}


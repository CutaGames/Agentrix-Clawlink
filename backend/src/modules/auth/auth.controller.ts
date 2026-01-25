import { Controller, Post, Body, UseGuards, Request, BadRequestException, Get, Res, Delete, Param, ParseEnumPipe, ParseUUIDPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SocialAccountService } from './social-account.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, WalletLoginDto, BindSocialAccountDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SocialAccountType } from '../../entities/social-account.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private authService: AuthService,
    private socialAccountService: SocialAccountService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '用户已存在' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 登录' })
  async googleAuth() {
    // Guard 会自动重定向到 Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 回调' })
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    return this.handleSocialAuthCallback(req, res, SocialAccountType.GOOGLE);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth 登录' })
  async appleAuth() {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth 回调' })
  async appleAuthCallback(@Request() req, @Res() res) {
    return this.handleSocialAuthCallback(req, res, SocialAccountType.APPLE);
  }

  @Get('twitter')
  @UseGuards(AuthGuard('twitter'))
  @ApiOperation({ summary: 'Twitter OAuth 登录' })
  async twitterAuth() {}

  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  @ApiOperation({ summary: 'Twitter OAuth 回调' })
  async twitterAuthCallback(@Request() req, @Res() res) {
    return this.handleSocialAuthCallback(req, res, SocialAccountType.X);
  }

  private async handleSocialAuthCallback(req: any, res: any, type: SocialAccountType) {
    try {
      if (!req.user) {
        throw new BadRequestException(`${type} OAuth认证失败：未获取到用户信息`);
      }

      let socialId: string;
      let profileData: any;

      if (type === SocialAccountType.GOOGLE) {
        const { googleId, email, firstName, lastName, picture } = req.user;
        socialId = googleId;
        profileData = {
          email,
          displayName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
          avatarUrl: picture,
        };
      } else if (type === SocialAccountType.APPLE) {
        const { appleId, email, firstName, lastName } = req.user;
        socialId = appleId;
        profileData = {
          email,
          displayName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
        };
      } else if (type === SocialAccountType.X) {
        const { twitterId, email, displayName, picture } = req.user;
        socialId = twitterId;
        profileData = {
          email,
          displayName,
          avatarUrl: picture,
        };
      }

      // 检查是否已有用户通过该社交账号登录
      let user = await this.socialAccountService.findUserBySocialId(type, socialId);

      if (!user) {
        // 检查是否通过email找到用户（用于绑定）
        if (profileData.email) {
          user = await this.authService.findUserByEmail(profileData.email);
        }

        if (user) {
          // 绑定社交账号
          await this.socialAccountService.bindSocialAccount(user.id, type, socialId, profileData);
        } else {
          // 创建新用户
          if (type === SocialAccountType.GOOGLE) {
            user = await this.authService.validateGoogleUser(req.user);
          } else if (type === SocialAccountType.APPLE) {
            user = await this.authService.validateAppleUser(req.user);
          } else if (type === SocialAccountType.X) {
            user = await this.authService.validateTwitterUser(req.user);
          }
          await this.socialAccountService.bindSocialAccount(user.id, type, socialId, profileData);
        }
      }

      const loginResult = await this.authService.login(user);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
      redirectUrl.searchParams.set('token', loginResult.access_token);
      redirectUrl.searchParams.set('userId', loginResult.user.id);
      redirectUrl.searchParams.set('email', loginResult.user.email || '');
      redirectUrl.searchParams.set('agentrixId', loginResult.user.agentrixId);
      
      // 检查用户是否有钱包绑定，如果没有则需要创建 MPC 钱包
      const hasWallet = (loginResult.user as any).walletAddress;
      if (!hasWallet) {
        redirectUrl.searchParams.set('needMPCWallet', 'true');
        redirectUrl.searchParams.set('socialType', type);
        redirectUrl.searchParams.set('socialId', socialId);
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const errorUrl = new URL(`${frontendUrl}/auth/callback`);
      errorUrl.searchParams.set('error', error.message || `${type}登录失败`);
      res.redirect(errorUrl.toString());
    }
  }

  @Post('wallet/login')
  @ApiOperation({ summary: '钱包登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '签名验证失败' })
  async walletLogin(@Body() dto: WalletLoginDto) {
    return this.authService.walletLogin(dto);
  }

  @Post('wallet/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '绑定新的链上钱包到当前账号' })
  @ApiResponse({ status: 201, description: '绑定成功' })
  @ApiResponse({ status: 409, description: '钱包已绑定其他账号' })
  async bindWallet(@Request() req, @Body() dto: WalletLoginDto) {
    return this.authService.bindWallet(req.user.id, dto);
  }

  @Get('wallet/connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户绑定的钱包' })
  @ApiResponse({ status: 200, description: '钱包列表返回成功' })
  async getWalletConnections(@Request() req) {
    return this.authService.getWalletConnections(req.user.id);
  }

  @Delete('wallet/connections/:walletId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解绑钱包' })
  @ApiResponse({ status: 200, description: '解绑成功' })
  async removeWalletConnection(
    @Request() req,
    @Param('walletId', new ParseUUIDPipe()) walletId: string,
  ) {
    return this.authService.removeWalletConnection(req.user.id, walletId);
  }

  @Post('wallet/connections/:walletId/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置默认钱包' })
  @ApiResponse({ status: 200, description: '设置成功' })
  async setDefaultWallet(
    @Request() req,
    @Param('walletId', new ParseUUIDPipe()) walletId: string,
  ) {
    return this.authService.setDefaultWallet(req.user.id, walletId);
  }

  // ========== 社交账号绑定 ==========

  @Post('social/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '绑定社交账号' })
  @ApiResponse({ status: 201, description: '绑定成功' })
  @ApiResponse({ status: 409, description: '该类型账号已绑定或已被其他用户绑定' })
  async bindSocialAccount(
    @Request() req,
    @Body() body: BindSocialAccountDto,
  ) {
    const { type, socialId, email, username, displayName, avatarUrl, metadata } = body;
    return this.socialAccountService.bindSocialAccount(
      req.user.id,
      type,
      socialId,
      {
        email,
        username,
        displayName,
        avatarUrl,
        metadata,
      },
    );
  }

  @Delete('social/unbind/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解绑社交账号' })
  @ApiResponse({ status: 200, description: '解绑成功' })
  @ApiResponse({ status: 404, description: '未找到该社交账号绑定' })
  async unbindSocialAccount(
    @Request() req,
    @Param('type', new ParseEnumPipe(SocialAccountType)) type: SocialAccountType,
  ) {
    return this.socialAccountService.unbindSocialAccount(req.user.id, type);
  }

  @Get('social/accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的社交账号绑定列表' })
  @ApiResponse({ status: 200, description: '返回社交账号列表' })
  async getUserSocialAccounts(@Request() req) {
    return this.socialAccountService.getUserSocialAccounts(req.user.id);
  }

  // ========== MCP OAuth (Dummy for ChatGPT/Claude) ==========

  @Get('mcp/authorize')
  @ApiOperation({ summary: 'MCP OAuth 授权端点' })
  async mcpAuthorize(@Request() req, @Res() res) {
    const { client_id, response_type, redirect_uri, state, scope } = req.query;
    this.logger.log(`MCP Authorize request: client_id=${client_id}, redirect_uri=${redirect_uri}`);
    
    // 简单起见，直接重定向回 redirect_uri 并带上 code
    // 在生产环境中，这里应该先验证用户登录状态
    const code = 'mcp_code_' + Math.random().toString(36).substring(7);
    
    try {
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      return res.status(400).send('Invalid redirect_uri');
    }
  }

  @Post('mcp/token')
  @ApiOperation({ summary: 'MCP OAuth 令牌端点' })
  async mcpToken(@Body() body: any) {
    this.logger.log(`MCP Token request: grant_type=${body.grant_type}, code=${body.code}`);
    
    // 返回一个模拟的 Token
    // ChatGPT 只需要一个 access_token 放在 Authorization header 中
    return {
      access_token: 'mcp_token_' + Math.random().toString(36).substring(7),
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mcp_refresh_' + Math.random().toString(36).substring(7),
      scope: body.scope || 'mcp',
    };
  }

  @Get('mcp/jwks')
  @ApiOperation({ summary: 'MCP JWKS 端点' })
  async mcpJwks() {
    return { keys: [] };
  }
}





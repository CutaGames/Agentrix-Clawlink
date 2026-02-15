import { Controller, Post, Body, UseGuards, Request, BadRequestException, Get, Res, Delete, Param, ParseEnumPipe, ParseUUIDPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SocialAccountService } from './social-account.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, WalletLoginDto, BindSocialAccountDto, SocialTokenLoginDto } from './dto/auth.dto';
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
  @ApiOperation({ summary: 'Twitter OAuth 回调（共享：Web OAuth 1.0a + Mobile OAuth 2.0 PKCE）' })
  async twitterAuthCallback(@Request() req, @Res() res: Response) {
    // 检测是否为 Mobile OAuth 2.0 PKCE 流程
    // Check both state-encoded (new) and in-memory Map (legacy)
    const { state, code } = req.query;
    const isMobilePKCE = state && code && (this.decodeMobileState(state) !== null || this.getMobileRedirectStore().has(state));
    if (isMobilePKCE) {
      return this.handleMobileTwitterOAuth2Callback(req, res);
    }
    // 否则走 Web OAuth 1.0a（Passport）
    // 手动调用 Passport authenticate
    const passport = require('passport');
    return new Promise<void>((resolve, reject) => {
      passport.authenticate('twitter', (err: any, user: any) => {
        if (err || !user) {
          const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
          const errorUrl = new URL(`${frontendUrl}/auth/callback`);
          errorUrl.searchParams.set('error', err?.message || 'Twitter login failed');
          res.redirect(errorUrl.toString());
          return resolve();
        }
        req.user = user;
        this.handleSocialAuthCallback(req, res, SocialAccountType.X);
        resolve();
      })(req, res);
    });
  }

  // Mobile Twitter OAuth 2.0 PKCE 回调处理
  private async handleMobileTwitterOAuth2Callback(req: any, res: Response) {
    const { code, error: oauthError, state } = req.query;
    const { redirectUri: mobileRedirect, codeVerifier } = this.resolveMobileRedirect(state);
    this.logger.log(`[Twitter Callback] resolved redirect=${mobileRedirect}, hasCodeVerifier=${!!codeVerifier}`);

    if (oauthError || !code) {
      return this.redirectMobileWithParams(res, mobileRedirect, { error: oauthError || 'Twitter login cancelled' });
    }

    try {
      const clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
      const callbackUrl = this.configService.get<string>('TWITTER_CALLBACK_URL')
        || `${this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api'}/auth/twitter/callback`;

      if (!codeVerifier) {
        throw new Error('PKCE code_verifier not found — state expired or invalid');
      }

      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: clientId,
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        this.logger.error(`Twitter token exchange failed: ${errText}`);
        throw new Error('Twitter token exchange failed');
      }

      const tokenData = await tokenRes.json() as any;
      const loginResult = await this.authService.socialTokenLogin({
        provider: 'x',
        accessToken: tokenData.access_token,
      });

      return this.redirectMobileWithParams(res, mobileRedirect, {
        token: loginResult.access_token,
        userId: loginResult.user.id,
        email: loginResult.user.email || '',
        agentrixId: loginResult.user.agentrixId,
      });
    } catch (err) {
      this.logger.error(`Mobile Twitter callback error: ${err.message}`);
      return this.redirectMobileWithParams(res, mobileRedirect, { error: err.message || 'Twitter login failed' });
    }
  }

  private async handleSocialAuthCallback(req: any, res: any, type: SocialAccountType) {
    // 检查是否来自移动端（通过 state 参数）
    const isMobile = req.query?.state?.includes('platform=mobile') || req.session?.oauthPlatform === 'mobile';
    // 从 store 中取出移动端的动态 redirect_uri
    const mobileStateKey = req.query?.mobile_state;
    const storedMobile = mobileStateKey ? this.getMobileRedirectStore().get(mobileStateKey) : null;
    const mobileRedirect = storedMobile?.redirectUri || this.getDefaultMobileRedirect();
    if (storedMobile) this.getMobileRedirectStore().delete(mobileStateKey);

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

      if (isMobile) {
        // 移动端：重定向到动态 redirect_uri（支持 Expo Go 的 exp:// 和独立构建的 agentrix://）
        const params = new URLSearchParams({
          token: loginResult.access_token,
          userId: loginResult.user.id,
          email: loginResult.user.email || '',
          agentrixId: loginResult.user.agentrixId,
        });
        return res.redirect(`${mobileRedirect}?${params.toString()}`);
      }

      // Web 端：重定向到前端页面
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
      if (isMobile) {
        const params = new URLSearchParams({ error: error.message || `${type}登录失败` });
        return res.redirect(`${mobileRedirect}?${params.toString()}`);
      }
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const errorUrl = new URL(`${frontendUrl}/auth/callback`);
      errorUrl.searchParams.set('error', error.message || `${type}登录失败`);
      res.redirect(errorUrl.toString());
    }
  }

  // ========== Mobile OAuth 入口（带 platform=mobile 标记）==========

  // 存储移动端 redirect_uri（按 state key 索引）
  // 移动端通过 ?redirect_uri=xxx 传入自己的回调地址
  // Expo Go 开发模式: exp://192.168.x.x:8081/--/auth/callback
  // 独立构建: agentrix://auth/callback
  private getMobileRedirectStore(): Map<string, { redirectUri: string; codeVerifier?: string; createdAt: number }> {
    if (!this['_mobileRedirectStore']) this['_mobileRedirectStore'] = new Map();
    // 清理 10 分钟前的旧条目
    const store = this['_mobileRedirectStore'] as Map<string, any>;
    for (const [k, v] of store.entries()) {
      if (Date.now() - v.createdAt > 600000) store.delete(k);
    }
    return store;
  }

  private getDefaultMobileRedirect(): string {
    return 'agentrix://auth/callback';
  }

  // ========== State-encoded redirect_uri (survives server restarts / multi-instance) ==========
  // Instead of relying on in-memory Map, encode the redirect_uri in the OAuth state parameter.
  // OAuth providers return state unchanged in the callback, so we can always recover it.

  private encodeMobileState(redirectUri: string, extra?: Record<string, string>): string {
    const data: any = { r: redirectUri, t: Date.now() };
    if (extra) Object.assign(data, extra);
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private decodeMobileState(state: string): { redirectUri: string; codeVerifier?: string; [key: string]: any } | null {
    if (!state) return null;
    try {
      const data = JSON.parse(Buffer.from(state, 'base64url').toString());
      if (data && data.r) {
        return { redirectUri: data.r, codeVerifier: data.cv, ...data };
      }
    } catch {
      // Not a state-encoded value — might be a plain random hex from old code or web flow
    }
    return null;
  }

  /**
   * Resolve the mobile redirect_uri from multiple sources (in priority order):
   * 1. State-encoded data (base64url JSON in the state param)
   * 2. In-memory Map (legacy, unreliable across restarts)
   * 3. Default fallback (agentrix://auth/callback)
   */
  private resolveMobileRedirect(state: string): { redirectUri: string; codeVerifier?: string } {
    // 1. Try state-encoded
    const decoded = this.decodeMobileState(state);
    if (decoded) return decoded;
    // 2. Try in-memory Map
    const stored = state ? this.getMobileRedirectStore().get(state) : null;
    if (stored) {
      this.getMobileRedirectStore().delete(state);
      return { redirectUri: stored.redirectUri, codeVerifier: stored.codeVerifier };
    }
    // 3. Default
    return { redirectUri: this.getDefaultMobileRedirect() };
  }

  /**
   * Redirect to mobile app via an HTML page with JavaScript.
   * This is more reliable than HTTP 302 on Android Chrome Custom Tabs,
   * which sometimes block redirects to custom URL schemes (exp://, agentrix://).
   */
  private sendMobileRedirect(res: Response, redirectUrl: string): void {
    const safeUrl = redirectUrl.replace(/'/g, '%27');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting...</title></head><body>
<script>window.location.href='${safeUrl}';</script>
<p style="text-align:center;margin-top:40px;font-family:sans-serif;color:#666">Redirecting to app...</p>
<p style="text-align:center"><a href="${safeUrl}" style="color:#3B82F6">Tap here if not redirected</a></p>
</body></html>`);
  }

  /** Build the final mobile callback URL with params and send via HTML redirect */
  private redirectMobileWithParams(res: Response, mobileRedirect: string, params: Record<string, string>): void {
    const qs = new URLSearchParams(params).toString();
    const url = `${mobileRedirect}?${qs}`;
    this.logger.log(`[Mobile Redirect] → ${url.substring(0, 120)}...`);
    this.sendMobileRedirect(res, url);
  }

  @Get('mobile/google')
  @ApiOperation({ summary: 'Mobile Google OAuth 入口' })
  async mobileGoogleAuth(@Request() req, @Res() res: Response) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const apiBase = this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api';
    const callbackUrl = `${apiBase}/auth/mobile/google/callback`;
    const mobileRedirect = req.query?.redirect_uri || this.getDefaultMobileRedirect();
    // Encode redirect_uri in state (survives server restarts / multi-instance)
    const stateKey = this.encodeMobileState(mobileRedirect);
    this.logger.log(`[Google Entry] redirect_uri=${mobileRedirect}, state=${stateKey.substring(0, 30)}...`);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state: stateKey,
      access_type: 'offline',
      prompt: 'select_account',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Get('mobile/google/callback')
  @ApiOperation({ summary: 'Mobile Google OAuth 回调' })
  async mobileGoogleCallback(@Request() req, @Res() res: Response) {
    const { code, error, state } = req.query;
    const { redirectUri: mobileRedirect } = this.resolveMobileRedirect(state);
    this.logger.log(`[Google Callback] state=${String(state).substring(0, 30)}..., resolved redirect=${mobileRedirect}`);

    if (error || !code) {
      return this.redirectMobileWithParams(res, mobileRedirect, { error: error || 'Google login failed' });
    }

    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
      const apiBase = this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api';
      const callbackUrl = `${apiBase}/auth/mobile/google/callback`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        this.logger.error(`Google token exchange failed: ${errText}`);
        throw new Error('Google token exchange failed');
      }

      const tokenData = await tokenRes.json() as any;
      const loginResult = await this.authService.socialTokenLogin({
        provider: 'google',
        accessToken: tokenData.id_token || tokenData.access_token,
      });

      return this.redirectMobileWithParams(res, mobileRedirect, {
        token: loginResult.access_token,
        userId: loginResult.user.id,
        email: loginResult.user.email || '',
        agentrixId: loginResult.user.agentrixId,
      });
    } catch (err) {
      this.logger.error(`Mobile Google callback error: ${err.message}`);
      return this.redirectMobileWithParams(res, mobileRedirect, { error: err.message || 'Google login failed' });
    }
  }

  @Get('mobile/twitter')
  @ApiOperation({ summary: 'Mobile Twitter OAuth 2.0 PKCE 登录入口（共享 /auth/twitter/callback）' })
  async mobileTwitterAuth(@Request() req, @Res() res: Response) {
    const clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
    const mobileRedirect = req.query?.redirect_uri || this.getDefaultMobileRedirect();

    if (!clientId) {
      return this.redirectMobileWithParams(res, mobileRedirect, { error: 'Twitter OAuth 2.0 not configured (TWITTER_CLIENT_ID missing)' });
    }

    const crypto = require('crypto');
    // PKCE: generate code_verifier and code_challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Encode redirect_uri + codeVerifier in state (survives server restarts)
    const stateKey = this.encodeMobileState(mobileRedirect, { cv: codeVerifier });
    this.logger.log(`[Twitter Entry] redirect_uri=${mobileRedirect}, state=${stateKey.substring(0, 30)}...`);

    // 共享同一个 callback URL（Twitter 只允许一个）
    const callbackUrl = this.configService.get<string>('TWITTER_CALLBACK_URL')
      || `${this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api'}/auth/twitter/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'tweet.read users.read offline.access',
      state: stateKey,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return res.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
  }

  @Get('mobile/discord')
  @ApiOperation({ summary: 'Mobile Discord OAuth 入口' })
  async mobileDiscordAuth(@Request() req, @Res() res: Response) {
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID');
    const mobileRedirect = req.query?.redirect_uri || this.getDefaultMobileRedirect();
    if (!clientId) {
      return this.redirectMobileWithParams(res, mobileRedirect, { error: 'Discord OAuth not configured' });
    }
    const callbackUrl = `${this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api'}/auth/mobile/discord/callback`;
    const stateKey = this.encodeMobileState(mobileRedirect);
    this.logger.log(`[Discord Entry] redirect_uri=${mobileRedirect}, state=${stateKey.substring(0, 30)}...`);
    const params = new URLSearchParams({
      client_id: clientId.trim(),
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'identify email',
      state: stateKey,
    });
    return res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  }

  @Get('mobile/discord/callback')
  @ApiOperation({ summary: 'Mobile Discord OAuth 回调' })
  async mobileDiscordCallback(@Request() req, @Res() res: Response) {
    const { code, error: oauthError, state } = req.query;
    const { redirectUri: mobileRedirect } = this.resolveMobileRedirect(state);
    this.logger.log(`[Discord Callback] resolved redirect=${mobileRedirect}`);

    if (oauthError || !code) {
      return this.redirectMobileWithParams(res, mobileRedirect, { error: oauthError || 'Discord login cancelled' });
    }

    try {
      const clientId = this.configService.get<string>('DISCORD_CLIENT_ID')?.trim();
      const clientSecret = this.configService.get<string>('DISCORD_CLIENT_SECRET')?.trim();
      const callbackUrl = `${this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api'}/auth/mobile/discord/callback`;

      if (!clientSecret) {
        throw new Error('Discord client secret not configured');
      }

      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        this.logger.error(`Discord token exchange failed: ${errText}`);
        throw new Error('Discord token exchange failed');
      }

      const tokenData = await tokenRes.json() as any;
      const loginResult = await this.authService.socialTokenLogin({
        provider: 'discord',
        accessToken: tokenData.access_token,
      });

      return this.redirectMobileWithParams(res, mobileRedirect, {
        token: loginResult.access_token,
        userId: loginResult.user.id,
        email: loginResult.user.email || '',
        agentrixId: loginResult.user.agentrixId,
      });
    } catch (err) {
      this.logger.error(`Mobile Discord callback error: ${err.message}`);
      return this.redirectMobileWithParams(res, mobileRedirect, { error: err.message || 'Discord login failed' });
    }
  }

  @Get('mobile/telegram')
  @ApiOperation({ summary: 'Mobile Telegram 登录入口' })
  async mobileTelegramAuth(@Request() req, @Res() res: Response) {
    const botId = this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.split(':')[0];
    const mobileRedirect = req.query?.redirect_uri || this.getDefaultMobileRedirect();
    if (!botId) {
      return this.redirectMobileWithParams(res, mobileRedirect, { error: 'Telegram bot not configured' });
    }
    // Encode redirect_uri in state (survives server restarts)
    const stateKey = this.encodeMobileState(mobileRedirect);
    this.logger.log(`[Telegram Entry] redirect_uri=${mobileRedirect}, state=${stateKey.substring(0, 30)}...`);
    const apiBaseUrl = this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api';
    // origin 必须和 return_to 的域名一致，否则 Telegram 会跳转到 origin 而不是 return_to
    const apiOrigin = new URL(apiBaseUrl).origin; // e.g. https://api.agentrix.top
    const callbackUrl = `${apiBaseUrl}/auth/mobile/telegram/callback?state=${stateKey}`;
    const params = new URLSearchParams({
      bot_id: botId,
      origin: apiOrigin,
      request_access: 'write',
      return_to: callbackUrl,
    });
    return res.redirect(`https://oauth.telegram.org/auth?${params.toString()}`);
  }

  @Get('mobile/telegram/callback')
  @ApiOperation({ summary: 'Mobile Telegram 登录回调' })
  async mobileTelegramCallback(@Request() req, @Res() res: Response) {
    const { state } = req.query;
    const { redirectUri: mobileRedirect } = this.resolveMobileRedirect(state);
    this.logger.log(`[Telegram Callback] resolved redirect=${mobileRedirect}`);

    try {
      let tgAuthResult = req.query?.tgAuthResult;
      
      // Telegram OAuth widget often sends tgAuthResult as a URL hash fragment (#tgAuthResult=...)
      // which the server can't read from req.query. Serve a client-side HTML page to extract it.
      if (!tgAuthResult) {
        this.logger.warn('Telegram callback: tgAuthResult not in query params, serving hash extractor page');
        const apiBaseUrl = this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top/api';
        const selfUrl = `${apiBaseUrl}/auth/mobile/telegram/callback`;
        res.setHeader('Content-Type', 'text/html');
        return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram Login</title></head><body>
<script>
  var hash = window.location.hash;
  if (hash) {
    var match = hash.match(/tgAuthResult=([^&]+)/);
    if (match) {
      window.location.href = '${selfUrl}?state=${state || ''}&tgAuthResult=' + encodeURIComponent(match[1]);
    } else {
      window.location.href = '${mobileRedirect}?error=' + encodeURIComponent('Telegram auth data not found in URL');
    }
  } else {
    window.location.href = '${mobileRedirect}?error=' + encodeURIComponent('No Telegram auth result received');
  }
</script>
<p>Processing Telegram login...</p>
</body></html>`);
      }

      let telegramData: any;
      try {
        telegramData = JSON.parse(Buffer.from(tgAuthResult, 'base64').toString());
      } catch {
        telegramData = { id: tgAuthResult };
      }

      this.logger.log(`Telegram login data: id=${telegramData.id}, username=${telegramData.username}`);

      const loginResult = await this.authService.socialTokenLogin({
        provider: 'telegram',
        accessToken: tgAuthResult,
        socialId: String(telegramData.id),
        displayName: [telegramData.first_name, telegramData.last_name].filter(Boolean).join(' '),
        username: telegramData.username,
        avatarUrl: telegramData.photo_url,
      });

      return this.redirectMobileWithParams(res, mobileRedirect, {
        token: loginResult.access_token,
        userId: loginResult.user.id,
        email: loginResult.user.email || '',
        agentrixId: loginResult.user.agentrixId,
      });
    } catch (err) {
      this.logger.error(`Mobile Telegram callback error: ${err.message}`);
      return this.redirectMobileWithParams(res, mobileRedirect, { error: err.message || 'Telegram login failed' });
    }
  }

  @Post('social/twitter-code-exchange')
  @ApiOperation({ summary: 'Twitter OAuth 2.0 code 换 token（Mobile 端）' })
  @ApiResponse({ status: 200, description: '返回 access_token' })
  async twitterCodeExchange(@Body() body: { code: string; redirectUri: string; codeVerifier: string }) {
    const { code, redirectUri, codeVerifier } = body;
    const clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Twitter OAuth 2.0 未配置');
    }

    // Twitter OAuth 2.0 PKCE token exchange (public client, no client_secret needed)
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Twitter code exchange failed: ${errText}`);
      throw new BadRequestException('Twitter code exchange failed: ' + errText);
    }

    const tokenData = await response.json();
    // Now do the actual social login with the real access_token
    return this.authService.socialTokenLogin({
      provider: 'x',
      accessToken: (tokenData as any).access_token,
    });
  }

  @Post('social/discord-code-exchange')
  @ApiOperation({ summary: 'Discord OAuth code 换 token（Mobile 端）' })
  @ApiResponse({ status: 200, description: '登录成功，返回 JWT' })
  async discordCodeExchange(@Body() body: { code: string; redirectUri: string }) {
    const { code, redirectUri } = body;
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID')?.trim();
    const clientSecret = this.configService.get<string>('DISCORD_CLIENT_SECRET')?.trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Discord OAuth not configured');
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      this.logger.error(`Discord code exchange failed: ${errText}`);
      throw new BadRequestException('Discord code exchange failed');
    }

    const tokenData = await tokenRes.json() as any;
    return this.authService.socialTokenLogin({
      provider: 'discord',
      accessToken: tokenData.access_token,
    });
  }

  @Post('email/send-code')
  @ApiOperation({ summary: '发送邮箱验证码' })
  @ApiResponse({ status: 200, description: '验证码已发送' })
  async sendEmailCode(@Body() body: { email: string }) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email is required');
    return this.authService.sendEmailVerificationCode(email);
  }

  @Post('email/verify-code')
  @ApiOperation({ summary: '验证邮箱验证码并登录（未注册自动注册）' })
  @ApiResponse({ status: 200, description: '登录成功，返回 JWT' })
  async verifyEmailCode(@Body() body: { email: string; code: string }) {
    const { email, code } = body;
    if (!email || !code) throw new BadRequestException('Email and code are required');
    return this.authService.verifyEmailCodeAndLogin(email, code);
  }

  @Get('wallet/nonce')
  @ApiOperation({ summary: '获取钱包登录 nonce' })
  async getWalletNonce(@Request() req) {
    const address = req.query?.address;
    if (!address) {
      throw new BadRequestException('address is required');
    }
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const message = `Sign this message to login to Agentrix.\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
    return { nonce, message };
  }

  @Post('social/token-login')
  @ApiOperation({ summary: '社交账号 Token 登录（Mobile 端）' })
  @ApiResponse({ status: 200, description: '登录成功，返回 JWT' })
  @ApiResponse({ status: 401, description: 'Token 验证失败' })
  async socialTokenLogin(@Body() dto: SocialTokenLoginDto) {
    return this.authService.socialTokenLogin({
      provider: dto.provider,
      accessToken: dto.accessToken,
      socialId: dto.socialId,
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
    });
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiResponse({ status: 200, description: '返回用户信息' })
  async getMe(@Request() req) {
    const user = await this.authService.findUserById(req.user.id);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    return {
      id: user.id,
      agentrixId: user.agentrixId,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      roles: user.roles,
      walletAddress: (user as any).walletAddress || null,
    };
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





import { Controller, Get, Post, Query, Res, Body, Logger } from '@nestjs/common';
import { Response } from 'express';

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  /**
   * 模拟 OAuth2 授权端点
   * ChatGPT 会重定向用户到这里
   */
  @Get('authorize')
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.logger.log(`OAuth authorize request: client_id=${clientId}, redirect_uri=${redirectUri}`);
    
    // 在实际生产中，这里应该显示登录页面
    // 暂时直接重定向回 ChatGPT，带上一个模拟的 code
    const code = 'dummy_code_' + Math.random().toString(36).substring(7);
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);
    
    this.logger.log(`Redirecting back to: ${callbackUrl.toString()}`);
    return res.redirect(callbackUrl.toString());
  }

  /**
   * 模拟 OAuth2 令牌端点
   * ChatGPT 会调用这个端点来交换 code
   */
  @Post('token')
  async token(
    @Body('code') code: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
    @Body('grant_type') grantType: string,
  ) {
    this.logger.log(`OAuth token request: code=${code}, grant_type=${grantType}`);
    
    // 返回一个模拟的 access_token
    return {
      access_token: 'dummy_access_token_' + Math.random().toString(36).substring(7),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'all',
    };
  }
}

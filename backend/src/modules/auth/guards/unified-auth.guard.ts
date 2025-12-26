import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyGuard } from '../../api-key/guards/api-key.guard';

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. 尝试 API Key
    const apiKey = request.headers['x-api-key'] || request.query['api_key'];
    if (apiKey) {
      try {
        return await this.apiKeyGuard.canActivate(context) as boolean;
      } catch (e) {
        // 如果提供了 API Key 但无效，抛出异常
        throw e;
      }
    }

    // 2. 尝试 JWT
    try {
      return await this.jwtAuthGuard.canActivate(context) as boolean;
    } catch (e) {
      // 如果两者都没有或都无效
      throw e;
    }
  }
}

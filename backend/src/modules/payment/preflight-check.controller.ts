import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PreflightCheckService, PreflightResult } from './preflight-check.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payment')
@Controller('payment')
export class PreflightCheckController {
  constructor(private readonly preflightCheckService: PreflightCheckService) {}

  @Get('/preflight')
  @ApiOperation({ summary: 'Pre-Flight Check（200ms 路由决策）' })
  @ApiResponse({ status: 200, description: '返回路由建议', type: Object })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async preflightCheck(
    @Request() req,
    @Query('amount') amount: string,
    @Query('currency') currency: string = 'USDC',
  ): Promise<PreflightResult> {
    return this.preflightCheckService.check(
      req.user.id,
      parseFloat(amount),
      currency,
    );
  }
}


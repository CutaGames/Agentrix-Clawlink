import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { OidcController } from './oidc.controller';
import { SkillModule } from '../skill/skill.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { PaymentModule } from '../payment/payment.module';
import { AgentAuthorizationModule } from '../agent-authorization/agent-authorization.module';
import { AutoEarnModule } from '../auto-earn/auto-earn.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    SkillModule,
    MarketplaceModule,
    PaymentModule,
    AgentAuthorizationModule,
    AutoEarnModule,
    WalletModule,
  ],
  controllers: [McpController, OidcController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}

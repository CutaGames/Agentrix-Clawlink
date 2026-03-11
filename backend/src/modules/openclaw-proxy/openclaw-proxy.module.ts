import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentAccount } from '../../entities/agent-account.entity';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';
import { UserInstalledSkill } from '../../entities/user-installed-skill.entity';
import { Skill } from '../../entities/skill.entity';
import { OpenClawProxyService } from './openclaw-proxy.service';
import { OpenClawProxyController } from './openclaw-proxy.controller';
import { OpenClawConnectionModule } from '../openclaw-connection/openclaw-connection.module';
import { TokenQuotaModule } from '../token-quota/token-quota.module';
import { SkillModule } from '../skill/skill.module';
import { ClaudeIntegrationModule } from '../ai-integration/claude/claude-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OpenClawInstance, UserInstalledSkill, Skill, AgentAccount]),
    OpenClawConnectionModule,
    TokenQuotaModule,
    forwardRef(() => SkillModule),
    forwardRef(() => ClaudeIntegrationModule),
  ],
  providers: [OpenClawProxyService],
  controllers: [OpenClawProxyController],
  exports: [OpenClawProxyService],
})
export class OpenClawProxyModule {}

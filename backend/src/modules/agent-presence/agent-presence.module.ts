import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentPresenceController } from './agent-presence.controller';
import { AgentPresenceService } from './agent-presence.service';
import { UserAgent } from '../../entities/user-agent.entity';
import { ConversationEvent } from '../../entities/conversation-event.entity';
import { AgentSharePolicy } from '../../entities/agent-share-policy.entity';
import { AgentMemory } from '../../entities/agent-memory.entity';

// Channel layer
import { ChannelRegistry } from './channel/channel-registry';
import { PresenceRouterService } from './channel/presence-router.service';
import { TelegramAdapter } from './channel/telegram.adapter';
import { DiscordAdapter } from './channel/discord.adapter';
import { TwitterAdapter } from './channel/twitter.adapter';

// Phase 4: Enterprise & global channel adapters
import { FeishuAdapter } from './channel/feishu.adapter';
import { WecomAdapter } from './channel/wecom.adapter';
import { SlackAdapter } from './channel/slack.adapter';
import { WhatsAppAdapter } from './channel/whatsapp.adapter';

// Phase 3: Session Handoff + Device Presence
import { SessionHandoff } from '../../entities/session-handoff.entity';
import { DevicePresence } from '../../entities/device-presence.entity';
import { SessionHandoffService } from './handoff/session-handoff.service';
import { PresenceGateway } from './handoff/presence.gateway';

// Phase 5: Scheduled tasks + Operations dashboard
import { AgentScheduledTask } from '../../entities/agent-scheduled-task.entity';
import { AgentTaskSchedulerService } from './scheduler/agent-task-scheduler.service';
import { OperationsDashboardService } from './scheduler/operations-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAgent,
      ConversationEvent,
      AgentSharePolicy,
      AgentMemory,
      SessionHandoff,
      DevicePresence,
      AgentScheduledTask,
    ]),
  ],
  controllers: [AgentPresenceController],
  providers: [
    AgentPresenceService,
    ChannelRegistry,
    PresenceRouterService,
    TelegramAdapter,
    DiscordAdapter,
    TwitterAdapter,
    // Phase 4
    FeishuAdapter,
    WecomAdapter,
    SlackAdapter,
    WhatsAppAdapter,
    // Phase 3
    SessionHandoffService,
    PresenceGateway,
    // Phase 5
    AgentTaskSchedulerService,
    OperationsDashboardService,
  ],
  exports: [
    AgentPresenceService,
    ChannelRegistry,
    PresenceRouterService,
    SessionHandoffService,
    AgentTaskSchedulerService,
    OperationsDashboardService,
  ],
})
export class AgentPresenceModule implements OnModuleInit {
  constructor(
    private readonly registry: ChannelRegistry,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly discordAdapter: DiscordAdapter,
    private readonly twitterAdapter: TwitterAdapter,
    private readonly feishuAdapter: FeishuAdapter,
    private readonly wecomAdapter: WecomAdapter,
    private readonly slackAdapter: SlackAdapter,
    private readonly whatsappAdapter: WhatsAppAdapter,
  ) {}

  onModuleInit() {
    this.registry.register(this.telegramAdapter);
    this.registry.register(this.discordAdapter);
    this.registry.register(this.twitterAdapter);
    this.registry.register(this.feishuAdapter);
    this.registry.register(this.wecomAdapter);
    this.registry.register(this.slackAdapter);
    this.registry.register(this.whatsappAdapter);
  }
}

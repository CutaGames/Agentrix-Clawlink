import { Controller, Get, UseGuards } from '@nestjs/common';
import { VoiceSessionStore } from './voice-session.store';
import { VoiceABTestService } from './voice-ab-test.service';
import { RealtimeVoiceGateway } from './realtime-voice.gateway';

/**
 * VoiceMetricsController — Observability endpoints for voice system.
 *
 * Provides:
 * - /voice/metrics — Session counts, latency stats, provider usage
 * - /voice/metrics/ab — A/B test results
 * - /voice/metrics/health — Gateway health check
 *
 * These endpoints power the admin dashboard and alerting.
 */
@Controller('voice/metrics')
export class VoiceMetricsController {
  constructor(
    private readonly sessionStore: VoiceSessionStore,
    private readonly abTestService: VoiceABTestService,
    private readonly gateway: RealtimeVoiceGateway,
  ) {}

  @Get()
  async getMetrics() {
    const sessionMetrics = await this.sessionStore.getMetrics();
    const wsConnections = this.gateway.getActiveSessionCount();

    return {
      timestamp: new Date().toISOString(),
      sessions: {
        total: sessionMetrics.totalSessions,
        active: sessionMetrics.activeSessions,
        avgTurnsPerSession: sessionMetrics.avgTurnsPerSession,
      },
      latency: sessionMetrics.avgLatency,
      websocket: {
        activeConnections: wsConnections,
      },
    };
  }

  @Get('ab')
  getABTestResults() {
    return {
      timestamp: new Date().toISOString(),
      results: this.abTestService.getResults(),
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeWsSessions: this.gateway.getActiveSessionCount(),
    };
  }
}

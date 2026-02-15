"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TickController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickController = void 0;
const common_1 = require("@nestjs/common");
const tick_service_1 = require("./tick.service");
const agent_communication_service_1 = require("./agent-communication.service");
let TickController = TickController_1 = class TickController {
    constructor(tickService, agentCommunicationService) {
        this.tickService = tickService;
        this.agentCommunicationService = agentCommunicationService;
        this.logger = new common_1.Logger(TickController_1.name);
    }
    async executeTick(body) {
        this.logger.log(`Tick 触发请求: ${body.triggeredBy || 'manual'}`);
        const result = await this.tickService.executeTick(body.triggeredBy || 'manual');
        return {
            success: true,
            data: result,
        };
    }
    async getStatus() {
        const tickResult = await this.tickService.manualTick();
        return {
            success: true,
            data: {
                agents: tickResult.agentStatuses,
                budgetStatus: tickResult.budgetStatus,
                tasksProcessed: tickResult.tasksProcessed,
                timestamp: new Date(),
            },
        };
    }
    async getExecutions(limit, status) {
        return this.tickService.getExecutions({
            limit: limit ? Number(limit) : undefined,
            status,
        });
    }
    async getStats(days) {
        return this.tickService.getStats(days ? Number(days) : 7);
    }
    async addTask(body) {
        this.logger.log(`新任务: ${body.title} -> ${body.assignedTo}`);
        return {
            success: true,
            message: 'Task creation moved to TaskQueueService. Use /api/hq/tick endpoint to trigger execution.',
        };
    }
    async updateAgentStatus(body) {
        return {
            success: true,
            message: `Agent status is now managed automatically. Use GET /status to view current state.`,
        };
    }
    async recordSpending(body) {
        return {
            success: true,
            message: `Spending is now tracked automatically. Use GET /status to view budget status.`,
        };
    }
    async sendAgentMessage(body) {
        const message = await this.agentCommunicationService.sendMessage(body.fromAgentCode, body.toAgentCode, body.content, {
            messageType: body.messageType,
            priority: body.priority,
            context: body.context,
        });
        return { success: true, data: message };
    }
    async getAgentMessages(agentCode) {
        const messages = await this.agentCommunicationService.getPendingMessages(agentCode);
        return { success: true, data: messages };
    }
    async delegateTask(body) {
        const result = await this.agentCommunicationService.delegateTask(body.fromAgentCode, body.toAgentCode, {
            taskTitle: body.taskTitle,
            taskDescription: body.taskDescription,
            priority: body.priority,
            estimatedCost: body.estimatedCost,
            requiredSkills: body.requiredSkills,
        });
        return { success: true, data: result };
    }
    async requestHelp(body) {
        const response = await this.agentCommunicationService.requestHelp(body.fromAgentCode, body.toAgentCode, body.question, body.context);
        return { success: true, data: { response } };
    }
    async broadcastMessage(body) {
        const sentCount = await this.agentCommunicationService.broadcastMessage(body.fromAgentCode, body.content, {
            priority: body.priority,
            excludeAgents: body.excludeAgents,
        });
        return { success: true, data: { sentCount } };
    }
    async getCommunicationStats() {
        const stats = this.agentCommunicationService.getStats();
        return { success: true, data: stats };
    }
};
exports.TickController = TickController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "executeTick", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('executions'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getExecutions", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('task'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "addTask", null);
__decorate([
    (0, common_1.Post)('agent-status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "updateAgentStatus", null);
__decorate([
    (0, common_1.Post)('spending'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "recordSpending", null);
__decorate([
    (0, common_1.Post)('communicate/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "sendAgentMessage", null);
__decorate([
    (0, common_1.Get)('communicate/messages/:agentCode'),
    __param(0, (0, common_1.Param)('agentCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getAgentMessages", null);
__decorate([
    (0, common_1.Post)('communicate/delegate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "delegateTask", null);
__decorate([
    (0, common_1.Post)('communicate/request-help'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "requestHelp", null);
__decorate([
    (0, common_1.Post)('communicate/broadcast'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "broadcastMessage", null);
__decorate([
    (0, common_1.Get)('communicate/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getCommunicationStats", null);
exports.TickController = TickController = TickController_1 = __decorate([
    (0, common_1.Controller)('hq/tick'),
    __metadata("design:paramtypes", [tick_service_1.TickService,
        agent_communication_service_1.AgentCommunicationService])
], TickController);
//# sourceMappingURL=tick.controller.js.map
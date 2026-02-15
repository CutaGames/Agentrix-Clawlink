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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickController = exports.ExecuteTickDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tick_service_1 = require("../../hq/tick/tick.service");
class ExecuteTickDto {
}
exports.ExecuteTickDto = ExecuteTickDto;
let TickController = class TickController {
    constructor(tickService) {
        this.tickService = tickService;
    }
    async executeTick(dto) {
        const result = await this.tickService.executeTick(dto.type || 'manual');
        return {
            success: true,
            message: 'Tick execution completed',
            agentId: dto.agentId,
            type: dto.type || 'manual',
            result,
        };
    }
    async getExecutions(agentId, limit, status) {
        const result = await this.tickService.getExecutions({
            limit: limit ? Number(limit) : undefined,
            status,
        });
        return result;
    }
    async getStats(agentId, days) {
        return this.tickService.getStats(days ? Number(days) : 7);
    }
    async getAgentStatus(agentId) {
        return this.tickService.getAgentStatus(agentId);
    }
    async pauseAgent(agentId) {
        return this.tickService.pauseAgent(agentId);
    }
    async resumeAgent(agentId) {
        return this.tickService.resumeAgent(agentId);
    }
};
exports.TickController = TickController;
__decorate([
    (0, common_1.Post)('execute'),
    (0, swagger_1.ApiOperation)({ summary: '手动触发Tick执行' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tick执行已启动' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ExecuteTickDto]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "executeTick", null);
__decorate([
    (0, common_1.Get)('executions'),
    (0, swagger_1.ApiOperation)({ summary: '获取Tick执行历史' }),
    (0, swagger_1.ApiQuery)({ name: 'agentId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '返回执行历史列表' }),
    __param(0, (0, common_1.Query)('agentId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getExecutions", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: '获取Tick统计数据' }),
    (0, swagger_1.ApiQuery)({ name: 'agentId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '返回统计数据' }),
    __param(0, (0, common_1.Query)('agentId')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('agents/:agentId/status'),
    (0, swagger_1.ApiOperation)({ summary: '获取Agent的Tick状态' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '返回Agent状态' }),
    __param(0, (0, common_1.Param)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "getAgentStatus", null);
__decorate([
    (0, common_1.Post)('agents/:agentId/pause'),
    (0, swagger_1.ApiOperation)({ summary: '暂停Agent的自动Tick' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Agent已暂停' }),
    __param(0, (0, common_1.Param)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "pauseAgent", null);
__decorate([
    (0, common_1.Post)('agents/:agentId/resume'),
    (0, swagger_1.ApiOperation)({ summary: '恢复Agent的自动Tick' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Agent已恢复' }),
    __param(0, (0, common_1.Param)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TickController.prototype, "resumeAgent", null);
exports.TickController = TickController = __decorate([
    (0, swagger_1.ApiTags)('agent-tick'),
    (0, common_1.Controller)('hq/tick'),
    __metadata("design:paramtypes", [tick_service_1.TickService])
], TickController);
//# sourceMappingURL=tick.controller.js.map
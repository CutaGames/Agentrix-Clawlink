/**
 * Skill Controller
 * 
 * REST API for Skill management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkillService, CreateSkillDto, UpdateSkillDto } from './skill.service';
import { SkillCategory, SkillStatus } from '../../entities/hq-skill.entity';

@Controller('hq/skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  /**
   * 创建技能
   * POST /api/hq/skills
   */
  @Post()
  async createSkill(@Body() dto: CreateSkillDto) {
    const skill = await this.skillService.createSkill(dto);
    return {
      success: true,
      data: skill,
    };
  }

  /**
   * 获取所有技能
   * GET /api/hq/skills
   */
  @Get()
  async getAllSkills(
    @Query('category') category?: SkillCategory,
    @Query('status') status?: SkillStatus,
  ) {
    const skills = await this.skillService.getAllSkills({ category, status });
    return {
      success: true,
      data: skills,
      total: skills.length,
    };
  }

  /**
   * 获取技能统计
   * GET /api/hq/skills/stats
   */
  @Get('stats')
  async getSkillStats() {
    const stats = await this.skillService.getSkillStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 获取单个技能
   * GET /api/hq/skills/:id
   */
  @Get(':id')
  async getSkill(@Param('id') id: string) {
    const skill = await this.skillService.getSkill(id);
    return {
      success: true,
      data: skill,
    };
  }

  /**
   * 更新技能
   * PUT /api/hq/skills/:id
   */
  @Put(':id')
  async updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    const skill = await this.skillService.updateSkill(id, dto);
    return {
      success: true,
      data: skill,
    };
  }

  /**
   * 删除技能
   * DELETE /api/hq/skills/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSkill(@Param('id') id: string) {
    await this.skillService.deleteSkill(id);
  }

  /**
   * 为 Agent 分配技能
   * POST /api/hq/skills/assign/:agentId
   */
  @Post('assign/:agentId')
  async assignSkillsToAgent(
    @Param('agentId') agentId: string,
    @Body('skillIds') skillIds: string[],
  ) {
    const agent = await this.skillService.assignSkillsToAgent(agentId, skillIds);
    return {
      success: true,
      data: agent,
    };
  }

  /**
   * 获取 Agent 的技能
   * GET /api/hq/skills/agent/:agentId
   */
  @Get('agent/:agentId')
  async getAgentSkills(@Param('agentId') agentId: string) {
    const skills = await this.skillService.getAgentSkills(agentId);
    return {
      success: true,
      data: skills,
    };
  }
}

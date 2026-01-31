/**
 * Project Controller
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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectService, RegisterProjectDto, ProjectMetrics } from './project.service';
import { Project } from '../../entities/project.entity';

@ApiTags('HQ Projects')
@Controller('projects')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '注册新项目' })
  async registerProject(@Body() dto: RegisterProjectDto): Promise<Project> {
    return this.projectService.registerProject(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有项目' })
  async getAllProjects(): Promise<Project[]> {
    return this.projectService.getAllProjects();
  }

  @Get('metrics')
  @ApiOperation({ summary: '获取所有项目汇总指标' })
  async getAggregatedMetrics() {
    return this.projectService.getAggregatedMetrics();
  }

  @Get(':projectId')
  @ApiOperation({ summary: '获取单个项目' })
  async getProject(@Param('projectId') projectId: string): Promise<Project> {
    return this.projectService.getProject(projectId);
  }

  @Get(':projectId/metrics')
  @ApiOperation({ summary: '获取项目指标' })
  async getProjectMetrics(@Param('projectId') projectId: string): Promise<ProjectMetrics> {
    return this.projectService.getProjectMetrics(projectId);
  }

  @Put(':projectId')
  @ApiOperation({ summary: '更新项目配置' })
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() dto: Partial<RegisterProjectDto>,
  ): Promise<Project> {
    return this.projectService.updateProject(projectId, dto);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: '删除项目' })
  async deleteProject(@Param('projectId') projectId: string): Promise<{ success: boolean }> {
    await this.projectService.deleteProject(projectId);
    return { success: true };
  }

  @Post(':projectId/verify')
  @ApiOperation({ summary: '验证项目连接' })
  async verifyConnection(@Param('projectId') projectId: string): Promise<{ healthy: boolean }> {
    const healthy = await this.projectService.verifyProjectConnection(projectId);
    return { healthy };
  }

  @Post(':projectId/api')
  @ApiOperation({ summary: '调用项目 API (代理)' })
  async callProjectApi(
    @Param('projectId') projectId: string,
    @Body() body: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; data?: any },
  ) {
    return this.projectService.callProjectApi(projectId, body.method, body.path, body.data);
  }
}

/**
 * Project Management Service
 * 
 * 管理多个接入 HQ 的项目
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { Project, ProjectStatus, ProjectCapability } from '../../entities/project.entity';

export interface RegisterProjectDto {
  name: string;
  slug: string;
  description?: string;
  apiUrl: string;
  apiKey?: string;
  capabilities?: ProjectCapability[];
  config?: {
    healthCheckPath?: string;
    metricsPath?: string;
    eventsPath?: string;
    authType?: 'api_key' | 'oauth2' | 'jwt';
    customHeaders?: Record<string, string>;
  };
}

export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  revenue24h: number;
  revenueChange: number;
  activeUsers: number;
  orderCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  systemHealth: 'healthy' | 'degraded' | 'down';
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  private projectClients: Map<string, AxiosInstance> = new Map();

  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private configService: ConfigService,
  ) {
    this.initializeProjectClients();
  }

  /**
   * 注册新项目
   */
  async registerProject(dto: RegisterProjectDto): Promise<Project> {
    // 检查是否已存在
    const existing = await this.projectRepo.findOne({
      where: [{ name: dto.name }, { slug: dto.slug }],
    });
    if (existing) {
      throw new BadRequestException(`Project with name "${dto.name}" or slug "${dto.slug}" already exists`);
    }

    const project = this.projectRepo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      apiUrl: dto.apiUrl,
      apiKey: dto.apiKey,
      capabilities: dto.capabilities || [],
      config: dto.config || {
        healthCheckPath: '/api/health',
        metricsPath: '/api/metrics',
        authType: 'api_key',
      },
      status: ProjectStatus.PENDING,
    });

    const saved = await this.projectRepo.save(project);
    this.logger.log(`Registered new project: ${saved.name} (${saved.id})`);

    // 验证连接
    await this.verifyProjectConnection(saved.id);

    // 创建 API 客户端
    this.createProjectClient(saved);

    return saved;
  }

  /**
   * 获取所有项目
   */
  async getAllProjects(): Promise<Project[]> {
    return this.projectRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 获取单个项目
   */
  async getProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  /**
   * 更新项目配置
   */
  async updateProject(projectId: string, updates: Partial<RegisterProjectDto>): Promise<Project> {
    const project = await this.getProject(projectId);
    Object.assign(project, updates);
    const saved = await this.projectRepo.save(project);

    // 重建 API 客户端
    this.createProjectClient(saved);

    return saved;
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.projectRepo.update(projectId, { isActive: false });
    this.projectClients.delete(projectId);
    this.logger.log(`Deactivated project: ${projectId}`);
  }

  /**
   * 验证项目连接
   */
  async verifyProjectConnection(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    const healthPath = project.config?.healthCheckPath || '/api/health';

    try {
      const startTime = Date.now();
      const response = await axios.get(`${project.apiUrl}${healthPath}`, {
        timeout: 5000,
        headers: this.getProjectHeaders(project),
      });
      const responseTime = Date.now() - startTime;

      await this.projectRepo.update(projectId, {
        status: ProjectStatus.ACTIVE,
        lastHealthCheck: {
          status: 'healthy',
          checkedAt: new Date().toISOString(),
          responseTime,
        },
      });

      this.logger.log(`Project ${project.name} health check passed (${responseTime}ms)`);
      return true;
    } catch (error) {
      await this.projectRepo.update(projectId, {
        status: ProjectStatus.ERROR,
        lastHealthCheck: {
          status: 'down',
          checkedAt: new Date().toISOString(),
          error: error.message,
        },
      });

      this.logger.warn(`Project ${project.name} health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取项目指标
   */
  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const project = await this.getProject(projectId);
    const client = this.getProjectClient(projectId);

    if (!client) {
      return this.getDefaultMetrics(project);
    }

    try {
      const metricsPath = project.config?.metricsPath || '/api/hq/metrics';
      const response = await client.get(metricsPath);

      const metrics = {
        projectId: project.id,
        projectName: project.name,
        revenue24h: response.data?.revenue24h || 0,
        revenueChange: response.data?.revenueChange || 0,
        activeUsers: response.data?.activeUsers || 0,
        orderCount: response.data?.orderCount || 0,
        riskLevel: response.data?.riskLevel || 'low',
        systemHealth: response.data?.systemHealth || 'healthy',
      };

      // 保存快照
      await this.projectRepo.update(projectId, {
        metricsSnapshot: {
          revenue24h: metrics.revenue24h,
          activeUsers: metrics.activeUsers,
          orderCount: metrics.orderCount,
          capturedAt: new Date().toISOString(),
        },
      });

      return metrics;
    } catch (error) {
      this.logger.warn(`Failed to get metrics for ${project.name}: ${error.message}`);
      return this.getDefaultMetrics(project);
    }
  }

  /**
   * 获取所有项目的汇总指标
   */
  async getAggregatedMetrics(): Promise<{
    totalRevenue24h: number;
    totalActiveUsers: number;
    totalOrderCount: number;
    projectCount: number;
    healthyProjects: number;
    projects: ProjectMetrics[];
  }> {
    const projects = await this.getAllProjects();
    const metricsPromises = projects.map(p => this.getProjectMetrics(p.id));
    const allMetrics = await Promise.all(metricsPromises);

    const totalRevenue24h = allMetrics.reduce((sum, m) => sum + m.revenue24h, 0);
    const totalActiveUsers = allMetrics.reduce((sum, m) => sum + m.activeUsers, 0);
    const totalOrderCount = allMetrics.reduce((sum, m) => sum + m.orderCount, 0);
    const healthyProjects = allMetrics.filter(m => m.systemHealth === 'healthy').length;

    return {
      totalRevenue24h,
      totalActiveUsers,
      totalOrderCount,
      projectCount: projects.length,
      healthyProjects,
      projects: allMetrics,
    };
  }

  /**
   * 调用项目 API
   */
  async callProjectApi<T>(
    projectId: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
  ): Promise<T> {
    const client = this.getProjectClient(projectId);
    if (!client) {
      throw new BadRequestException(`Project ${projectId} client not available`);
    }

    const response = await client.request({
      method,
      url: path,
      data,
    });

    return response.data;
  }

  /**
   * 定时健康检查
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthChecks(): Promise<void> {
    const projects = await this.getAllProjects();
    for (const project of projects) {
      await this.verifyProjectConnection(project.id);
    }
  }

  /**
   * 初始化项目客户端
   */
  private async initializeProjectClients(): Promise<void> {
    try {
      const projects = await this.projectRepo.find({ where: { isActive: true } });
      projects.forEach(project => this.createProjectClient(project));
      this.logger.log(`Initialized ${projects.length} project clients`);
    } catch (error) {
      this.logger.warn('Failed to initialize project clients (database may not be ready)');
    }
  }

  /**
   * 创建项目 API 客户端
   */
  private createProjectClient(project: Project): void {
    const client = axios.create({
      baseURL: project.apiUrl,
      timeout: 10000,
      headers: this.getProjectHeaders(project),
    });

    this.projectClients.set(project.id, client);
  }

  /**
   * 获取项目客户端
   */
  private getProjectClient(projectId: string): AxiosInstance | undefined {
    return this.projectClients.get(projectId);
  }

  /**
   * 获取项目请求头
   */
  private getProjectHeaders(project: Project): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (project.apiKey) {
      headers['X-API-Key'] = project.apiKey;
    }

    if (project.config?.customHeaders) {
      Object.assign(headers, project.config.customHeaders);
    }

    return headers;
  }

  /**
   * 获取默认指标
   */
  private getDefaultMetrics(project: Project): ProjectMetrics {
    return {
      projectId: project.id,
      projectName: project.name,
      revenue24h: project.metricsSnapshot?.revenue24h || 0,
      revenueChange: 0,
      activeUsers: project.metricsSnapshot?.activeUsers || 0,
      orderCount: project.metricsSnapshot?.orderCount || 0,
      riskLevel: 'low',
      systemHealth: project.lastHealthCheck?.status === 'healthy' ? 'healthy' : 'degraded',
    };
  }
}

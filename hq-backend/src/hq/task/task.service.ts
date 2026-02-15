import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTask, TaskStatus, TaskPriority } from '../../entities/agent-task.entity';
import { HqAgent } from '../../entities/hq-agent.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
  ) {}

  async getBoard() {
    const agents = await this.agentRepo.find({ where: { isActive: true } });
    const tasks = await this.taskRepo.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
      relations: ['assignedTo'],
    });

    // Group tasks by agent
    const columns = agents.map(agent => ({
      agentCode: agent.id,
      agentName: agent.name,
      tasks: tasks.filter(t => t.assignedToId === agent.id || (t.assignedTo && t.assignedTo.id === agent.id)),
    }));

    // Add "Unassigned" column if needed
    const unassignedTasks = tasks.filter(t => !t.assignedToId);
    if (unassignedTasks.length > 0) {
      columns.push({
        agentCode: 'unassigned',
        agentName: '未分配',
        tasks: unassignedTasks,
      });
    }

    return columns;
  }

  async createTask(dto: any) {
    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority || TaskPriority.NORMAL,
      assignedToId: dto.agentCode === 'unassigned' ? null : dto.agentCode,
      status: TaskStatus.PENDING,
    });
    return this.taskRepo.save(task);
  }

  async deleteTask(id: string) {
    return this.taskRepo.delete(id);
  }

  async executeTaskNow(id: string) {
    const task = await this.taskRepo.findOne({ where: { id }, relations: ['assignedTo'] });
    if (!task) throw new Error('Task not found');

    // In a real implementation, this would trigger the agent's action loop
    // For now, we simulate success and update status
    task.status = TaskStatus.IN_PROGRESS;
    await this.taskRepo.save(task);

    this.logger.log(`Executing task ${id}: ${task.title}`);
    
    // Simulate some work
    setTimeout(async () => {
      task.status = TaskStatus.COMPLETED;
      task.result = `[Auto-generated] Task completed successfully at ${new Date().toISOString()}`;
      await this.taskRepo.save(task);
    }, 2000);

    return { message: 'Task execution started', taskId: id };
  }
}

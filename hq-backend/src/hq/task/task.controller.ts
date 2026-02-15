import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('hq/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('board')
  async getBoard() {
    return this.taskService.getBoard();
  }

  @Post()
  async createTask(@Body() dto: any) {
    return this.taskService.createTask(dto);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }

  @Post(':id/execute')
  async executeTaskNow(@Param('id') id: string) {
    return this.taskService.executeTaskNow(id);
  }
}

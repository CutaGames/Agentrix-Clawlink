import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { SkillService } from './skill.service';
import { Skill, SkillStatus } from '../../entities/skill.entity';

@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Post()
  create(@Body() createSkillDto: Partial<Skill>) {
    return this.skillService.create(createSkillDto);
  }

  @Get()
  findAll(@Query('status') status?: SkillStatus) {
    return this.skillService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSkillDto: Partial<Skill>) {
    return this.skillService.update(id, updateSkillDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skillService.remove(id);
  }

  @Get(':id/pack/:platform')
  generatePack(
    @Param('id') id: string,
    @Param('platform') platform: 'openai' | 'claude' | 'gemini' | 'openapi',
  ) {
    return this.skillService.generatePack(id, platform);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.skillService.publish(id);
  }
}

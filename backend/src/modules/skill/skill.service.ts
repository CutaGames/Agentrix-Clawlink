import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill, SkillStatus } from '../../entities/skill.entity';
import { SkillConverterService } from './skill-converter.service';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private skillConverter: SkillConverterService,
  ) {}

  async findAll(status?: SkillStatus) {
    const query = this.skillRepository.createQueryBuilder('skill');
    if (status) {
      query.where('skill.status = :status', { status });
    }
    return query.getMany();
  }

  async findById(id: string) {
    return this.findOne(id);
  }

  async findOne(id: string) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return skill;
  }

  async incrementCallCount(id: string) {
    await this.skillRepository.increment({ id }, 'callCount', 1);
  }


  async create(data: Partial<Skill>) {
    const skill = this.skillRepository.create(data);
    // Generate platform schemas automatically if not provided
    if (!skill.platformSchemas) {
      skill.platformSchemas = {
        openai: this.skillConverter.convertToOpenAI(skill as Skill),
        claude: this.skillConverter.convertToClaude(skill as Skill),
        gemini: this.skillConverter.convertToGemini(skill as Skill),
      };
    }
    return this.skillRepository.save(skill);
  }

  async update(id: string, data: Partial<Skill>) {
    await this.skillRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const skill = await this.findOne(id);
    return this.skillRepository.remove(skill);
  }

  async generatePack(id: string, platform: 'openai' | 'claude' | 'gemini' | 'openapi') {
    const skill = await this.findOne(id);
    switch (platform) {
      case 'openai': return this.skillConverter.convertToOpenAI(skill);
      case 'claude': return this.skillConverter.convertToClaude(skill);
      case 'gemini': return this.skillConverter.convertToGemini(skill);
      case 'openapi': return this.skillConverter.convertToOpenAPI(skill);
      default: return skill.platformSchemas;
    }
  }

  async publish(id: string) {
    return this.update(id, { status: SkillStatus.PUBLISHED });
  }
}

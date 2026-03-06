import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { OpenClawInstance } from './openclaw-instance.entity';
import { User } from './user.entity';
import { Skill } from './skill.entity';

@Entity('claw_installed_skills')
@Unique(['instanceId', 'skillId'])
export class ClawInstalledSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instanceId: string;

  @Column({ type: 'uuid', nullable: true })
  installedByUserId?: string;

  @Column({ type: 'uuid' })
  skillId: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @CreateDateColumn()
  installedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => OpenClawInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instanceId' })
  instance: OpenClawInstance;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'installedByUserId' })
  installedByUser?: User;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;
}
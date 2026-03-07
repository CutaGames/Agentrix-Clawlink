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
import { User } from './user.entity';
import { Skill } from './skill.entity';

@Entity('user_installed_skills')
@Unique(['userId', 'skillId'])
export class UserInstalledSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uuid' })
  userId: string;

  @Column({ name: 'skillId', type: 'uuid' })
  skillId: string;

  @Column({ name: 'isEnabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @CreateDateColumn({ name: 'installedAt' })
  installedAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;
}

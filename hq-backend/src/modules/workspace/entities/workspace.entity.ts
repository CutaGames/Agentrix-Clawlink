/**
 * Workspace Entity
 * 
 * 工作区实体
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkspaceFile } from './workspace-file.entity';

export enum WorkspaceType {
  PROJECT = 'project',       // 项目工作区
  PERSONAL = 'personal',     // 个人工作区
  SHARED = 'shared',         // 共享工作区
}

@Entity('hq_workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ length: 1000 })
  rootPath: string;

  @Column({
    type: 'enum',
    enum: WorkspaceType,
    default: WorkspaceType.PROJECT,
  })
  type: WorkspaceType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    defaultAgent?: string;
    autoSave?: boolean;
    theme?: string;
    excludePatterns?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => WorkspaceFile, file => file.workspace)
  files: WorkspaceFile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

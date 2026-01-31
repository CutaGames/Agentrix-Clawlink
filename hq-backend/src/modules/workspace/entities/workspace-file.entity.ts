/**
 * Workspace File Entity
 * 
 * 工作区文件实体（用于追踪打开的文件）
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('hq_workspace_files')
export class WorkspaceFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 1000 })
  filePath: string;

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 50, nullable: true })
  language: string;

  @Column({ default: false })
  isOpen: boolean;

  @Column({ default: false })
  isDirty: boolean;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'int', nullable: true })
  cursorLine: number;

  @Column({ type: 'int', nullable: true })
  cursorColumn: number;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

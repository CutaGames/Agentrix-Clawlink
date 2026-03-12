import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DesktopTaskStatus {
  IDLE = 'idle',
  EXECUTING = 'executing',
  NEED_APPROVE = 'need-approve',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DesktopTimelineStatus {
  RUNNING = 'running',
  WAITING_APPROVAL = 'waiting-approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum DesktopApprovalRiskLevel {
  L0 = 'L0',
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
}

export enum DesktopApprovalDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class DesktopContextDto {
  @ApiPropertyOptional({ description: 'Foreground app/window title' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  activeWindowTitle?: string;

  @ApiPropertyOptional({ description: 'Foreground process name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  processName?: string;

  @ApiPropertyOptional({ description: 'Workspace or project hint' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  workspaceHint?: string;

  @ApiPropertyOptional({ description: 'Current file hint' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  fileHint?: string;

  @ApiPropertyOptional({ description: 'Clipboard text preview' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clipboardTextPreview?: string;
}

export class DesktopHeartbeatDto {
  @ApiProperty({ description: 'Stable local desktop device id' })
  @IsString()
  @MaxLength(120)
  deviceId: string;

  @ApiProperty({ description: 'Client platform', example: 'windows' })
  @IsString()
  @MaxLength(40)
  platform: string;

  @ApiPropertyOptional({ description: 'Desktop app version' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @ApiPropertyOptional({ description: 'Current lightweight desktop context snapshot', type: DesktopContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesktopContextDto)
  context?: DesktopContextDto;
}

export class DesktopTimelineEntryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  kind: string;

  @ApiProperty({ enum: DesktopApprovalRiskLevel })
  @IsEnum(DesktopApprovalRiskLevel)
  riskLevel: DesktopApprovalRiskLevel;

  @ApiProperty({ enum: DesktopTimelineStatus })
  @IsEnum(DesktopTimelineStatus)
  status: DesktopTimelineStatus;

  @ApiProperty()
  @IsNumber()
  startedAt: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finishedAt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  output?: string;
}

export class UpsertDesktopTaskDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  deviceId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  taskId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @ApiProperty({ enum: DesktopTaskStatus })
  @IsEnum(DesktopTaskStatus)
  status: DesktopTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  startedAt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finishedAt?: number;

  @ApiPropertyOptional({ type: [DesktopTimelineEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesktopTimelineEntryDto)
  timeline?: DesktopTimelineEntryDto[];

  @ApiPropertyOptional({ type: DesktopContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesktopContextDto)
  context?: DesktopContextDto;
}

export class CreateDesktopApprovalDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  deviceId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  taskId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  timelineEntryId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ enum: DesktopApprovalRiskLevel })
  @IsEnum(DesktopApprovalRiskLevel)
  riskLevel: DesktopApprovalRiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionKey?: string;

  @ApiPropertyOptional({ type: DesktopContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesktopContextDto)
  context?: DesktopContextDto;
}

export class RespondDesktopApprovalDto {
  @ApiProperty({ enum: DesktopApprovalDecision })
  @IsEnum(DesktopApprovalDecision)
  decision: DesktopApprovalDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rememberForSession?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
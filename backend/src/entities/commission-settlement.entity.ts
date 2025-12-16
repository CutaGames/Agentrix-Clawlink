import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { CommissionAllocation } from './commission-allocation.entity';

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('commission_settlements_v4')
export class CommissionSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', nullable: true })
  merchantId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column('numeric', { name: 'total_amount', precision: 20, scale: 6 })
  totalAmount: string;

  @Column('numeric', { name: 'merchant_amount', precision: 20, scale: 6 })
  merchantAmount: string;

  @Column('numeric', { name: 'platform_fee', precision: 20, scale: 6 })
  platformFee: string;

  @Column('numeric', { name: 'channel_fee', precision: 20, scale: 6 })
  channelFee: string;

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  @Column({ name: 'trigger_type', nullable: true })
  triggerType: string;

  @Column({ name: 'unlock_at', type: 'timestamp', nullable: true })
  unlockAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => CommissionAllocation, (allocation) => allocation.settlement, {
    cascade: true,
  })
  allocations: CommissionAllocation[];
}


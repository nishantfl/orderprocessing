import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { Order } from './order.entity';

// What: Payment record associated with an order.
// Why: Supports full and partial payments while keeping an auditable trail.
@Entity('payments')
@Index(['order'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.payments, {
    onDelete: 'CASCADE',
  })
  order!: Order;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


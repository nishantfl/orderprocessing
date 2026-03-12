import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { OrderStatus } from '../../../common/enums/order-status.enum';

// What: Order aggregate root representing a single order.
// Why: Models multi-tenant, auditable orders with optimistic locking.
@Entity('orders')
@Index(['tenantId'])
@Index(['customerId'])
@Index(['tenantId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @VersionColumn()
  version!: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: ['insert'],
  })
  items!: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPaid!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'uuid' })
  createdBy!: string;
}


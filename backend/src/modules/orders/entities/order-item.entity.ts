import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';

// What: Order line item entity.
// Why: Normalized representation of products in an order.
@Entity('order_items')
@Index(['order'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  order!: Order;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;
}


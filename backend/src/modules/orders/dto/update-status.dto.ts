import { IsEnum, IsInt, Min } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';

// What: DTO for updating an order's status with optimistic locking.
// Why: Ensures only valid status transitions and prevents lost updates.
export class UpdateStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  // Optimistic locking: client must send current version.
  // If it doesn't match DB version, update fails.
  @IsInt()
  @Min(1)
  version!: number;
}

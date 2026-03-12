import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';

// What: DTO for listing orders with pagination and filtering.
// Why: Validates query parameters for GET /v1/orders endpoint.
export class ListOrdersDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  // Filtering
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  // tenantId will be derived from JWT in production;
  // for now it can be optional in the DTO.
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

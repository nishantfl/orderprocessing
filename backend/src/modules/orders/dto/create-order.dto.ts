import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// What: DTO for a single order item in the create-order request.
// Why: Validates each line item before we enter business logic/transactions.
export class CreateOrderItemDto {
  @IsUUID('loose')
  productId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number;
}

// What: DTO for the create-order request body.
// Why: Defines and validates the input contract for POST /v1/orders.
export class CreateOrderDto {
  // For now we take tenantId/customerId from the body; once auth is in place
  // these will be derived from JWT and removed from the public contract.
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  // Optional optimistic version from the client (e.g. for idempotency keys);
  // not required for the initial create flow.
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}


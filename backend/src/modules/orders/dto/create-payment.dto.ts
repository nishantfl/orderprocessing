import { IsNumber, IsPositive } from 'class-validator';

// What: DTO for creating a payment against an order.
// Why: Validates client-supplied payment amounts before processing.
export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;
}


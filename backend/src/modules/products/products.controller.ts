import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  private readonly products = [
    { id: '10000000-0000-0000-0000-000000000001', name: 'Laptop', price: 1200.00 },
    { id: '10000000-0000-0000-0000-000000000002', name: 'Mouse', price: 25.50 },
    { id: '10000000-0000-0000-0000-000000000003', name: 'Keyboard', price: 45.00 },
    { id: '10000000-0000-0000-0000-000000000004', name: 'Monitor', price: 300.00 },
    { id: '10000000-0000-0000-0000-000000000005', name: 'Headphones', price: 80.00 },
  ];

  @Get()
  findAll() {
    return this.products;
  }
}

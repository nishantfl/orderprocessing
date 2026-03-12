import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtUser } from '../../common/types/jwt-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrdersService } from './orders.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

// What: HTTP controller for order endpoints.
// Why: Entry point for REST operations; logic stays in OrdersService.
@Controller('v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.ADMIN) // Default: both roles can access. Override per-route where needed.
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // What: List orders with pagination and filtering.
  // Why: Declared first so it matches GET /v1/orders before @Get(':id').
  // Auth: CUSTOMER sees only their orders, ADMIN sees all tenant orders.
  @Get()
  @Roles(Role.CUSTOMER, Role.ADMIN)
  list(@Query() dto: ListOrdersDto, @User() user: JwtUser) {
    const tenantId = user.tenant_id;
    if (user.role === Role.CUSTOMER) {
      dto.customerId = user.user_id;
    }
    return this.ordersService.listOrders(dto, tenantId);
  }

  // What: HTTP endpoint to create a new order.
  // Why: Thin controller that validates input via DTO then delegates to service.
  // Auth: CUSTOMER can create their own orders, ADMIN can create any.
  @Post()
  @Roles(Role.CUSTOMER, Role.ADMIN)
  create(@Body() dto: CreateOrderDto, @User() user: JwtUser) {
    // In production, override tenantId/customerId from JWT to prevent spoofing.
    dto.tenantId = user.tenant_id;
    dto.customerId = user.user_id;
    dto.createdBy = user.user_id;
    return this.ordersService.createOrder(dto);
  }

  // What: Retrieve a single order by ID.
  // Why: Clients need to fetch detailed order information.
  // Auth: CUSTOMER can view only their orders, ADMIN can view all.
  @Get(':id')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async getById(@Param('id', ParseUUIDPipe) id: string, @User() user: JwtUser) {
    const order = await this.ordersService.getOrderById(id, user.tenant_id);

    if (user.role === Role.CUSTOMER && order.customerId !== user.user_id) {
      throw new ForbiddenException({
        message: 'You can only view your own orders',
        errorCode: 'FORBIDDEN',
      });
    }

    return order;
  }

  // What: Update an order's status with optimistic locking.
  // Why: Supports order lifecycle management with concurrency control.
  // Auth: Only ADMIN can update status.
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @User() user: JwtUser,
  ) {
    return this.ordersService.updateStatus(id, user.tenant_id, dto);
  }

  // What: Cancel an order.
  // Why: Business operation for order cancellation.
  // Auth: CUSTOMER can cancel their own orders, ADMIN can cancel any.
  @Post(':id/cancel')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async cancel(@Param('id', ParseUUIDPipe) id: string, @User() user: JwtUser) {
    const order = await this.ordersService.getOrderById(id, user.tenant_id);

    if (user.role === Role.CUSTOMER && order.customerId !== user.user_id) {
      throw new ForbiddenException({
        message: 'You can only cancel your own orders',
        errorCode: 'FORBIDDEN',
      });
    }

    return this.ordersService.cancelOrder(id, user.tenant_id);
  }

  // What: Create a payment for an order (supports partial or full payments).
  // Why: Moves orders from PENDING to PROCESSING once fully paid.
  // Auth: CUSTOMER can pay their own orders, ADMIN can pay any.
  @Post(':id/payments')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async createPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
    @User() user: JwtUser,
  ) {
    const order = await this.ordersService.getOrderById(id, user.tenant_id);

    if (user.role === Role.CUSTOMER && order.customerId !== user.user_id) {
      throw new ForbiddenException({
        message: 'You can only pay for your own orders',
        errorCode: 'FORBIDDEN',
      });
    }

    return this.paymentsService.createPayment(id, user.tenant_id, dto.amount);
  }

  // What: List payments for an order.
  // Why: Allows clients to show payment history for transparency.
  // Auth: CUSTOMER can view their own order payments, ADMIN can view any.
  @Get(':id/payments')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async listPayments(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: JwtUser,
  ) {
    const order = await this.ordersService.getOrderById(id, user.tenant_id);

    if (user.role === Role.CUSTOMER && order.customerId !== user.user_id) {
      throw new ForbiddenException({
        message: 'You can only view payments for your own orders',
        errorCode: 'FORBIDDEN',
      });
    }

    return this.paymentsService.listPaymentsForOrder(id, user.tenant_id);
  }
}


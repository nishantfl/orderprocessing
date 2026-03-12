import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

// What: Health check endpoint for monitoring and orchestration.
// Why: Lets load balancers and Kubernetes determine service readiness.
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: Response) {
    const health = await this.healthService.getHealth();

    // Return 503 if unhealthy (DB down), 200 otherwise.
    const statusCode =
      health.status === 'unhealthy'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;

    return res.status(statusCode).json(health);
  }
}


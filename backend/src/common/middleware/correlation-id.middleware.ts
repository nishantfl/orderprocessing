import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// What: Middleware that attaches a correlation ID to every request/response.
// Why: Lets us trace a request across logs, background jobs, and error reports.
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const headerName = 'x-correlation-id';
    const incoming = req.headers[headerName] as string | undefined;

    const correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}


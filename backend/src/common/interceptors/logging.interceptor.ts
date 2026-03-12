import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

// What: Interceptor that logs request/response metadata.
// Why: Central place to capture latency, status, correlationId, tenantId, userId.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { correlationId?: string; user?: any }>();

    const { method, url } = req as any;
    const correlationId = req.correlationId;
    const tenantId = req.user?.tenant_id ?? req.user?.tenantId;
    const userId = req.user?.user_id ?? req.user?.id;

    return next.handle().pipe(
      tap(() => {
        const res = http.getResponse<any>();
        const statusCode = res.statusCode;
        const responseTimeMs = Date.now() - now;

        this.logger.info(
          {
            method,
            url,
            statusCode,
            responseTimeMs,
            correlationId,
            tenantId,
            userId,
          },
          'request_completed',
        );
      }),
    );
  }
}


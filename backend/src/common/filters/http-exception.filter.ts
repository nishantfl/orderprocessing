import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

// What: Global exception filter that normalizes error responses.
// Why: Ensures every error includes correlationId and a stable errorCode.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as
        | string
        | { message?: string | string[]; error?: string; errorCode?: string };

      if (typeof res === 'string') {
        message = res;
      } else if (Array.isArray(res.message)) {
        message = res.message.join(', ');
      } else if (res.message) {
        message = res.message;
      }

      if (typeof res !== 'string') {
        if (res.errorCode) {
          errorCode = res.errorCode;
        } else if (res.error) {
          errorCode = res.error.toUpperCase().replace(/\s+/g, '_');
        } else {
          errorCode = HttpStatus[status] ?? errorCode;
        }
      }
    }

    const body = {
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.correlationId,
      errorCode,
      message,
    };

    response.status(status).json(body);
  }
}


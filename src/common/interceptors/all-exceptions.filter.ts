import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

      if (response.headersSent) {
        return;
      }

      const status =
        exception instanceof HttpException ? exception.getStatus() : 500;

      let message: string | string[] = 'Internal server error';

      if (exception instanceof HttpException) {
        const res = exception.getResponse();
        if (typeof res === 'string') {
          message = res;
        } else if (typeof res === 'object' && res !== null) {
          if (Array.isArray((res as any).message)) {
            message = (res as any).message;
          } else if ('message' in res) {
            message = (res as any).message;
          }
        }
      }

      if (status >= 500) {
        this.logger.error(
          `HTTP ${status} ${request?.url ?? 'unknown'} - ${this.safeStringify(message)}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      } else if (status !== 401) {
        this.logger.warn(
          `HTTP ${status} ${request?.url ?? 'unknown'} - ${this.safeStringify(message)}`,
        );
      }

      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request?.url,
        message,
      });
    } catch (filterError) {
      // Last-resort guard: if the filter itself throws, log and return 500
      this.logger.error('Exception filter failed', filterError instanceof Error ? filterError.stack : filterError);
    }
  }

  private safeStringify(value: unknown): string {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}


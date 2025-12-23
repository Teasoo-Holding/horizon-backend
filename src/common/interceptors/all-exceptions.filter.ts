import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
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
          message = (res as any).message; // keep full validation errors
        } else if ('message' in res) {
          message = (res as any).message;
        }
      }
    }

    if (status >= 500) {
      Logger.error(
        `HTTP Status: ${status} - Error Message: ${JSON.stringify(message)}`,
        (exception as any).stack,
      );
    } else if (status === 401) {
      // Silence common unauthorized errors or log as debug/verbose if needed
      // Logger.debug(`Unauthorized access attempt to ${request.url}`);
    } else {
      Logger.warn(
        `HTTP Status: ${status} - Error Message: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}


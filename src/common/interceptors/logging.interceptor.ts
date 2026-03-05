import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl } = request;
    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const elapsed = Date.now() - now;
        if (process.env.NODE_ENV !== 'production') {
          let responseSize = 0;
          try {
            responseSize = data ? JSON.stringify(data).length : 0;
          } catch {
            responseSize = -1; // circular or non-serializable
          }
          this.logger.log(
            `[${method}] ${originalUrl} ${elapsed}ms size:${responseSize}b`,
          );
        } else {
          this.logger.log(`[${method}] ${originalUrl} ${elapsed}ms`);
        }
      }),
      catchError((error) => {
        const elapsed = Date.now() - now;
        this.logger.error(
          `[${method}] ${originalUrl} ${elapsed}ms - Error: ${error?.message || 'Unknown'}`,
        );
        return throwError(() => error);
      }),
    );
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl } = request;
    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const elapsed = Date.now() - now;
        if (process.env.NODE_ENV !== 'production') {
          const responseSize = data ? JSON.stringify(data).length : 0;
          console.log(
            `[${method}] ${originalUrl} took ${elapsed}ms, size: ${responseSize} bytes`,
          );
        } else {
          console.log(`[${method}] ${originalUrl} took ${elapsed}ms`);
        }
      }),
    );
  }
}

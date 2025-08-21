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
    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const responseSize = JSON.stringify(data).length;
        // Object.keys(data).length
        console.log(
          `Response: took ${Date.now() - now}ms, size: ${responseSize} bytes`,
        );
      }),
    );
  }
}

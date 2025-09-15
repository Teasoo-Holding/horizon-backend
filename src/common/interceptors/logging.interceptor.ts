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
        const responseSize = JSON.stringify(data).length;
        console.log(
          `[${method}] ${originalUrl} took ${Date.now() - now}ms, size: ${responseSize} bytes`,
        );
      }),
    );
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const timeToWait = Math.ceil(throttlerLimitDetail.timeToExpire / 1000);
    throw new ThrottlerException(`Too many requests. Please wait ${timeToWait} seconds before retrying.`);
  }
}
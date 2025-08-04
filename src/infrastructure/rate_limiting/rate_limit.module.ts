import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RateLimitRepository } from '../../common/rate_limiting/rate_limit.repository';

@Module({
  imports: [PrismaModule],
  providers: [RateLimitRepository],
  exports: [RateLimitRepository],
})
export class RateLimitModule {}
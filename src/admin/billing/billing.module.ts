import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminBillingController } from './billing.controller';
import { AdminBillingService } from './billing.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminBillingController],
  providers: [AdminBillingService],
  exports: [AdminBillingService]
})
export class AdminBillingModule {}

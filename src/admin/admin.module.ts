import { Module } from '@nestjs/common';
import { AdminAuditLogService } from './audit/audit-log.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminAuditLogService],
  exports: [AdminAuditLogService],
})
export class AdminModule {}

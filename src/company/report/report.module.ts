import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [ReportController],
  providers: [ReportService, PrismaClient],
  exports: [ReportService],
})
export class ReportModule {}

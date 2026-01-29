import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TargetModule } from '../target/target.module';

@Module({
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
  imports: [TargetModule],
})
export class ReportModule {}

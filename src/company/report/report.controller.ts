import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: { user: { id: number } },
  ) {
  console.log("User...", req)
    // return this.reportService.findOrganizationAssessmentReport(1);
    return `Here is the controller, ${req}`
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findReportDetail(+id);
  }
}

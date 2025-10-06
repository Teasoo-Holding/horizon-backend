import { Controller, Get, Param, Delete } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}


  @Get()
  findAll() {
    return this.reportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(+id);
  }


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportService.remove(+id);
  }
}

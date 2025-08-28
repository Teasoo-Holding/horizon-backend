// assessment.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('save')
  async saveAssessment(@Body() createAssessmentDto: CreateAssessmentDto) {
    const { subsidiary, startYear, startMonth, metricType } =
      createAssessmentDto;
    const result = await this.assessmentService.createOrUpdateAssessment(
      subsidiary,
      startYear,
      startMonth,
      metricType,
      createAssessmentDto,
    );
    return result;
  }

  @Get(':id')
  async getAssessment(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.findAssessmentById(id);
  }
}

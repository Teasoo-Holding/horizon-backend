import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AssessmentService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentDto } from './dto/assessment.dto';

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  async create(
    @Body() createAssessmentDto: CreateAssessmentDto,
  ): Promise<AssessmentDto> {
    return this.assessmentService.create(createAssessmentDto);
  }

  @Get()
  async findAll(): Promise<AssessmentDto[]> {
    return this.assessmentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AssessmentDto> {
    const assessment = await this.assessmentService.findOne(id);
    if (!assessment) {
      throw new HttpException('Assessment not found', HttpStatus.NOT_FOUND);
    }
    return assessment;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<AssessmentDto> {
    const assessment = await this.assessmentService.update(
      id,
      updateAssessmentDto,
    );
    if (!assessment) {
      throw new HttpException('Assessment not found', HttpStatus.NOT_FOUND);
    }
    return assessment;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const success = await this.assessmentService.remove(id);
    if (!success) {
      throw new HttpException('Assessment not found', HttpStatus.NOT_FOUND);
    }
  }
}

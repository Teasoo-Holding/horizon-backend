import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AssessmentService } from './assessments.service';
import { AssessmentPayloadDto } from './dto/assessment.dto';
import { Request } from 'express';
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

interface CustomRequest extends Request {
  user: {
    id: number;
    companyId: number;
  };
}

@ApiTags('Company - Assessment')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtRolesGuard)
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Get()
  async getAssessments(@Req() req: CustomRequest) {
    const companyId = req.user.companyId;
    const assessments = await this.assessmentService.getAssessments(companyId);
    return { data: assessments };
  }

  @Get(':id')
  async getAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string,
  ) {
    const companyId = req.user.companyId;

    const id = parseInt(assessmentId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid assessment ID provided.');
    }

    const assessment = await this.assessmentService.getAssessment(
      companyId,
      id,
    );

    return { data: assessment };
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createAssessment(@Req() req: CustomRequest) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;
    const assessment = await this.assessmentService.createAssessment(
      companyId,
      currentUserId,
    );
    return { assessmentId: assessment.id };
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  async saveAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string,
    @Body() data: AssessmentPayloadDto,
  ) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;

    const id = parseInt(assessmentId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid assessment ID provided.');
    }

    const assessment = await this.assessmentService.saveAssessment(
      companyId,
      currentUserId,
      id,
      data,
    );

    return { message: 'Assessment data saved successfully.', data: assessment };
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string,
    @Body() data: AssessmentPayloadDto,
  ) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;

    const id = parseInt(assessmentId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid assessment ID provided.');
    }

    const jsonData = data as unknown as Prisma.JsonValue;

    const assessment = await this.assessmentService.submitAssessment(
      companyId,
      currentUserId,
      id,
      jsonData,
    );

    return {
      message: 'Assessment submitted successfully.',
      assessment,
      totals:
        (assessment.assessmentData as Record<string, any>)?.totals ?? null,
    };
  }
}
 
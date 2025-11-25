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
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentService } from './assessments.service';
import { Request } from 'express';
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { PartialAssessmentPayloadDto } from './dto/partial-assessment-payload.dto';

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

  @Post()
  async createAssessment(
    @Req() req: CustomRequest,
    @Body() dto: CreateAssessmentDto,
  ) {
    const { companyId, id: userId } = req.user;
    const assessment = await this.assessmentService.createAssessment(
      companyId,
      userId,
      dto,
    );
    return { data: assessment };
  }

  @Post(':id/save')
  async saveProgress(
    @Req() req: CustomRequest,
    @Param('id') idStr: string,
    @Body() payload: PartialAssessmentPayloadDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const assessmentId = this.parseId(idStr);

    const assessment = await this.assessmentService.saveProgress(
      companyId,
      userId,
      assessmentId,
      payload,
    );

    return { message: 'Progress saved', data: assessment };
  }

  @Post(':id/submit')
  async submitGroup(
    @Req() req: CustomRequest,
    @Param('id') idStr: string,
    @Body() body: { lastSavedForm?: string },
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const assessmentId = this.parseId(idStr);

    const result = await this.assessmentService.submitGroup(
      companyId,
      userId,
      assessmentId,
      body.lastSavedForm,
    );

    return {
      message: 'Group submitted',
      assessment: result.assessment,
      scopeTotals: result.scopeTotals,
      progress: result.progress,
      totals: result.totals,
    };
  }

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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDraftAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string,
  ) {
    const companyId = req.user.companyId;

    const id = parseInt(assessmentId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid assessment ID provided.');
    }

    try {
      await this.assessmentService.deleteAssessment(companyId, id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'AssessmentNotFound') {
          throw new NotFoundException(
            `Assessment with ID ${id} not found or does not belong to your company.`,
          );
        }
        if (error.message === 'AssessmentNotDraft') {
          throw new BadRequestException(
            `Assessment with ID ${id} cannot be deleted because it is not in 'draft' status.`,
          );
        }
      }
      throw error;
    }
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string,
  ) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;

    const id = parseInt(assessmentId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid assessment ID provided.');
    }

    const assessment = await this.assessmentService.approveAssessment(
      companyId,
      currentUserId,
      id,
    );

    return { message: 'Assessment approved successfully.', data: assessment };
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  async rejectAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string,
    @Body('reason') rejectionReason: string,
  ) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;

    const id = parseInt(assessmentId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid assessment ID provided.');
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new BadRequestException('Reason for declining is required.');
    }

    const assessment = await this.assessmentService.declineAssessment(
      companyId,
      currentUserId,
      id,
      rejectionReason,
    );

    return { message: 'Assessment rejected successfully.', data: assessment };
  }

  private parseId(idStr: string): number {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid assessment ID');
    return id;
  }
}

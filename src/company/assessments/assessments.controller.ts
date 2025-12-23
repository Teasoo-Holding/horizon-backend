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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
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
  constructor(private readonly assessmentService: AssessmentService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
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
  @ApiOperation({ summary: 'Save assessment progress' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Progress saved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
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
  @ApiOperation({ summary: 'Submit an assessment group' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiBody({ schema: { properties: { lastSavedForm: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Group submitted successfully' })
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
  @ApiOperation({ summary: 'Get all assessments for company' })
  @ApiResponse({ status: 200, description: 'Returns all assessments' })
  async getAssessments(@Req() req: CustomRequest) {
    const companyId = req.user.companyId;
    const assessments = await this.assessmentService.getAssessments(companyId);
    return { data: assessments };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific assessment by ID' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Returns the assessment' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
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
  @ApiOperation({ summary: 'Delete a draft assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 204, description: 'Assessment deleted' })
  @ApiResponse({ status: 400, description: 'Assessment is not a draft' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
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
  @ApiOperation({ summary: 'Approve an assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment approved' })
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
  @ApiOperation({ summary: 'Decline an assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiBody({ schema: { properties: { reason: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Assessment declined' })
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

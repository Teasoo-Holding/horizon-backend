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
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { ALL_ROLES, DATA_WRITE_ROLES, VALIDATOR_ROLES } from 'src/auth/roles/role.constants';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiCreatedResponse, ApiNoContentResponse } from '@nestjs/swagger';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { PartialAssessmentPayloadDto } from './dto/partial-assessment-payload.dto';
import {
  AssessmentResponseDto,
  AssessmentListResponseDto,
  AssessmentDetailResponseDto,
  AssessmentSubmitResponseDto,
  AssessmentApprovalResponseDto
} from './dto/assessment-response.dto';

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
  @Roles(...DATA_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a new ESG assessment',
    description: 'Creates a new assessment draft for the authenticated user\'s company. The assessment will be in "in_progress" status and can be filled out step by step.',
  })
  @ApiCreatedResponse({
    description: 'Assessment created successfully',
    type: AssessmentDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or assessment period overlaps with existing assessment',
  })
  @ApiResponse({
    status: 409,
    description: 'Assessment for this period already exists',
  })
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
  @Roles(...DATA_WRITE_ROLES)
  @ApiOperation({
    summary: 'Save assessment progress',
    description: 'Saves partial assessment data at a specific path. Supports auto-save functionality and form validation. Recalculates dependent values automatically.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID',
    example: 123,
  })
  @ApiBody({
    type: PartialAssessmentPayloadDto,
    description: 'Assessment data to save',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress saved successfully',
    type: AssessmentDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid assessment ID or data format',
  })
  @ApiResponse({
    status: 403,
    description: 'Assessment is locked (submitted group) or belongs to different company',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found',
  })
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
  @Roles(...DATA_WRITE_ROLES)
  @ApiOperation({
    summary: 'Submit an assessment group/pillar',
    description: 'Submits a completed assessment group (pillar section) for review. Triggers report generation and may change assessment status if all pillars are complete.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID',
    example: 123,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        lastSavedForm: {
          type: 'string',
          description: 'Name of the form/section that was submitted',
          example: 'environment.ghg.scope1.stationarySources',
        },
      },
      required: ['lastSavedForm'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Group submitted successfully',
    type: AssessmentSubmitResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid assessment ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found or belongs to different company',
  })
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

  @Post(':id/submit-for-review')
  @Roles(...DATA_WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit assessment for review or direct approval',
    description:
      'Explicitly submits an assessment. If the company requires review, status becomes awaiting_review with an optional reviewer assignment. If review is not required, status becomes submitted_approved.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reviewerId: {
          type: 'number',
          description:
            'Optional reviewer user ID. If omitted and review is required, self-review is assumed.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment submitted successfully',
    type: AssessmentApprovalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Assessment cannot be submitted in its current status',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found',
  })
  async submitForReview(
    @Req() req: CustomRequest,
    @Param('id') idStr: string,
    @Body() body: { reviewerId?: number },
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const assessmentId = this.parseId(idStr);

    const assessment = await this.assessmentService.submitForReview(
      companyId,
      userId,
      assessmentId,
      body.reviewerId,
    );

    return {
      message: 'Assessment submitted successfully.',
      data: assessment,
    };
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Get all assessments for company',
    description: 'Retrieves all assessments belonging to the authenticated user\'s company, ordered by last updated date (newest first).',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all assessments',
    type: AssessmentListResponseDto,
  })
  async getAssessments(@Req() req: CustomRequest) {
    const companyId = req.user.companyId;
    const assessments = await this.assessmentService.getAssessments(companyId);
    return { data: assessments };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Get specific assessment by ID',
    description: 'Retrieves detailed assessment data including progress, assessment data, and metadata. Only returns assessments belonging to the authenticated user\'s company.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved assessment',
    type: AssessmentDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid assessment ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found or belongs to different company',
  })
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
  @Roles(...DATA_WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a draft assessment',
    description: 'Deletes an assessment that is still in draft status. Only assessments with status "in_progress" can be deleted. Submitted or approved assessments cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID to delete',
    example: 123,
  })
  @ApiNoContentResponse({
    description: 'Assessment deleted successfully (no content returned)',
  })
  @ApiResponse({
    status: 400,
    description: 'Assessment is not in draft status (cannot be deleted)',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found or belongs to different company',
  })
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
  @Roles(...VALIDATOR_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve an assessment',
    description: 'Approves an assessment that was submitted for review. Changes status to "approved" and generates final reports.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID to approve',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment approved successfully',
    type: AssessmentApprovalResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to approve assessments',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found or belongs to different company',
  })
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
  @Roles(...VALIDATOR_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decline/reject an assessment',
    description: 'Rejects an assessment that was submitted for review. Requires a rejection reason and changes status to "declined".',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID to decline',
    example: 123,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for declining the assessment',
          example: 'Incomplete data in environmental section',
          minLength: 1,
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment declined successfully',
    type: AssessmentApprovalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Rejection reason is required and cannot be empty',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to decline assessments',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found or belongs to different company',
  })
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

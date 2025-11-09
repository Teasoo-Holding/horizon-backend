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
import { AssessmentPayloadDto } from './dto/assessment.dto';
import { Request } from 'express';
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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

  // @Post('create')
  // @HttpCode(HttpStatus.CREATED)
  // async createAssessment(@Req() req: CustomRequest) {
  //   const companyId = req.user.companyId;
  //   const currentUserId = req.user.id;
  //   const assessment = await this.assessmentService.createAssessment(
  //     companyId,
  //     currentUserId,
  //   );
  //   return { assessmentId: assessment.id };
  // }

  // @Post(':id/save')
  // @HttpCode(HttpStatus.OK)
  // async saveAssessment(
  //   @Req() req: CustomRequest,
  //   @Param('id') assessmentId: string,
  //   @Body() data: AssessmentPayloadDto,
  // ) {
  //   const companyId = req.user.companyId;
  //   const currentUserId = req.user.id;

  //   const id = parseInt(assessmentId, 10);
  //   if (isNaN(id)) {
  //     throw new BadRequestException('Invalid assessment ID provided.');
  //   }

  //   const assessment = await this.assessmentService.saveAssessment(
  //     companyId,
  //     currentUserId,
  //     id,
  //     data,
  //   );

  //   return { message: 'Assessment data saved successfully.', data: assessment };
  // }

  @Post('save')
  @Post('save/:id')
  @HttpCode(HttpStatus.OK)
  async saveAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string | undefined,
    @Body() data: AssessmentPayloadDto,
  ) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;

    let id: number | null = null;
    if (assessmentId) {
      id = parseInt(assessmentId, 10);
      if (isNaN(id)) {
        throw new BadRequestException('Invalid assessment ID provided.');
      }
    }

    const assessment = await this.assessmentService.saveAssessment(
      companyId,
      currentUserId,
      id, // Pass the potentially null ID
      data,
    );
    
    const message = id ? 'Assessment data updated successfully.' : 'New assessment created and saved successfully.';

    return { message, data: assessment, assessmentId: assessment.id };
  }

  @Post('submit')
  @Post('submit/:id') // 💡 ID is now optional
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Req() req: CustomRequest,
    @Param('id') assessmentId: string | undefined,
    @Body() data: AssessmentPayloadDto,
  ) {
    const companyId = req.user.companyId;
    const currentUserId = req.user.id;

    let id: number | null = null;
    if (assessmentId) {
      id = parseInt(assessmentId, 10);
      if (isNaN(id)) {
        throw new BadRequestException('Invalid assessment ID provided.');
      }
    }

    // The service now accepts AssessmentPayloadDto and handles the JSON conversion
    const assessment = await this.assessmentService.submitAssessment(
      companyId,
      currentUserId,
      id, // Pass the potentially null ID
      data,
    );

    return {
      message: 'Assessment submitted successfully.',
      assessment,
      totals:
        (assessment.assessmentData as Record<string, any>)?.totals ?? null,
    };
  }

  // @Post(':id/submit')
  // @HttpCode(HttpStatus.OK)
  // async submitAssessment(
  //   @Req() req: CustomRequest,
  //   @Param('id') assessmentId: string,
  //   @Body() data: AssessmentPayloadDto,
  // ) {
  //   const companyId = req.user.companyId;
  //   const currentUserId = req.user.id;

  //   const id = parseInt(assessmentId, 10);
  //   if (isNaN(id)) {
  //     throw new BadRequestException('Invalid assessment ID provided.');
  //   }

  //   const jsonData = data as unknown as Prisma.JsonValue;

  //   const assessment = await this.assessmentService.submitAssessment(
  //     companyId,
  //     currentUserId,
  //     id,
  //     jsonData,
  //   );

  //   return {
  //     message: 'Assessment submitted successfully.',
  //     assessment,
  //     totals:
  //       (assessment.assessmentData as Record<string, any>)?.totals ?? null,
  //   };
  // }

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

  @Post(':id/reject')
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
      throw new BadRequestException('Rejection reason is required.');
    }

    const assessment = await this.assessmentService.rejectAssessment(
      companyId,
      currentUserId,
      id,
      rejectionReason,
    );

    return { message: 'Assessment rejected successfully.', data: assessment };
  }
}

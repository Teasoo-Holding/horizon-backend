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

        const assessment = await this.assessmentService.submitAssessment(
            companyId,
            currentUserId,
            id,
            data,
        );

        return {
            message: 'Assessment submitted successfully.',
            assessment,
        };
    }
}

// // src/assessment/assessment.controller.ts

// import {
//   Controller,
//   Post,
//   Body,
//   Req,
//   UseGuards,
//   HttpStatus,
//   HttpCode,
// } from '@nestjs/common';
// import { AssessmentService } from './assessments.service';
// import { AssessmentPayloadDto } from './dto/assessment.dto';
// import { Request } from 'express';
// import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard'; // Imported from your example
// import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

// // Define the custom request interface based on your pattern
// // Assuming the JWT payload attaches 'id' (for user ID) and 'companyId'
// interface CustomRequest extends Request {
//   user: {
//     id: number; // The authenticated User's ID (used for created_by/updated_by)
//     companyId: number; // The authenticated User's Company ID (used for companyId field)
//   };
// }

// @ApiTags('Company - Assessment')
// @ApiBearerAuth()
// @Controller('assessments')
// @UseGuards(JwtRolesGuard)
// export class AssessmentController {
//   constructor(private readonly assessmentService: AssessmentService) {}

//   @Post('save')
//   @HttpCode(HttpStatus.OK)
//   async saveAssessment(
//     @Req() req: CustomRequest,
//     @Body() data: AssessmentPayloadDto,
//   ) {
//     // 1. Retrieve authenticated user context
//     const companyId = req.user.companyId;
//     const currentUserId = req.user.id;

//     // 2. Delegate to service
//     const assessment = await this.assessmentService.saveAssessment(
//       companyId,
//       currentUserId,
//       data,
//     );

//     return assessment;
//   }

//   @Post('submit')
//   @HttpCode(HttpStatus.OK)
//   async submitAssessment(
//     @Req() req: CustomRequest,
//     @Body() data: AssessmentPayloadDto,
//   ) {
//     // 1. Retrieve authenticated user context
//     const companyId = req.user.companyId;
//     const currentUserId = req.user.id;

//     // 2. Delegate to service
//     const assessment = await this.assessmentService.submitAssessment(
//       companyId,
//       currentUserId,
//       data,
//     );

//     return {
//       message: 'Assessment submitted successfully.',
//       assessment,
//     };
//   }
// }

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssessmentPayloadDto } from './dto/assessment.dto';
import { Assessment, AssessmentStatus } from '@prisma/client';

@Injectable()
export class AssessmentService {
    constructor(private prisma: PrismaService) {}

    private getAssessmentDataPayload(data: AssessmentPayloadDto) {
        const { subsidiary, startMonth, startYear, endMonth, endYear, stationarySources, ...rest } = data;
        return {
            subsidiary,
            startMonth,
            startYear,
            endMonth,
            endYear,
            stationarySources,
            ...rest,
        };
    }

    async getAssessments(companyId: number): Promise<Assessment[]> {
        return this.prisma.assessment.findMany({
            where: { companyId },
        });
    }

    async createAssessment(
        companyId: number,
        currentUserId: number,
    ): Promise<Assessment> {
        return this.prisma.assessment.create({
            data: {
                companyId,
                created_by: currentUserId,
                updated_by: currentUserId,
                status: AssessmentStatus.draft,
                subsidiary: '',
                startMonth: '',
                startYear: '',
                endMonth: '',
                endYear: '',
                assessmentData: {},
            },
        });
    }

    async saveAssessment(
        companyId: number,
        currentUserId: number,
        assessmentId: number, // Now a number
        data: AssessmentPayloadDto,
    ): Promise<Assessment> {
        const assessmentData = this.getAssessmentDataPayload(data);

        return this.prisma.assessment.update({
            where: { id: assessmentId, companyId },
            data: {
                updated_by: currentUserId,
                subsidiary: data.subsidiary,
                startMonth: data.startMonth,
                startYear: data.startYear,
                endMonth: data.endMonth,
                endYear: data.endYear,
                assessmentData: assessmentData,
            },
        });
    }

    async submitAssessment(
        companyId: number,
        currentUserId: number,
        assessmentId: number, // Now a number
        data: AssessmentPayloadDto,
    ): Promise<Assessment> {
        const assessment = await this.saveAssessment(
            companyId,
            currentUserId,
            assessmentId,
            data,
        );

        return this.prisma.assessment.update({
            where: { id: assessment.id },
            data: {
                status: AssessmentStatus.submitted,
            },
        });
    }
}

// import { Injectable } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { AssessmentPayloadDto } from './dto/assessment.dto';
// import { Assessment, AssessmentStatus } from '@prisma/client';

// @Injectable()
// export class AssessmentService {
//   constructor(private prisma: PrismaService) {}

//   private getAssessmentDataPayload(data: AssessmentPayloadDto) {
//       const { subsidiary, startMonth, startYear, endMonth, endYear, stationarySources, ...rest } = data;

//       return {
//           subsidiary,
//           startMonth,
//           startYear,
//           endMonth,
//           endYear,
//           stationarySources,
//           ...rest,
//       };
//   }

//   /**
//    * Saves or updates a DRAFT assessment.
//    */
//   async saveAssessment(
//       companyId: number, 
//       currentUserId: number, // User performing the save
//       data: AssessmentPayloadDto
//   ): Promise<Assessment> {
//     const assessmentData = this.getAssessmentDataPayload(data);
    
//     // Attempt to find the existing DRAFT for this company
//     const existingDraft = await this.prisma.assessment.findFirst({
//         // FIX APPLIED: Querying by the company relation field to resolve the TypeScript error
//         where: { 
//             company: { id: companyId }, // Use company relation to filter by company's ID
//             status: AssessmentStatus.draft 
//         },
//         orderBy: { updatedAt: 'desc' },
//     });

//     if (existingDraft) {
//       // UPDATE existing DRAFT
//       return this.prisma.assessment.update({
//         where: { id: existingDraft.id },
//         data: {
//           subsidiary: data.subsidiary,
//           updated_by: currentUserId,
//           assessmentData: assessmentData,
//         },
//       });
//     } else {
//       // CREATE new DRAFT
//       return this.prisma.assessment.create({
//         data: {
//           companyId,
//           created_by: currentUserId,
//           updated_by: currentUserId,
//           subsidiary: data.subsidiary,
//           startMonth: data.startMonth,
//           startYear: data.startYear,
//           endMonth: data.endMonth,
//           endYear: data.endYear,
//           assessmentData: assessmentData,
//           status: AssessmentStatus.draft,
//         },
//       });
//     }
//   }

//   /**
//    * Submits the assessment by saving the final data and updating the status.
//    */
//   async submitAssessment(
//       companyId: number, 
//       currentUserId: number, 
//       data: AssessmentPayloadDto
//   ): Promise<Assessment> {
//     // 1. The saveAssessment call is used here, so it inherits the fixed logic.
//     const assessment = await this.saveAssessment(companyId, currentUserId, data);

//     // 2. Change the status to SUBMITTED
//     return this.prisma.assessment.update({
//         where: { id: assessment.id },
//         data: {
//             status: AssessmentStatus.submitted,
//         },
//     });
//   }
// }
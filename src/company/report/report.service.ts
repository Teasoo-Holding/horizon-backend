import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrganizationAssessmentReport(id: number) {
    const report = await this.prisma.assessment.findMany({
      where: {
        companyId: id,
      },
      select: {
        id: true,
        startMonth: true,
        startYear: true,
        endMonth: true,
        endYear: true,
        subsidiary: true,
        status: true,
      },
    });
    return report;
  }

  async findReportDetail(id: number){
    const reportSummary = await this.prisma.assessment.findUnique({
      where: {id},
      select: {
        startMonth: true,
        startYear: true,

        endMonth: true,
        endYear: true,
        subsidiary: true,
        status: true,
        

      }
      
      
    })
    const sumSummary = await this.prisma.assessment.findUnique({
        where: {id}
      })

    return sumSummary 
  }
}

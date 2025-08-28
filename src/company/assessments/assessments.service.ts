import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateAssessment(subsidiary: string, startYear: string, startMonth: string, metricType: string, data: CreateAssessmentDto) {
    const existing = await this.prisma.assessment.findFirst({
      where: { subsidiary, startYear, startMonth, metricType },
      include: { stationarySources: true },
    });

    if (existing) {
      if (data.stationarySources) {
        await this.prisma.stationarySources.upsert({
          where: { assessmentId: existing.id },
          create: { assessmentId: existing.id, ...data.stationarySources },
          update: { ...data.stationarySources },
        });
      }

      return this.prisma.assessment.update({
        where: { id: existing.id },
        data: {
          ...data,
        },
        include: { stationarySources: true },
      });
    }

    return this.prisma.assessment.create({
      data: {
        ...data,
        stationarySources: {
          create: data.stationarySources,
        },
      },
      include: { stationarySources: true },
    });
  }

  async findAssessmentById(id: number) {
    return this.prisma.assessment.findUnique({
      where: { id },
      include: { stationarySources: true },
    });
  }
}

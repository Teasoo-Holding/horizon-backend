import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DisclosureService {
  constructor(private prisma: PrismaService) {}

  // Sectors
  async getSectors() {
    return this.prisma.sector.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createSector(data: { name: string; description?: string }) {
    return this.prisma.sector.create({ data });
  }

  // Pillars
  async getPillars() {
    return this.prisma.pillar.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Topics
  async getTopics(pillarId?: number) {
    return this.prisma.disclosureTopic.findMany({
      where: pillarId ? { pillarId } : {},
      orderBy: { name: 'asc' },
    });
  }

  // Subtopics
  async getSubtopics(topicId?: number) {
    return this.prisma.disclosureSubtopic.findMany({
      where: topicId ? { topicId } : {},
      orderBy: { name: 'asc' },
    });
  }

  // Metrics
  async getMetrics(subtopicId?: number) {
    return this.prisma.disclosureMetric.findMany({
      where: subtopicId ? { subtopicId } : {},
      orderBy: { name: 'asc' },
    });
  }

  // Submetrics
  async getSubmetrics(metricId?: number) {
    return this.prisma.disclosureSubmetric.findMany({
      where: metricId ? { metricId } : {},
      orderBy: { name: 'asc' },
    });
  }

  // Submetric Details
  async getSubmetricDetails(submetricId?: number) {
    return this.prisma.disclosureSubmetricDetail.findMany({
      where: submetricId ? { submetricId } : {},
    });
  }

  // Full Hierarchy for a specific Industry
  async getIndustryHierarchy(industryId: number) {
    const industry = await this.prisma.industry.findUnique({
      where: { id: industryId },
      include: {
        pillars: {
          include: {
            pillar: {
              include: {
                topics: {
                  include: {
                    subtopics: {
                      include: {
                        metrics: {
                          include: {
                            submetrics: {
                              include: {
                                submetricDetails: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!industry) {
      throw new NotFoundException('Industry not found');
    }

    return industry;
  }
}

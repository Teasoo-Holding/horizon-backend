import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminAuditLogService, AuditAction } from '../audit/audit-log.service';
import {
  CreateSectorDto,
  CreateIndustryDto,
  CreatePillarDto,
  CreateTopicDto,
  CreateSubtopicDto,
  CreateMetricDto,
  CreateSubmetricDto,
  CreateSubmetricDetailDto,
  UpdateHierarchyDto,
} from './dtos/hierarchy.dto';

@Injectable()
export class DisclosureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTORS
  // ─────────────────────────────────────────────────────────────────────────────
  async getSectors() {
    return this.prisma.sector.findMany({ orderBy: { name: 'asc' } });
  }

  async getSector(id: number) {
    const sector = await this.prisma.sector.findUnique({ where: { id } });
    if (!sector) throw new NotFoundException('Sector not found');
    return sector;
  }

  async getIndustriesBySector(sectorId: number) {
    return this.prisma.industry.findMany({
      where: { sectorId },
      orderBy: { name: 'asc' },
    });
  }

  async createSector(userId: number, dto: CreateSectorDto) {
    const sector = await this.prisma.sector.create({ data: dto });
    await this.auditLog.logAction(userId, 'Sector', sector.id, AuditAction.CREATE, null, sector);
    return sector;
  }

  async updateSector(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateSectorDto>) {
    const before = await this.prisma.sector.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Sector not found');

    const after = await this.prisma.sector.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'Sector', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteSector(userId: number, id: number) {
    const before = await this.prisma.sector.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Sector not found');

    await this.prisma.sector.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'Sector', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INDUSTRIES
  // ─────────────────────────────────────────────────────────────────────────────
  async createIndustry(userId: number, dto: CreateIndustryDto) {
    const industry = await this.prisma.industry.create({ data: dto });
    await this.auditLog.logAction(userId, 'Industry', industry.id, AuditAction.CREATE, null, industry);
    return industry;
  }

  async updateIndustry(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateIndustryDto>) {
    const before = await this.prisma.industry.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Industry not found');

    const after = await this.prisma.industry.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'Industry', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteIndustry(userId: number, id: number) {
    const before = await this.prisma.industry.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Industry not found');

    await this.prisma.industry.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'Industry', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PILLARS
  // ─────────────────────────────────────────────────────────────────────────────
  async getPillars() {
    return this.prisma.pillar.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPillar(userId: number, dto: CreatePillarDto) {
    const pillar = await this.prisma.pillar.create({ data: dto });
    await this.auditLog.logAction(userId, 'Pillar', pillar.id, AuditAction.CREATE, null, pillar);
    return pillar;
  }

  async updatePillar(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreatePillarDto>) {
    const before = await this.prisma.pillar.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Pillar not found');

    const after = await this.prisma.pillar.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'Pillar', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deletePillar(userId: number, id: number) {
    const before = await this.prisma.pillar.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Pillar not found');

    await this.prisma.pillar.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'Pillar', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPICS (Scoped to Industry)
  // ─────────────────────────────────────────────────────────────────────────────
  async getTopics(industryId: number, pillarId?: number) {
    return this.prisma.disclosureTopic.findMany({
      where: {
        industryId,
        ...(pillarId ? { pillarId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createTopic(userId: number, dto: CreateTopicDto) {
    const topic = await this.prisma.disclosureTopic.create({ data: dto });
    await this.auditLog.logAction(userId, 'DisclosureTopic', topic.id, AuditAction.CREATE, null, topic);
    return topic;
  }

  async updateTopic(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateTopicDto>) {
    const before = await this.prisma.disclosureTopic.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Topic not found');

    const after = await this.prisma.disclosureTopic.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'DisclosureTopic', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteTopic(userId: number, id: number) {
    const before = await this.prisma.disclosureTopic.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Topic not found');

    await this.prisma.disclosureTopic.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'DisclosureTopic', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTOPICS
  // ─────────────────────────────────────────────────────────────────────────────
  async getSubtopics(topicId: number) {
    return this.prisma.disclosureSubtopic.findMany({
      where: { topicId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSubtopic(userId: number, dto: CreateSubtopicDto) {
    const subtopic = await this.prisma.disclosureSubtopic.create({ data: dto });
    await this.auditLog.logAction(userId, 'DisclosureSubtopic', subtopic.id, AuditAction.CREATE, null, subtopic);
    return subtopic;
  }

  async updateSubtopic(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateSubtopicDto>) {
    const before = await this.prisma.disclosureSubtopic.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Subtopic not found');

    const after = await this.prisma.disclosureSubtopic.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'DisclosureSubtopic', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteSubtopic(userId: number, id: number) {
    const before = await this.prisma.disclosureSubtopic.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Subtopic not found');

    await this.prisma.disclosureSubtopic.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'DisclosureSubtopic', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────────
  async getMetrics(subtopicId: number) {
    return this.prisma.disclosureMetric.findMany({
      where: { subtopicId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createMetric(userId: number, dto: CreateMetricDto) {
    const metric = await this.prisma.disclosureMetric.create({ data: dto });
    await this.auditLog.logAction(userId, 'DisclosureMetric', metric.id, AuditAction.CREATE, null, metric);
    return metric;
  }

  async updateMetric(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateMetricDto>) {
    const before = await this.prisma.disclosureMetric.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Metric not found');

    const after = await this.prisma.disclosureMetric.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'DisclosureMetric', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteMetric(userId: number, id: number) {
    const before = await this.prisma.disclosureMetric.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Metric not found');

    await this.prisma.disclosureMetric.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'DisclosureMetric', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBMETRICS
  // ─────────────────────────────────────────────────────────────────────────────
  async getSubmetrics(metricId: number) {
    return this.prisma.disclosureSubmetric.findMany({
      where: { metricId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSubmetric(userId: number, dto: CreateSubmetricDto) {
    const submetric = await this.prisma.disclosureSubmetric.create({ data: dto });
    await this.auditLog.logAction(userId, 'DisclosureSubmetric', submetric.id, AuditAction.CREATE, null, submetric);
    return submetric;
  }

  async updateSubmetric(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateSubmetricDto>) {
    const before = await this.prisma.disclosureSubmetric.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Submetric not found');

    const after = await this.prisma.disclosureSubmetric.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'DisclosureSubmetric', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteSubmetric(userId: number, id: number) {
    const before = await this.prisma.disclosureSubmetric.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Submetric not found');

    await this.prisma.disclosureSubmetric.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'DisclosureSubmetric', id, AuditAction.DELETE, before, null);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBMETRIC DETAILS
  // ─────────────────────────────────────────────────────────────────────────────
  async getSubmetricDetails(submetricId: number) {
    return this.prisma.disclosureSubmetricDetail.findMany({
      where: { submetricId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSubmetricDetail(userId: number, dto: CreateSubmetricDetailDto) {
    const detail = await this.prisma.disclosureSubmetricDetail.create({ data: dto });
    await this.auditLog.logAction(userId, 'DisclosureSubmetricDetail', detail.id, AuditAction.CREATE, null, detail);
    return detail;
  }

  async updateSubmetricDetail(userId: number, id: number, dto: UpdateHierarchyDto & Partial<CreateSubmetricDetailDto>) {
    const before = await this.prisma.disclosureSubmetricDetail.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Detail not found');

    const after = await this.prisma.disclosureSubmetricDetail.update({ where: { id }, data: dto });
    await this.auditLog.logAction(userId, 'DisclosureSubmetricDetail', id, AuditAction.UPDATE, before, after);
    return after;
  }

  async deleteSubmetricDetail(userId: number, id: number) {
    const detail = await this.prisma.disclosureSubmetricDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException('Field not found');
    await this.prisma.disclosureSubmetricDetail.delete({ where: { id } });
    await this.auditLog.logAction(userId, 'DisclosureSubmetricDetail', id, AuditAction.DELETE, detail, null);
    return { success: true };
  }

  async getAuditLogs(entityType?: string, entityId?: number) {
    const logs = await this.prisma.adminAuditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((log) => ({
      ...log,
      user: log.user
        ? {
            id: log.user.id,
            firstName: log.user.first_name,
            lastName: log.user.last_name,
            email: log.user.email,
          }
        : null,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INDUSTRY HIERARCHY
  // ─────────────────────────────────────────────────────────────────────────────
  async getIndustryHierarchy(industryId: number) {
    const industry = await this.prisma.industry.findUnique({
      where: { id: industryId },
      include: {
        pillars: {
          orderBy: { sortOrder: 'asc' },
          include: {
            pillar: {
              include: {
                topics: {
                  where: { industryId, isActive: true },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    subtopics: {
                      where: { isActive: true },
                      orderBy: { sortOrder: 'asc' },
                      include: {
                        metrics: {
                          where: { isActive: true },
                          orderBy: { sortOrder: 'asc' },
                          include: {
                            submetrics: {
                              where: { isActive: true },
                              orderBy: { sortOrder: 'asc' },
                              include: {
                                submetricDetails: {
                                  where: { isActive: true },
                                  orderBy: { sortOrder: 'asc' },
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
      },
    });

    if (!industry) throw new NotFoundException('Industry not found');
    return industry;
  }
}

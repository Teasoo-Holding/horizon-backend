import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        metadata: data.metadata || {},
      },
    });
  }

  async findAll(query: AuditLogQueryDto) {
    const { page = 1, limit = 10, search, module, action, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (module && module !== 'All Modules') {
      where.module = module;
    }

    if (action && action !== 'All Actions') {
      where.action = { startsWith: action, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getKpis() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalEvents, uniqueActors, criticalActions, failedAttempts] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { userId: true },
        where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
      }).then(res => res.length),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { action: { contains: 'delete', mode: 'insensitive' } },
            { action: { contains: 'remove', mode: 'insensitive' } },
            { action: { contains: 'update', mode: 'insensitive' } },
          ],
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'Failed',
        },
      }),
    ]);

    return [
      { label: 'Total Events (30d)', value: totalEvents.toLocaleString(), change: '+0%', trend: 'up' }, // Trend calculation could be more complex
      { label: 'Unique Actors', value: uniqueActors.toString() },
      { label: 'Critical Actions', value: criticalActions.toString(), color: 'red' },
      { label: 'Failed Attempts', value: failedAttempts.toString(), color: 'orange' },
    ];
  }
}

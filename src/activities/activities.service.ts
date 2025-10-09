import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleName } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async logActivity({
    companyId,
    createdById,
    title,
    description,
    type,
    status,
  }: {
    companyId?: number;
    createdById: number;
    title: string;
    description?: string;
    type?: string;
    status?: string;
  }) {
    try {
      return await this.prisma.activities.create({
        data: {
          companyId,
          createdById,
          title,
          description: description ?? '',
          type: type ?? 'general',
          status: status ?? 'success',
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Never throw — logging failure should not break business flow
    }
  }

  async getActivities(user: {
    id: number;
    role: RoleName;
    companyId?: number;
  }) {
    const isAdmin =
      user.role === RoleName.company_esg_admin ||
      user.role === RoleName.company_esg_subadmin;

    return this.prisma.activities.findMany({
      where: isAdmin ? { companyId: user.companyId } : { createdById: user.id },
      include: {
        createdBy: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

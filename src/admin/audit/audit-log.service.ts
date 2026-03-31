import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: number,
    entity: string,
    entityId: number,
    action: AuditAction,
    before?: any,
    after?: any,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        entity,
        entityId,
        action,
        changedBy: userId,
        before: before ? JSON.parse(JSON.stringify(before)) : null,
        after: after ? JSON.parse(JSON.stringify(after)) : null,
      },
    });
  }
}

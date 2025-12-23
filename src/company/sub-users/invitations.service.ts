import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import { EmailService } from 'src/email/email.service';
import { randomUUID } from 'crypto';
import { formatRoleName } from 'src/utils/format-rolename';
import { ActivitiesService } from 'src/activities/activities.service';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly activitiesService: ActivitiesService,
  ) { }

  async create(dto: CreateInvitationDto, invitedById: number) {
    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // 2. Check for existing pending invitation
    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: { email: dto.email, status: 'pending' },
    });

    // We expire old ones anyway to ensure fresh token
    await this.prisma.invitation.updateMany({
      where: { email: dto.email, status: 'pending' },
      data: { status: 'expired' },
    });

    const invitingUser = await this.prisma.user.findUnique({
      where: { id: invitedById },
      select: {
        first_name: true,
        last_name: true,
        company: {
          select: { id: true, name: true },
        },
      },
    });
    if (!invitingUser) throw new BadRequestException('Inviting user not found');

    let roleRecord;
    if (dto.roleId) {
      roleRecord = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
    } else if (dto.roleName) {
      roleRecord = await this.prisma.role.findUnique({
        where: { name: dto.roleName },
      });
    }
    if (!roleRecord) throw new BadRequestException('Role not found');

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const data: any = {
      email: dto.email,
      token,
      expiresAt,
      status: 'pending',
      subsidiaryId: dto.subsidiaryId ?? null,
      departmentId: dto.departmentId ?? null,
      roleId: roleRecord.id,
      invitedById,
    };

    if (invitingUser.company?.id !== undefined) {
      data.companyId = invitingUser.company.id;
    }

    const invitation = await this.prisma.invitation.create({ data });

    const admin_name =
      `${invitingUser.first_name} ${invitingUser.last_name || ''}`.trim();

    const esg_name = invitingUser.company?.name || '';

    const role = roleRecord.name;

    const link = `${process.env.FRONTEND_URL}/invite-user?token=${token}`;
    const formatted_role = formatRoleName(String(role));
    await this.emailService.sendEmail(
      dto.email,
      { firstname: dto.email, admin_name, esg_name, formatted_role, link },
      6,
    );

    await this.activitiesService.logActivity({
      companyId: invitingUser.company?.id,
      createdById: invitedById,
      title: `Invited ${dto.email}`,
      description: `${invitingUser.first_name} invited ${dto.email}`,
      type: 'invitation',
    });

    if (pendingInvitation) {
      return {
        message: 'This user invitation already pending. Resending invitation reminder',
        invitation,
      };
    }

    return invitation;
  }

  async getByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) throw new BadRequestException('Invalid invitation token');
    if (invitation.expiresAt < new Date())
      throw new BadRequestException('Invitation token expired');
    return invitation;
  }
}

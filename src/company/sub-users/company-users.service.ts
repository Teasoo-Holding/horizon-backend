import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateSubUserDto } from './dto/update-sub-user.dto';

@Injectable()
export class CompanyUsersService {
  constructor(private readonly prisma: PrismaService) { }

  async updateCompanyUser(
    editorUserId: number,
    targetUserId: number,
    updateDto: UpdateSubUserDto,
  ) {
    const editor = await this.prisma.user.findUnique({
      where: { id: editorUserId },
      include: { role: true, company: true },
    });
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true, company: true },
    });

    if (!editor || !target) throw new BadRequestException('User not found');
    if (editor.companyId !== target.companyId)
      throw new ForbiddenException('Cannot manage users from other companies');

    if (editor.role.name === 'company_esg_admin') {
      // Can do anyhow
    } else if (editor.role.name === 'company_esg_subadmin') {
      if (target.role.name === 'company_esg_admin')
        throw new ForbiddenException('Subadmin cannot edit admins');
    } else {
      throw new ForbiddenException('Not authorized to update company users');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (updateDto.first_name !== undefined)
      updateData.first_name = updateDto.first_name;
    if (updateDto.last_name !== undefined)
      updateData.last_name = updateDto.last_name;
    if (updateDto.roleId !== undefined)
      updateData.role = { connect: { id: updateDto.roleId } };
    if (updateDto.departmentId !== undefined)
      updateData.department = { connect: { id: updateDto.departmentId } };
    if (updateDto.phone_number !== undefined)
      updateData.phone_number = updateDto.phone_number;

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });
  }

  async deleteCompanyUser(editorUserId: number, targetUserId: number) {
    const editor = await this.prisma.user.findUnique({
      where: { id: editorUserId },
      include: { role: true, company: true },
    });
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true, company: true },
    });

    if (!editor || !target) throw new BadRequestException('User not found');
    if (editor.companyId !== target.companyId)
      throw new ForbiddenException('Cannot delete users from other companies');

    if (editor.role.name === 'company_esg_admin') {
      // Can delete anyone
    } else if (editor.role.name === 'company_esg_subadmin') {
      if (target.role.name === 'company_esg_admin')
        throw new ForbiddenException('Subadmin cannot delete admins');
    } else {
      throw new ForbiddenException('Not authorized to delete company users');
    }

    return this.prisma.user.delete({ where: { id: targetUserId } });
  }

  async getAllUsersOfCompany(
    requestingUser: { id: number; companyId: number; role: { name: string } },
    companyId: number,
  ) {
    if (
      requestingUser.role.name !== 'super_admin' &&
      requestingUser.companyId !== companyId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view users of this company',
      );
    }

    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        status: true,
        profile_photo_url: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const invitations = await this.prisma.invitation.findMany({
      where: { companyId, status: 'pending' },
      select: {
        id: true,
        email: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        subsidiary: { select: { id: true, name: true } },
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const userEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const filteredInvitations = invitations.filter(
      (inv) => !userEmails.has(inv.email.toLowerCase()),
    );

    // Deduplicate invitations by email, keeping only the most recent one
    const invitationsByEmail = new Map<string, typeof filteredInvitations[0]>();
    for (const inv of filteredInvitations) {
      const emailKey = inv.email.toLowerCase();
      const existing = invitationsByEmail.get(emailKey);

      // Keep the most recent invitation (highest createdAt)
      if (!existing || new Date(inv.createdAt) > new Date(existing.createdAt)) {
        invitationsByEmail.set(emailKey, inv);
      }
    }

    const uniqueInvitations = Array.from(invitationsByEmail.values());

    const combinedList = [
      ...users,
      ...uniqueInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        first_name: null,
        last_name: null,
        phone_number: null,
        profile_photo_url: null,
        last_login: null,
        role: inv.role,
        department: inv.department,
        subsidiary: inv.subsidiary,
        status: 'pending',
        created_at: inv.createdAt,
        updated_at: null,
      })),
    ];

    return combinedList;
  }
}

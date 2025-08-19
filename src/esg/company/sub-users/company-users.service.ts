import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class CompanyUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateCompanyUser(
    editorUserId: number,
    targetUserId: number,
    updateDto: UpdateUserDto,
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

  async getAllUsersOfCompany(requestingUserId: number, companyId: number) {
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { role: true },
    });

    if (!requestingUser) throw new ForbiddenException('Invalid user');

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
        role: { select: { name: true } },
        department: { select: { name: true } },
        status: true,
        profile_photo_url: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return users;
  }
}

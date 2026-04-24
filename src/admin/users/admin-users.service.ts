import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { InviteUserDto, ListUsersDto, AdminUpdateUserDto } from './dto/admin-users.dto';

const TEASOO_COMPANY_NAME = 'Teasoo Consulting';

const USER_SELECT = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone_number: true,
  profile_photo_url: true,
  status: true,
  last_login: true,
  created_at: true,
  updated_at: true,
  role: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) { }

  async getStats() {
    const [total, admins, dataOfficers, pendingInvites, thisMonth] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { role: { name: { in: ['super_admin', 'platform_subadmin'] } } },
        }),
        this.prisma.user.count({
          where: { role: { name: 'company_esg_data_officer' } },
        }),
        this.prisma.user.count({ where: { status: UserStatus.pending } }),
        this.prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

    return { total, admins, dataOfficers, pendingInvites, newThisMonth: thisMonth };
  }

  async listUsers(filters: ListUsersDto) {
    const { search, status, role, companyId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (role) where.role = { name: { equals: role, mode: 'insensitive' } };
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: { permission: { select: { key: true, label: true } } },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const rawRole = user as any;
    const permissions = rawRole?.role?.rolePermissions?.map(
      (rp: any) => rp.permission,
    ) ?? [];

    return { ...user, permissions };
  }

  async inviteUser(dto: InviteUserDto, callerRole: string) {
    if (!['super_admin', 'platform_subadmin'].includes(callerRole)) {
      throw new UnauthorizedException('Only platform admins can invite users');
    }
    const targetRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!targetRole) throw new NotFoundException('Role not found');
    if (targetRole.name === 'super_admin') {
      throw new UnauthorizedException('Cannot create another Super Admin');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    // Resolve company — default to Teasoo Consulting
    let companyId = dto.companyId;
    if (!companyId) {
      const teasoo = await this.prisma.company.findFirst({
        where: { name: { contains: TEASOO_COMPANY_NAME, mode: 'insensitive' } },
        select: { id: true },
      });
      if (!teasoo) {
        throw new NotFoundException(
          `Default company "${TEASOO_COMPANY_NAME}" not found in the database`,
        );
      }
      companyId = teasoo.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        roleId: dto.roleId,
        departmentId: dto.departmentId ?? null,
        companyId,
        status: UserStatus.pending,
        first_name: dto.first_name ?? '',
        last_name: '',
        phone_number: '',
        password: '',
      },
    });

    const token = this.jwtService.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '48h' },
    );

    try {
      const link = `${process.env.ADMIN_FRONTEND_URL ?? 'http://localhost:3000'}/admin/verify-invite-token?token=${token}`;
      await this.emailService.sendEmail(
        dto.email,
        { token, first_name: dto.first_name ?? 'there', link, role: targetRole.name },
        2,
      );
    } catch (err) {
      console.error('Error sending invitation email:', err);
    }

    return { message: 'Invitation sent successfully', userId: user.id };
  }

  async suspendUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.suspended) {
      throw new BadRequestException('User is already suspended');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.suspended },
      select: USER_SELECT,
    });
  }

  async reactivateUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.suspended) {
      throw new BadRequestException('User is not suspended');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.active },
      select: USER_SELECT,
    });
  }

  async updateUser(id: number, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.roleId) {
      const newRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (newRole?.name === 'super_admin') {
        throw new UnauthorizedException('Cannot assign the Super Admin role this way');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.roleId !== undefined && { roleId: dto.roleId }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
      },
      select: USER_SELECT,
    });
  }
}

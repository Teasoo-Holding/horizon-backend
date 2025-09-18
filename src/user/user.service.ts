import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  findMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        profile_photo_url: true,
        status: true,
        last_login: true,
        created_at: true,
        updated_at: true,
        company: {
          select: { id: true, name: true, company_logo_url: true },
        },
        department: {
          select: { name: true },
        },
        role: {
          select: { name: true },
        },
      },
    });
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    const updateData: Prisma.UserUpdateInput = {
      ...dto,
    };

    if (dto.first_name !== undefined) {
      updateData.first_name = dto.first_name;
    }
    if (dto.last_name !== undefined) {
      updateData.last_name = dto.last_name;
    }

    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.profile_photo_url !== undefined)
      updateData.profile_photo_url = dto.profile_photo_url;
    if (dto.profile_photo_url_public_id !== undefined)
      updateData.profile_photo_url_public_id = dto.profile_photo_url_public_id;
    if (dto.phone_number !== undefined)
      updateData.phone_number = dto.phone_number;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getAllPlatformUsers() {
    return this.prisma.user.findMany({
      include: {
        company: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAllUserRoles() {
    return this.prisma.role.findMany();
  }

  async getEsgDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== 1) {
      throw new UnauthorizedException();
    }

    return;
  }
}

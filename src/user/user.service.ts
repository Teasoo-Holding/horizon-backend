import { Injectable } from '@nestjs/common';
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
          select: { name: true, company_logo_url: true },
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, ...rest } = dto;

    const updateData: Prisma.UserUpdateInput = {};

    if (rest.first_name !== undefined) updateData.first_name = rest.first_name;
    if (rest.last_name !== undefined) updateData.last_name = rest.last_name;
    if (rest.email !== undefined) updateData.email = rest.email;
    if (rest.phone_number !== undefined)
      updateData.phone_number = rest.phone_number;

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
}

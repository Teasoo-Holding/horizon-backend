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
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        profile_photo_url: true,
        role: true
      },
    });
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    const { role, ...rest } = dto;

    const updateData: Prisma.UserUpdateInput = {};

    if (rest.first_name !== undefined) updateData.first_name = rest.first_name;
    if (rest.last_name !== undefined) updateData.last_name = rest.last_name;
    if (rest.email !== undefined) updateData.email = rest.email;
    if (rest.phone_number !== undefined)
      updateData.phone_number = rest.phone_number;
    // if (rest.company !== undefined) updateData.company = rest.company;

    if (role) {
      const foundRole = (await this.prisma.role.findUnique({
        where: { name: role as any }, // cast to `any` or `as RoleNames` if enum
        select: { id: true },
      })) as { id: string } | null;

      if (!foundRole) throw new Error('Role not found');
      updateData.role = { connect: { id: Number(foundRole.id) } };
    }

    // if (permission) {
    //   const foundPermission = (await this.prisma.permission.findUnique({
    //     where: { id: +permission },
    //     select: { id: true },
    //   })) as { id: number } | null;

    //   if (!foundPermission) throw new Error('Permission not found');
    //   // updateData.permission = { connect: { id: foundPermission.id } };
    // }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  // Disabled unused methods for now
  /*
  create(_createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, _updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
  */
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepartmentDto, companyId: number) {
    return this.prisma.department.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  findAll(companyId: number) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: { company: true },
    });
  }

  findOne(id: number) {
    return this.prisma.department.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  update(id: number, dto: UpdateDepartmentDto) {
    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.department.delete({ where: { id } });
  }
}

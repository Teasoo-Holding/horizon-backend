import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  ParseIntPipe,
  Get,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';

@ApiTags('Departments')
@Controller('departments')
@UseGuards(JwtRolesGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  private checkCompanyOwnership(
    userCompanyId: number,
    targetCompanyId: number,
  ) {
    if (userCompanyId !== targetCompanyId) {
      throw new ForbiddenException(
        'You can only manage departments within your company',
      );
    }
  }

  @Post(':companyId')
  @Roles(RoleName.super_admin, RoleName.platform_subadmin, RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({ summary: 'Create a department for a company' })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires proper role and company ownership',
  })
  async create(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: CreateDepartmentDto & { leadId?: number },
    @Request() req: { user: { companyId: number; id: number; email: string } },
  ) {
    this.checkCompanyOwnership(req.user.companyId, companyId);

    return this.departmentsService.create(
      companyId,
      dto,
      req.user.email,
      req.user.id,
    );
  }

  @Patch(':id')
  @Roles(RoleName.super_admin, RoleName.platform_subadmin, RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @Request() req: { user: { companyId: number; id: number; email: string } },
  ) {
    const department = await this.departmentsService.findById(id);
    this.checkCompanyOwnership(req.user.companyId, department.companyId);

    return this.departmentsService.update(id, dto, req.user.id, req.user.email);
  }

  @Delete(':id')
  @Roles(RoleName.super_admin, RoleName.platform_subadmin, RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({ summary: 'Delete a department' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { companyId: number; id: number; email: string } },
  ) {
    const department = await this.departmentsService.findById(id);
    this.checkCompanyOwnership(req.user.companyId, department.companyId);

    return this.departmentsService.delete(id, req.user.id, req.user.email);
  }

  @Get(':companyId')
  @Roles(RoleName.super_admin, RoleName.platform_subadmin, RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({ summary: 'List all departments for a company' })
  async findAll(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Request() req: { user: { companyId: number } },
  ) {
    this.checkCompanyOwnership(req.user.companyId, companyId);
    return this.departmentsService.findAll(companyId);
  }

  @Get(':departmentId/users')
  @Roles(RoleName.super_admin, RoleName.platform_subadmin, RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({ summary: 'List all users in a departments for a company' })
  async getDepartmentUsers(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Request() req: { user: { companyId: number } },
  ) {
    const department = await this.departmentsService.findById(departmentId);
    this.checkCompanyOwnership(req.user.companyId, department.companyId);
    return this.departmentsService.getUsers(departmentId);
  }
}

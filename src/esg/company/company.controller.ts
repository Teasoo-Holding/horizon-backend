import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CompanyService } from './company.service';
import { AdminUpdateCompanyDto } from './dtos/admin-update-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { RoleGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorators';

@Controller('esg/company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @UseGuards(RoleGuard)
  findAll() {
    return this.companyService.findAll();
  }

  @Get('me')
  getMyCompany(@Request() req: Request & { user: { companyId: number } }) {
    const companyId = req.user.companyId;
    return this.companyService.findById(companyId);
  }

  @Patch('me')
  updateMyCompany(
    @Request() req: Request & { user: { companyId: number } },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(req.user.companyId, dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @UseGuards(RoleGuard)
  adminUpdateCompany(
    @Param('id') id: number,
    @Body() dto: AdminUpdateCompanyDto,
  ) {
    return this.companyService.adminUpdate(id, dto);
  }
}

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { RoleGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorators';
import {
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyStatus } from '@prisma/client';

@ApiTags('Company')
@Controller('company/esg')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('all')
  @Roles('super_admin')
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Retrieve all companies' })
  @ApiForbiddenResponse({ description: 'Forbidden: requires super_admin role' })
  findAll() {
    return this.companyService.findAll();
  }

  @Get('me')
  getMyCompany(@Request() req: Request & { user: { companyId: number } }) {
    const companyId = req.user.companyId;
    return this.companyService.findById(companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company details by ID' })
  @ApiForbiddenResponse({
    description: 'Access denied: Only super_admin and Company User can access',
  })
  async findOne(@Param('id') id: number, @Request() req) {
    const user = req.user;

    if (user.role !== 'super_admin' && user.companyId !== Number(id)) {
      throw new ForbiddenException('Access denied');
    }

    return this.companyService.findById(Number(id));
  }

  @Patch(':id/status')
  @Roles('super_admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company status' })
  @ApiForbiddenResponse({ description: 'Forbidden: requires super_admin role' })
  async updateStatus(
    @Param('id') id: number,
    @Body('status') status: CompanyStatus,
  ) {
    return this.companyService.updateStatus(id, status);
  }

  @Patch(':id')
  @Roles('company_esg_admin', 'company_esg_subadmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company details (excluding status)' })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires valid role and company ownership',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Request() req,
  ) {
    const user = req.user;

    if (user.companyId !== id) {
      throw new ForbiddenException('You can only update your own company');
    }

    const updateData = {
      ...dto,
      updated_by: user.userId,
    };

    return this.companyService.update(id, updateData);
  }
}

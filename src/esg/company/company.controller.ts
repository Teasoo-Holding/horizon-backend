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
@Controller('esg/company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('all')
  @Roles('SUPER_ADMIN')
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Retrieve all companies' })
  @ApiForbiddenResponse({ description: 'Forbidden: requires SUPER_ADMIN role' })
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
    description: 'Access denied: Only SUPER_ADMIN and Company User can access',
  })
  async findOne(@Param('id') id: number, @Request() req) {
    const user = req.user;

    if (user.role !== 'SUPER_ADMIN' && user.companyId !== Number(id)) {
      throw new ForbiddenException('Access denied');
    }

    return this.companyService.findById(Number(id));
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company status' })
  @ApiForbiddenResponse({ description: 'Forbidden: requires SUPER_ADMIN role' })
  async updateStatus(
    @Param('id') id: number,
    @Body('status') status: CompanyStatus,
  ) {
    return this.companyService.updateStatus(id, status);
  }

  @Patch(':id')
  @Roles('SUSTAINABILITY_MANAGER', 'SUB_ADMIN')
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

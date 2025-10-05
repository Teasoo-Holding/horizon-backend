import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import {
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { CompanyStatus } from '@prisma/client';
import { Request } from 'express';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';

interface CustomRequest extends Request {
  user: {
    id: number;
    userId?: number;
    companyId: number;
    role?: string;
  };
}

@Controller('test')
export class TestController {
  @Get('admin')
  @UseGuards(JwtRolesGuard)
  @Roles('super_admin')
  getAdmin(@Req() req) {
    return {
      message: 'Authenticated Super Admin',
      user: req.user,
      cookies: req.cookies,
    };
  }

  @Get('cookies')
  getCookies(@Req() req: Request): any {
    return req.cookies;
  }
}

@ApiTags('Company')
@Controller('company/esg')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(JwtRolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Retrieve all companies' })
  @ApiForbiddenResponse({ description: 'Forbidden: requires super_admin role' })
  @Get('all')
  findAll() {
    return this.companyService.findAll();
  }

  @ApiOperation({ summary: 'Retrieve my company details' })
  @UseGuards(JwtRolesGuard)
  @Roles(
    'company_esg_admin',
    'company_esg_subadmin',
    'company_esg_data_officer',
    'company_esg_viewer',
  )
  @Get('profile')
  getMyCompany(@Req() req: Request & { user: { companyId: number } }) {
    const companyId = req.user.companyId;
    return this.companyService.findById(companyId);
  }

  @ApiOperation({ summary: 'Get company dashboard data' })
  @ApiResponse({ status: 200, description: 'Returns ESG dashboard overview' })
  @UseGuards(JwtRolesGuard)
  @Roles(
    'company_esg_admin',
    'company_esg_subadmin',
    'company_esg_data_officer',
    'company_esg_viewer',
  )
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboard(@Req() req: CustomRequest) {
    const companyId = Number(req.user.companyId);

    const dashboard = await this.companyService.getDashboard(companyId);

    return {
      message: 'Company dashboard data retrieved successfully.',
      data: dashboard,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin', 'company_esg_admin', 'company_esg_subadmin')
  @ApiOperation({ summary: 'Get company details by ID' })
  @ApiForbiddenResponse({
    description: 'Access denied: Only super_admin and Company User can access',
  })
  async findOne(@Param('id') id: number, @Req() req) {
    const user = req.user;

    if (user.role !== 'super_admin' && user.companyId !== Number(id)) {
      throw new ForbiddenException('Access denied');
    }

    return this.companyService.findById(Number(id));
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update company status' })
  @ApiForbiddenResponse({ description: 'Forbidden: requires super_admin role' })
  async updateStatus(
    @Param('id') id: number,
    @Body('status') status: CompanyStatus,
  ) {
    return this.companyService.updateStatus(id, status);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('company_esg_admin', 'company_esg_subadmin')
  @ApiOperation({ summary: 'Update company details (excluding status)' })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires valid role and company ownership',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Req() req,
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

import { Controller, Post, Body, Req, Param, Get, Patch } from '@nestjs/common';
import { CompanyService } from '../services/company.service';
import { CreateCompanyDto } from '../dtos/company.dto';

@Controller('esg/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async createCompany(@Req() req, @Body() dto: CreateCompanyDto) {
    const userId = req.user.id;
    return this.companyService.createCompany(userId, dto);
  }

  // Additional routes (GET, PATCH) for companies will be added later
}

import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dtos/create-company.dto';

@Controller('esg/companies')
export class CompaniesController {
  constructor(private service: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.service.createCompany(dto);
  }

  @Get(':company_id')
  getById(@Param('company_id') companyId: string) {
    return this.service.getCompany(parseInt(companyId));
  }
}
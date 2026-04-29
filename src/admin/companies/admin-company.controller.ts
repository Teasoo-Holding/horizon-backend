import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminCompanyService } from './admin-company.service';
import { 
  AdminCompanyStatsDto, 
  AdminCompanyListItemDto, 
  AdminCompanyDetailsDto, 
  UpdateCompanyStatusDto 
} from '../dto/admin-company.dto';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';

@ApiTags('Admin Company Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(private readonly companyService: AdminCompanyService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get high-level company statistics' })
  @ApiResponse({ status: 200, type: AdminCompanyStatsDto })
  async getStats() {
    return this.companyService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of all companies with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'industryId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated company list' })
  async getCompanies(@Query() query: any) {
    return this.companyService.getCompanies(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a specific company' })
  @ApiResponse({ status: 200, type: AdminCompanyDetailsDto })
  async getCompanyDetails(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getCompanyDetails(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Moderate company status (Approve/Suspend)' })
  @ApiResponse({ status: 200, description: 'Company status updated' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyStatusDto,
    @GetUserDecorator('id') adminId: number
  ) {
    return this.companyService.updateStatus(id, dto.status, adminId);
  }
}

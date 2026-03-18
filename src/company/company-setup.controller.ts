import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';
import { CompanySetupService } from './company-setup.service';
import { BulkCreateDto } from './dtos/bulk-create.dto';

@ApiTags('Company Setup')
@ApiBearerAuth()
@Controller('company-setup')
@UseGuards(JwtRolesGuard)
export class CompanySetupController {
  constructor(private readonly companySetupService: CompanySetupService) {}

  @Post('bulk-create')
  @Roles(RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({
    summary: 'Create subsidiaries, departments, and users in bulk',
  })
  async bulkCreate(
    @Body() dto: BulkCreateDto,
    @Request() req: { user: { companyId: number; id: number } },
  ) {
    return this.companySetupService.bulkCreate(
      req.user.companyId,
      dto,
      req.user.id,
    );
  }
}

import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Param,
  Body,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateSubUserDto } from './dto/update-sub-user.dto';

@ApiTags('Company Users')
@Controller('company/users')
@UseGuards(JwtRolesGuard)
@ApiBearerAuth()
export class CompanyUsersController {
  constructor(private readonly companyUsersService: CompanyUsersService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company user' })
  async updateCompanyUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateSubUserDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.companyUsersService.updateCompanyUser(
      req.user.id,
      id,
      updateUserDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company user' })
  async deleteCompanyUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.companyUsersService.deleteCompanyUser(req.user.id, id);
  }

  @Get(':companyId')
  @UseGuards(JwtRolesGuard)
  @Roles('super_admin', 'company_esg_admin', 'company_esg_subadmin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all active and pending users of a company',
  })
  async getCompanyUsers(
    @Req()
    req: { user: { id: number; companyId: number; role: { name: string } } },
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.companyUsersService.getAllUsersOfCompany(req.user, companyId);
  }
}

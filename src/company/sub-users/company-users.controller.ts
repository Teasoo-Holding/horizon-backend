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
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users of a company (super admin and company users only)',
  })
  async getUsersByCompany(
    @Req() req: { user: { id: number } },
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.companyUsersService.getAllUsersOfCompany(
      req.user.id,
      companyId,
    );
  }
}

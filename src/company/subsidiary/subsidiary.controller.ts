import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SubsidiaryService } from './subsidiary.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { RequestWithUser } from 'src/user/user.controller';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';
import { USER_MANAGEMENT_ROLES, ALL_ROLES } from 'src/auth/roles/role.constants';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';

@Controller('subsidiary')
export class SubsidiaryController {
  constructor(private readonly subsidiaryService: SubsidiaryService) {}

  @Post()
  @UseGuards(JwtRolesGuard)
  @Roles(...USER_MANAGEMENT_ROLES)
  async create(
    @Req() req: RequestWithUser,
    @Body() createSubsidiaryDto: CreateSubsidiaryDto,
  ) {
    return await this.subsidiaryService.create(
      createSubsidiaryDto,
      req.user.id,
    );
  }

  @Get()
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  async findAll(@Req() req: RequestWithUser) {
    return await this.subsidiaryService.findAll(req.user.id);
  }

  @Get('company-subsidiaries')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  async findCompanySubsidiaries(@Req() req: RequestWithUser) {
    return await this.subsidiaryService.findCompanySubsidiaries(req.user.id);
  }

  @ApiOperation({ summary: 'Get all users of a subsidiary' })
  @ApiProperty({
    description: 'Subsidiary id',
    example: 1,
    required: true,
  })
  @Get(':id/users')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  async findSubsidiaryUsers(@Param('id', ParseIntPipe) id: number) {
    return await this.subsidiaryService.findSubsidiaryUsers(id);
  }

  @Get(':id')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  async findOne(@Param('id') id: number) {
    return await this.subsidiaryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtRolesGuard)
  @Roles(...USER_MANAGEMENT_ROLES)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubsidiaryDto: UpdateSubsidiaryDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.subsidiaryService.update(
      id,
      updateSubsidiaryDto,
      req.user.id,
    );
  }

  @UseGuards(JwtRolesGuard)
  @Roles(...USER_MANAGEMENT_ROLES)
  @Delete(':id')
  async remove(@Param('id') id: number, @Req() req: RequestWithUser) {
    return await this.subsidiaryService.remove(id, req.user.id);
  }
}

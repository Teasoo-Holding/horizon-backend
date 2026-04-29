import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminSectorsService } from './admin-sectors.service';
import { CreateSectorDto, UpdateSectorDto, CreateIndustryDto, UpdateIndustryDto } from './dto/sectors.dto';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';

@ApiTags('Admin Sectors & Industries')
@ApiBearerAuth()
@UseGuards(JwtRolesGuard)
@Roles('super_admin', 'platform_subadmin')
@Controller('admin')
export class AdminSectorsController {
  constructor(private readonly service: AdminSectorsService) {}

  @Post('sectors')
  @ApiOperation({ summary: 'Create a new sector' })
  async createSector(@Body() dto: CreateSectorDto) {
    return this.service.createSector(dto);
  }

  @Get('sectors')
  @ApiOperation({ summary: 'Get all sectors with stats' })
  async getSectors() {
    return this.service.getSectors();
  }

  @Get('sectors/:id')
  @ApiOperation({ summary: 'Get a sector by ID' })
  async getSectorById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSectorById(id);
  }

  @Put('sectors/:id')
  @ApiOperation({ summary: 'Update a sector' })
  async updateSector(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSectorDto) {
    return this.service.updateSector(id, dto);
  }

  @Delete('sectors/:id')
  @ApiOperation({ summary: 'Delete a sector' })
  async deleteSector(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteSector(id);
  }

  // --- Industries ---

  @Post('industries')
  @ApiOperation({ summary: 'Create a new industry in a sector' })
  async createIndustry(@Body() dto: CreateIndustryDto) {
    return this.service.createIndustry(dto);
  }

  @Get('industries')
  @ApiOperation({ summary: 'Get all industries with stats' })
  async getIndustries() {
    return this.service.getIndustries();
  }

  @Get('industries/:id')
  @ApiOperation({ summary: 'Get an industry by ID' })
  async getIndustryById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getIndustryById(id);
  }

  @Put('industries/:id')
  @ApiOperation({ summary: 'Update an industry' })
  async updateIndustry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIndustryDto) {
    return this.service.updateIndustry(id, dto);
  }

  @Delete('industries/:id')
  @ApiOperation({ summary: 'Delete an industry' })
  async deleteIndustry(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteIndustry(id);
  }
}

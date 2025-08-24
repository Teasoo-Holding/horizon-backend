import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { SubsidiaryService } from './subsidiary.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { RequestWithUser } from 'src/user/user.controller';
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';

@Controller('subsidiary')
export class SubsidiaryController {
  constructor(private readonly subsidiaryService: SubsidiaryService) {}


  @Post()
  @UseGuards(JwtRolesGuard)
  async create(
    @Req() req: RequestWithUser,
  @Body() createSubsidiaryDto: CreateSubsidiaryDto
) {
  console.log("Creating subsidiary for user:", req.user);
  return await this.subsidiaryService.create(createSubsidiaryDto, req.user.id);
}

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return await this.subsidiaryService.findAll(req.user.id);
  }


  @Get('company-subsidiaries')
  async findCompanySubsidiaries(@Req() req: RequestWithUser) {
    return await this.subsidiaryService.findCompanySubsidiaries(req.user.id);
  }


  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.subsidiaryService.findOne(id);
  }
  

  @Patch(':id')
  async update(@Param('id') id: number, @Body() updateSubsidiaryDto: UpdateSubsidiaryDto) {
    return await this.subsidiaryService.update(id, updateSubsidiaryDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return await this.subsidiaryService.remove(id);
  }
}

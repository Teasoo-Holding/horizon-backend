import { Controller, Post, Get, Body, Param, Patch, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { SubsidiaryService } from './subsidiary.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';

@ApiTags('subsidiary') // Groups endpoints under 'subsidiary' in Swagger UI
@Controller('subsidiary')
export class SubsidiaryController {
  constructor(private readonly subsidiaryService: SubsidiaryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subsidiary company' })
  @ApiBody({ type: CreateSubsidiaryDto })
  @ApiResponse({ 
    status: 201, 
    description: 'The subsidiary has been successfully created.' 
  })
  @ApiResponse({ status: 404, description: 'Parent company not found' })
  create(@Body() dto: CreateSubsidiaryDto) {
    return this.subsidiaryService.create(dto);
  }

  @Get('parent/:parentId')
  @ApiOperation({ summary: 'Get all subsidiaries by parent company ID' })
  @ApiParam({ name: 'parentId', type: Number, description: 'ID of the parent company' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all subsidiaries for the given parent company' 
  })
  findAllByParent(@Param('parentId', ParseIntPipe) parentId: number) {
    return this.subsidiaryService.findAllByParentCompanyId(parentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subsidiary by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Subsidiary company ID' })
  @ApiResponse({ status: 200, description: 'Returns the subsidiary company' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subsidiaryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subsidiary company' })
  @ApiParam({ name: 'id', type: Number, description: 'Subsidiary company ID' })
  @ApiBody({ type: UpdateSubsidiaryDto })
  @ApiResponse({ status: 200, description: 'The subsidiary has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubsidiaryDto) {
    return this.subsidiaryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subsidiary company' })
  @ApiParam({ name: 'id', type: Number, description: 'Subsidiary company ID' })
  @ApiResponse({ status: 200, description: 'The subsidiary has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subsidiaryService.remove(id);
  }
}
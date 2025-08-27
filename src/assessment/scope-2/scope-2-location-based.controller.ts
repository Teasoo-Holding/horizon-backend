import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { LocationBasedS2Service } from './scope-2-location-based.service';
import { LocationBasedS2Dto } from './dto/create_scope-2_location_based.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('LocationBasedS2')
@Controller('location-based-s2')
export class LocationBasedS2Controller {
  constructor(private readonly service: LocationBasedS2Service) {}

  /**
   * Create new LocationBasedS2 record
   */
  @Post()
  @ApiOperation({ summary: 'Create LocationBasedS2 record' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: LocationBasedS2Dto })
  @UseInterceptors(FilesInterceptor('files'))
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: LocationBasedS2Dto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: { user: { id: number } },
  ) {
    // Map uploaded files by originalname so service can identify them
    const fileMap = {};
    files.forEach((f) => (fileMap[f.originalname] = f));
    return this.service.create(dto, fileMap, req.user.id);
  }

  /**
   * Get all records
   */
  @Get()
  @ApiOperation({ summary: 'Get all LocationBasedS2 records' })
  async findAll() {
    return this.service.findAll();
  }

  /**
   * Get single record by id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get single LocationBasedS2 record' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * Update record
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update LocationBasedS2 record' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: LocationBasedS2Dto })
  @UseInterceptors(FilesInterceptor('files'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LocationBasedS2Dto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const fileMap = {};
    files.forEach((f) => (fileMap[f.originalname] = f));
    return this.service.update(id, dto, fileMap);
  }

  /**
   * Delete record
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete LocationBasedS2 record' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

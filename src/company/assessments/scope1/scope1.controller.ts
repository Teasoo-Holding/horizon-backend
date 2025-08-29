import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Scope1Service } from './scope1.service';
import { CreateScope1Dto } from './scope1-dto/create-scope1.dto';
import { UpdateScope1Dto } from './scope1-dto/update-scope1.dto';
import { Scope1Dto } from './scope1-dto/scope1.dto';

@Controller('scope1')
export class Scope1Controller {
  constructor(private readonly scope1Service: Scope1Service) {}

  @Post()
  async create(@Body() createScope1Dto: CreateScope1Dto): Promise<Scope1Dto> {
    return this.scope1Service.create(createScope1Dto);
  }

  @Get()
  async findAll(): Promise<Scope1Dto[]> {
    return this.scope1Service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Scope1Dto> {
    const scope1 = await this.scope1Service.findOne(id);
    if (!scope1) {
      throw new HttpException('Scope1Data not found', HttpStatus.NOT_FOUND);
    }
    return scope1;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScope1Dto: UpdateScope1Dto,
  ): Promise<Scope1Dto> {
    const scope1 = await this.scope1Service.update(id, updateScope1Dto);
    if (!scope1) {
      throw new HttpException('Scope1Data not found', HttpStatus.NOT_FOUND);
    }
    return scope1;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const success = await this.scope1Service.remove(id);
    if (!success) {
      throw new HttpException('Scope1Data not found', HttpStatus.NOT_FOUND);
    }
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComputationService } from './computation.service';
import { CreateComputationDto } from './dto/create-computation.dto';
import { UpdateComputationDto } from './dto/update-computation.dto';

@Controller('computation')
export class ComputationController {
  constructor(private readonly computationService: ComputationService) {}

  @Post()
  create(@Body() createComputationDto: CreateComputationDto) {
    return this.computationService.create(createComputationDto);
  }

  @Get()
  findAll() {
    return this.computationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.computationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComputationDto: UpdateComputationDto) {
    return this.computationService.update(+id, updateComputationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.computationService.remove(+id);
  }
}

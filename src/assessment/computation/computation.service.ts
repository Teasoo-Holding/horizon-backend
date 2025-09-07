import { Injectable } from '@nestjs/common';
import { CreateComputationDto } from './dto/create-computation.dto';
import { UpdateComputationDto } from './dto/update-computation.dto';

@Injectable()
export class ComputationService {
  create(createComputationDto: CreateComputationDto) {
    return 'This action adds a new computation';
  }

  findAll() {
    return `This action returns all computation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} computation`;
  }

  update(id: number, updateComputationDto: UpdateComputationDto) {
    return `This action updates a #${id} computation`;
  }

  remove(id: number) {
    return `This action removes a #${id} computation`;
  }
}

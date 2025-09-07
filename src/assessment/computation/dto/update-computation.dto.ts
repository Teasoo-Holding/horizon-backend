import { PartialType } from '@nestjs/swagger';
import { CreateComputationDto } from './create-computation.dto';

export class UpdateComputationDto extends PartialType(CreateComputationDto) {}

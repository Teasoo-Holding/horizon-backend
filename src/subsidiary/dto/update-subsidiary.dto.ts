import { PartialType } from '@nestjs/mapped-types';
import { CreateSubsidiaryDto } from './create-subsidiary.dto';

export class UpdateSubsidiaryDto extends PartialType(CreateSubsidiaryDto) {}

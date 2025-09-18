// src/user/dto/update-me.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { BaseUserDto } from './base-user.dto';

export class UpdateMeDto extends PartialType(BaseUserDto) {
  @IsOptional()
  @IsString()
  @MinLength(2)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string;
}

import { IsOptional, IsString, MinLength } from 'class-validator';
import { BaseUserDto } from './base-user.dto';

export class CreateUserDto extends BaseUserDto {
  @IsString()
  @MinLength(2)
  full_name: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  last_name?: string;
}
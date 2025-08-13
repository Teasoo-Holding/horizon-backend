import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminGetusersDto {
    @ApiPropertyOptional({ description: 'Filter by user status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Search across all user fields' })
  @IsString()
  @IsOptional()
  search?: string;

}
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSubUserDto {
  @ApiProperty({ example: 'Barry', required: false })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiProperty({ example: 'Allen', required: false })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    example: 5,
    description: 'Role ID of the user',
    required: false,
  })
  @IsInt()
  @IsOptional()
  roleId?: number;

  @ApiProperty({
    example: 3,
    description: 'Department ID of the user',
    required: false,
  })
  @IsInt()
  @IsOptional()
  departmentId?: number;

  @ApiProperty({ example: '123-456-7890', required: false })
  @IsString()
  @IsOptional()
  phone_number?: string;
}

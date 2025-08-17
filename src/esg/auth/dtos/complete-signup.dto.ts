import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class CompleteSignupDto {
  @ApiProperty({ example: 'Bruce' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Wayne' })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({ example: '123-456-7890' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'token-from-email-invite-link' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

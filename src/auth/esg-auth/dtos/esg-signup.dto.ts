import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { RegisterDto } from 'src/auth/dto';

export class EsgSignupDto extends RegisterDto {
  @ApiProperty({ example: 'BeelahTech Ltd.' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Energy - ID' })
  @IsNumber()
  industryId: number;

  @ApiProperty({ example: 'investor' })
  @IsString()
  @IsOptional()
  company_type?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { RegisterDto } from 'src/auth/dto';

export class EsgSignupDto extends RegisterDto {
  @ApiProperty({ example: 'BeelahTech Ltd.' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'RC123456' })
  @IsString()
  registration_number: string;

  @ApiProperty({ example: 'Energy - ID' })
  @IsNumber()
  industryId: number;

  @ApiProperty({ example: 'NG' })
  @IsString()
  isoCountryCode: string;

  @ApiProperty({ example: '123 Green Street, Abuja, Nigeria' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsString()
  website: string;

  @ApiProperty({ example: 'info@btech.com' })
  @IsString()
  contact_email: string;

  @ApiProperty({ example: '+2348123456789' })
  @IsString()
  contact_phone: string;
}

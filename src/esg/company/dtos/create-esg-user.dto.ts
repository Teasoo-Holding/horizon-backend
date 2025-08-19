import { IntersectionType } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { RegisterDto } from 'src/auth/dto';

export class CreateEsgUserDto extends IntersectionType(RegisterDto) {
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  registration_number: string;

  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  industry_type: string;
}

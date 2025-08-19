import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  first_name: string;

  @IsString()
  @MinLength(2)
  last_name: string;

  @IsString()
  @MinLength(2)
  company_name: string;

  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/)
  registration_number: string;
}
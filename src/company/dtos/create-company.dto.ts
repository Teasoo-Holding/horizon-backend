import { IsEmail, IsString, MinLength, Matches, IsNumber } from 'class-validator';

export class CreateCompanyDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number'
  })
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

  @IsNumber()
  industryId: number;

  @IsString()
  @MinLength(5)
  address: string;

  @IsString()
  contact_email: string;

  @IsString()
  @Matches(/^\+?\d{10,15}$/)
  contact_phone: string;
}
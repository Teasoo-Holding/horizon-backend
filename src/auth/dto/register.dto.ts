import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;

  @IsString() @MinLength(2)
  first_name: string;

  @IsOptional() @IsString() @MinLength(2)
  last_name?: string;

  @IsOptional() @IsString() @Matches(/^\+?\d{10,15}$/)
  phone_number?: string;

  @IsOptional() @IsString()
  company?: string;

  @IsString()
  role: string;

  @IsOptional() @IsString()
  permission?: string;
}
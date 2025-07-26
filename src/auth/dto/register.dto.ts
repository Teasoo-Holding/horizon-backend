import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;

  @IsString() @MinLength(2)
  firstName: string;

  @IsString() @MinLength(2)
  lastName?: string;

  @IsOptional() @IsString() @Matches(/^\+?\d{10,15}$/)
  phoneNumber?: string;

  @IsOptional() @IsString()
  company?: string;

  @IsString()
  role: string;
}
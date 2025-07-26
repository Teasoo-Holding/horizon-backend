import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;

  @IsString() @MinLength(2)
  firstName: string;

  @IsOptional() @IsString()
  lastName?: string;

  @IsOptional() @IsString() @Matches(/^\+?\d{10,15}$/)
  phoneNumber?: string;

  @IsOptional() @IsString()
  company?: string;

  // @IsString()
  // role: string;
  
  @IsEnum(Role)
  role: Role;
}
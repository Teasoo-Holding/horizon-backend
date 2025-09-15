import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  otp: string;

  @IsString()
  @MinLength(8)
  new_password: string;
}

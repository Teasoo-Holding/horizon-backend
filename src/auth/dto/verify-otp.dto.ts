import { IsEmail, IsString, MinLength } from 'class-validator';

export class LeanVerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  otp: string;
}

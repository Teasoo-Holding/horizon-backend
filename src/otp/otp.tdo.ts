import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length } from "class-validator";

export class OTPDto {
    email: string;
    otp: string
}

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email to send the OTP to' })
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '1234', description: 'The OTP code sent to the user' })
  @IsString()
  @Length(4, 6)
  otp: string;
}
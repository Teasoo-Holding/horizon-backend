import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class OTPDto {
    email: string;
    otp: string
}

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email to send the OTP to' })
  @IsEmail()
  email: string;
}

export class TestEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email to send the OTP to' })
  @IsEmail()
  @IsNotEmpty()
  email: string ; 
  

  @ApiProperty({ example: 'KC', description: " User's firstname" })
  @IsString()
  @IsNotEmpty()
  first_name: string
}

export class VerifyOtpDto {
  @ApiProperty({ example: '1234', description: 'The OTP code sent to the user' })
  @IsString()
  @Length(4, 6)
  otp: string;
}
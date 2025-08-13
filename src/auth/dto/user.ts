import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length } from "class-validator";

export class JWTUserDto extends Request {
  
    userId: number;
    email: string;
    role: string;
    companyId: number


}


export class TeasoAdminSendRequest {
    email: string;
    role: string;
    
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'The email address to verify' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234', description: 'OTP sent to the user\'s email' })
  @IsString()
  @Length(4, 6)
  otp: string;
}
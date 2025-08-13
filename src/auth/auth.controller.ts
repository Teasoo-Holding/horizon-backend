import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { VerifyEmailDto } from './dto/user';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  async verifyEmailForUserRegistration(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmailForUserRegistration(dto.email, dto.otp);
  }

  @Post("resend-token")
  async resendToken(@Body() dto: {email: string}){
    return await this.authService.resendToken(dto.email)
  }
}

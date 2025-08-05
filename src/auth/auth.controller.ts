import { GetUserDecorator } from './decorators/getuser.decorator';
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

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
  @Post('test')
  async test(@GetUserDecorator() user: any) {
    return user;
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: { email: string; otp: string }) {
    return this.authService.verifyEmail(dto.email, dto.otp);
  }
}

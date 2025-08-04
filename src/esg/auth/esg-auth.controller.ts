import { Body, Controller, Post } from '@nestjs/common';
import { EsgAuthService } from './esg-auth.service';
import { EsgSignupDto } from './dtos/esg-signup.dto';


@Controller('esg/auth')
export class EsgAuthController {
  constructor(private readonly authService: EsgAuthService) {}

  @Post('signup')
  async signup(@Body() dto: EsgSignupDto) {
    return this.authService.signup(dto);
  }
}

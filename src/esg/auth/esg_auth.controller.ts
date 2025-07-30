import { Controller, Post, Body } from '@nestjs/common';
import { EsgAuthService } from './esg_auth.service';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { EsgSignupDto } from './dtos/esg_signup.dto';

@Controller('auth/esg')
@ApiTags('ESG Authentication')
export class EsgAuthController {
  constructor(private readonly authService: EsgAuthService) {}

  @Post('signup')
  @ApiResponse({
    status: 201,
    description: 'Company registration pending approval',
  })
  async signup(@Body() dto: EsgSignupDto) {
    return this.authService.registerCompany(dto);
  }
}

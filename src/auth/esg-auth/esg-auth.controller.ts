import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EsgAuthService } from './esg-auth.service';
import { EsgSignupDto } from './dtos/esg-signup.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompleteSignupDto } from './dtos/complete-signup.dto';

@ApiTags('ESG User Signup')
@Controller('company/esg')
export class EsgAuthController {
  constructor(private readonly authService: EsgAuthService) {}

  @Get('check-email')
  @ApiOperation({
    summary: 'Enter an email to check if its already registered',
  })
  async checkEmailExists(@Query('email') email: string) {
    return this.authService.checkEmailExists(email);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Register a new ESG company and company esg admin' })
  async signup(@Body() dto: EsgSignupDto) {
    return this.authService.signup(dto);
  }

  @Post('complete-signup')
  @ApiOperation({ summary: 'Complete invited user signup' })
  async completeSignup(@Body() dto: CompleteSignupDto) {
    return this.authService.completeSignup(dto);
  }
}

import { Body, Controller, Param, Post } from '@nestjs/common';
import { EsgAuthService } from './esg-auth.service';
import { EsgSignupDto } from './dtos/esg-signup.dto';
import { ApiOperation } from '@nestjs/swagger';
import { CompleteInviteSignupDto } from './dtos/complete-invite-signup.dto';


@Controller('company/esg')
export class EsgAuthController {
  constructor(private readonly authService: EsgAuthService) { }

  @Post('signup')
  @ApiOperation({ summary: 'Register a new ESG company and company esg admin' })
  async signup(@Body() dto: EsgSignupDto) {
    return this.authService.signup(dto);
  }

  @Post('invitation/:token/complete')
  @ApiOperation({ summary: 'Complete signup from invitation' })
  async completeSignupFromInvitation(
    @Param('token') token: string,
    @Body() dto: CompleteInviteSignupDto,
  ) {
    return this.authService.completeSignupFromInvitation(token, dto);
  }
}

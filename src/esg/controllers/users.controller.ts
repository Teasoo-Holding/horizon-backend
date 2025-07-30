import { Controller, Post, Body, Req } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { EsgUserSignupDto } from '../dtos/users.dto';

@Controller('esg/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(@Body() dto: EsgUserSignupDto) {
    return this.usersService.signupUser(dto);
  }

  // other endpoints will go here later
}

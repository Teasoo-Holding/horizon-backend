import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JWTUserDto } from 'src/auth/dto/user';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';

@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('send')
  async sendOtp(@GetUserDecorator() user: JWTUserDto) {
    const current_user = await this.prisma.user.findUnique({
      where: {
        id: user.userId,
      },
    });
    if (!current_user) {
      throw new NotFoundException('User not found');
    }
    const otp = this.otpService.generateOtp();

    await this.otpService.sendOtp(user?.email, otp);
    await this.otpService.storeOtp(user.userId, otp);
    
    return { message: `OTP sent to ${user.email}` };
  }


  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyOtp(
    @GetUserDecorator() user: JWTUserDto,
    @Body('otp') otp: string,
  ) {
    if (!otp) throw new BadRequestException('OTP is required');

    const result = await this.otpService.verifyOtp(user.userId, otp);

    if (result !== true) {
      throw new BadRequestException(result);
    }

    return { message: 'OTP verified successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend')
  async resendOtp(@GetUserDecorator() user: JWTUserDto) {
    const current_user = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!current_user) throw new NotFoundException('User not found');

    const otp = await this.otpService.generateOtp();
    await this.otpService.generateOtp();
    await this.otpService.storeOtp(user.userId, otp);
    await this.otpService.sendOtp(user.email, otp);

    return { message: `OTP resent to ${user.email}` };
  }
}

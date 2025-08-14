import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JWTUserDto } from 'src/auth/dto/user';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';
import { SendOtpDto, VerifyOtpDto } from './otp.tdo';


@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('send')
  @ApiOperation({ summary: 'Send OTP to logged-in user' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully', schema: {
    example: { message: 'OTP sent to user@example.com' }
  }})
  async sendOtp(@GetUserDecorator() user: JWTUserDto) {
    const current_user = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!current_user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.otpService.generateOtp();
    await this.otpService.sendOtp(user?.email, otp);
    await this.otpService.storeOtp(user.email, otp);

    return { message: `OTP sent to ${user.email}` };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP for logged-in user' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully', schema: {
    example: { message: 'OTP verified successfully' }
  }})
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @GetUserDecorator() user: JWTUserDto,
    @Body() dto: VerifyOtpDto,
  ) {
    if (!dto.otp) throw new BadRequestException('OTP is required');

    const result = await this.otpService.verifyOtp(user.userId, dto.otp);

    if (result !== true) {
      throw new BadRequestException(result);
    }

    return { message: 'OTP verified successfully' };
  }

  @Post('resend')
  @ApiOperation({ summary: 'Resend OTP to email address' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP resent successfully', schema: {
    example: { message: 'OTP resent to user@example.com' }
  }})
  async resendOtp(@Body() dto: SendOtpDto) {
    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(dto.email, otp);
    await this.otpService.sendOtp(dto.email, otp);

    return { message: `OTP resent to ${dto.email}` };
  }
}

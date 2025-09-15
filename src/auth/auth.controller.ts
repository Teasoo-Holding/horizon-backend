import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const isProduction = process.env.NODE_ENV === 'production';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'General login with email and password' })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userObject = await this.authService.validateUser(
      dto.email,
      dto.password,
    );

    const user = {
      id: userObject.id,
      email: userObject.email,
      role: userObject.role?.name,
      companyId: userObject.companyId,
    };

    const {
      accessToken,
      refreshToken,
      user: userData,
    } = await this.authService.login(user);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      maxAge: 15 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax',
    });

    return { message: 'Logged in successfully', user: userData };
  }

  @ApiOperation({ summary: 'Refresh token endpoint' })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    try {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { refresh_token: refreshToken },
      });

      if (!tokenRecord) {
        return res
          .status(401)
          .json({ message: 'Refresh token invalid (not found in DB)' });
      }

      if (tokenRecord.expires_at < new Date()) {
        return res.status(401).json({ message: 'Refresh token expired' });
      }

      let payload;
      try {
        payload = this.jwtService.verify(String(refreshToken), {
          secret: process.env.JWT_SECRET,
        });
      } catch (err) {
        console.error('JWT verification error:', err);
        return res
          .status(401)
          .json({ message: 'Invalid refresh token (bad signature)' });
      }

      const accessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          companyId: payload.companyId,
        },
        { expiresIn: '24h' },
      );

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        maxAge: 15 * 60 * 1000,
        sameSite: isProduction ? 'none' : 'lax',
      });

      return { message: 'Access token refreshed' };
    } catch (err) {
      console.error(err);

      if (err.code === 'P1001') {
        return res.status(503).json({
          message: 'Database connection unavailable. Please try again later.',
        });
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(503).json({
          message: 'Database error occurred',
        });
      }

      return res.status(401).json({ message: 'Refresh failed' });
    }
  }

  @ApiOperation({ summary: 'Logout and clear auth cookies' })
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: isProduction,
      maxAge: 0,
      sameSite: isProduction ? 'none' : 'lax',
    });

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isProduction,
      maxAge: 0,
      sameSite: isProduction ? 'none' : 'lax',
    });

    return { message: 'Logged out successfully' };
  }

  @Post('resend-token')
  async resendToken(@Body() dto: { email: string }) {
    return await this.authService.resendToken(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: "Send a password reset OTP to a user's email" })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.authService.sendPasswordResetOtp(dto.email);
      return { message: 'OTP sent to email.' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to send OTP. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify the OTP provided by the user' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    try {
      await this.authService.verifyOtp(dto.email, dto.otp);
      return { message: 'OTP verified successfully.' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Invalid or expired OTP.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('reset-password')
  @ApiOperation({
    summary: "Reset a user's password using their email and OTP",
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(
        dto.email,
        dto.otp,
        dto.new_password,
      );
      return { message: 'Password reset successfully.' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to reset password.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

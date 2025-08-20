import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';

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
        { expiresIn: '15m' },
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
}

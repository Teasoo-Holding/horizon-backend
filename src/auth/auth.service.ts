import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto } from './dto';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
import { RoleNames } from '@prisma/client';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private otpService: OtpService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new UnauthorizedException('User not found');

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid password');

    const { password: _, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.validateUser(email, password);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.roleId,
      companyId: user.companyId,
    });

    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        refresh_token: crypto.randomUUID(),
        user_id: user.id,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    return {
      accessToken,
      refreshToken: refreshToken.refresh_token,
      user,
    };
  }

  async register(dto: RegisterDto) {
    const { email, password, first_name, last_name, phone_number, role } = dto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already in use');

    const foundRole = await this.prisma.role.findUnique({
      where: { name: role as RoleNames },
    });
    if (!foundRole) throw new UnauthorizedException('Role not found');

    const hashedPassword = await bcrypt.hash(password, 10);

    const fallbackCompany = await this.prisma.company.findFirst();
    if (!fallbackCompany)
      throw new UnauthorizedException('No fallback company available');

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone_number,
        roleId: foundRole.id,
        companyId: fallbackCompany.id,
        status: 'PENDING',
      },
    });

    try {
      const otp = this.otpService.generateOtp();
      await this.emailService.sendEmail(email, { first_name, otp }, 7);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    const { password: _, ...result } = newUser;
    return result;
  }

  async refresh(refresh_token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { refresh_token },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({
      where: { id: stored.user_id },
    });

    return { user };
  }
}

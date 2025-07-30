import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto } from './dto';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
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
    const {
      email,
      password,
      first_name,
      last_name,
      phoneNumber,
      company,
      role,
    } = dto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already in use');

    // Look up role by name
    const foundRole = await this.prisma.role.findUnique({ where: { name: role } }) as { id: number; name: string } | null;
    if (!foundRole) throw new UnauthorizedException('Role not found');

    // let permissionId: number | null = null;

    // if (role === 'SUPER_ADMIN') {
    //   const superAdminPerm = await this.prisma.permission.findUnique({ where: { name: 'SUPER_ADMIN' } }) as { id: string; name: string } | null;
    //   if (!superAdminPerm) throw new UnauthorizedException('SUPER_ADMIN permission not found');
    //   permissionId = superAdminPerm.id;
    // } else if (role === 'SUSTAINABILITY_MANAGER') {
    //   const adminPerm = await this.prisma.permission.findUnique({ where: { name: 'ADMIN' } }) as { id: string; name: string } | null;
    //   if (!adminPerm) throw new UnauthorizedException('ADMIN permission not found');
    //   permissionId = adminPerm.id;
    // } else if (permission) {
    //   const foundPerm = await this.prisma.permission.findUnique({ where: { name: permission } }) as { id: string; name: string } | null;
    //   if (!foundPerm) throw new UnauthorizedException('Permission not found');
    //   permissionId = foundPerm.id;
    // } else {
    //   throw new UnauthorizedException('Permission is required for this role');
    // }

    const hashedPassword = await bcrypt.hash(password, 10);


    // const permissionId = 2; 

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone_number: phoneNumber,
        company,
        roleId: +foundRole.id,
        // permissionId: permissionId
      },
    });
    try {
      const otp = this.otpService.generateOtp();
      await this.emailService.sendEmail(
        email,
        { first_name, otp },
        7,
      );
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

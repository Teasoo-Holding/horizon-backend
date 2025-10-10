import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
import { CompanyStatus, CompanyType, UserStatus } from '@prisma/client';
import { ActivitiesService } from 'src/activities/activities.service';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private otpService: OtpService,
    private activitiesService: ActivitiesService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        company: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.password) {
      throw new UnauthorizedException(
        'This account was created with social login. Please sign in with Google.',
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) throw new NotFoundException('Invalid credentials');

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account awaiting approval');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: {
    id: number;
    email: string;
    role: string;
    companyId: number;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.activitiesService.logActivity({
      companyId: user.companyId,
      createdById: user.id,
      title: 'User logged in',
      description: `User ${user.email} logged in.`,
      type: 'auth',
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async register(dto: RegisterDto) {
    const { email, password, full_name, phone_number, role } = dto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');

    const foundRole = await this.prisma.role.findUnique({
      where: { name: role },
    });
    if (!foundRole) throw new NotFoundException('Role not found');

    const hashedPassword = await bcrypt.hash(password, 10);

    const fallbackCompany = await this.prisma.company.findFirst();
    if (!fallbackCompany)
      throw new UnauthorizedException('No fallback company available');

    const nameParts = full_name.split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name: first_name,
        last_name: last_name,
        phone_number,
        roleId: foundRole.id,
        companyId: fallbackCompany.id,
        status: UserStatus.pending,
      },
    });

    try {
      const otp = await this.otpService.generateOtp();
      await this.otpService.storeOtp(email, otp);
      await this.emailService.sendEmail(email, { first_name, otp }, 7);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    const { password: _, ...result } = newUser;
    const token = this.jwtService.sign({
      sub: result.id,
      email: result.email,
      role: result.roleId,
      companyId: result.companyId,
    });
    return {
      user: result,
      accessToken: token,
      message:
        'Registration successful, please check your email for verification.',
      status: UserStatus.pending,
    };
  }

  async refresh(refresh_token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { refresh_token },
      include: { user: { include: { role: true, company: true } } },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const newAccessToken = this.jwtService.sign(
      {
        sub: stored.user.id,
        email: stored.user.email,
        role: stored.user.role.name,
        companyId: stored.user.companyId,
      },
      { expiresIn: '1h' },
    );

    return {
      accessToken: newAccessToken,
      user: {
        ...stored.user,
        role: stored.user.role.name,
        company: stored.user.company?.name,
      },
    };
  }

  async verifyEmail(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new UnauthorizedException('OTP not found or user does not exist');
    }

    if (user.status === 'approved') {
      throw new UnauthorizedException('User already verified');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        status: 'approved',
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendToken(email: string): Promise<string> {
    try {
      const otp = this.otpService.generateOtp();
      await this.otpService.storeOtp(email, otp);
      await this.emailService.sendEmail(email, {}, 3);
      return otp;
    } catch (error) {
      throw new Error(`Error resending token, ${error}`);
    }
  }

  async sendPasswordResetOtp(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Intentionally not throwing an error to prevent email enumeration.
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        otpHash: await bcrypt.hash(otp, 10),
        otpExpiresAt: otpExpiresAt,
      },
    });

    await this.emailService.sendEmail(
      email,
      { first_name: user.first_name, otp },
      3,
    );
  }

  async verifyOtp(email: string, otp: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch || new Date() > user.otpExpiresAt) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    // OTP is valid
    return;
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    // Step 1: Verify the OTP again to ensure the request is valid
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid or expired OTP.');
    }
    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch || new Date() > user.otpExpiresAt) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    // Step 2: Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Step 3: Update the password and clear the OTP
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otpHash: null, // Clear the OTP to prevent reuse
        otpExpiresAt: null,
      },
    });
  }

  async socialLogin(email: string, fullName: string, provider: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, company: true },
    });

    if (existingUser) {
      if (existingUser.status !== UserStatus.active) {
        throw new UnauthorizedException('Account awaiting approval');
      }
      return existingUser;
    } else {
      const defaultRole = await this.prisma.role.findUnique({
        where: { name: 'company_esg_admin' },
      });

      if (!defaultRole) {
        throw new NotFoundException('Default role not found.');
      }

      const placeholderCompany = await this.prisma.company.create({
        data: {
          name: 'Pending Company Name',
          status: CompanyStatus.pending,
          company_type: CompanyType.esg,
        },
      });
            
      const newUser = await this.prisma.user.create({
        data: {
          email,
          first_name: fullName.split(' ')[0] || '',
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          roleId: defaultRole.id,
          companyId: placeholderCompany.id,
          status: UserStatus.pending,
          providerId: provider,
        },
        include: { role: true, company: true },
      });

      return newUser;
    }
  }
}

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async storeOtp(
    userId: number,
    expiresIn: number = 30 * 60 * 1000,
  ): Promise<any> {
    const otp = this.generateOtp();
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpExpiresAt: new Date(Date.now() + expiresIn),
        otpHash: await bcrypt.hash(otp, 10),
      },
    });
  }

  async verifyOtp(userId: number, otp: string): Promise<boolean | string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      return 'OTP not found or user does not exist';
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiresAt) {
      return 'OTP has expired';
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      return 'Invalid OTP';
    }

    return true;
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    await this.emailService.sendEmail(email, { otp }, 2);
  }


  async resendOtp(email: string): Promise<string> {
    const otp = this.generateOtp();
    await this.sendOtp(email, otp);
    return `OTP ${otp} resent to ${email}`;
  }
}

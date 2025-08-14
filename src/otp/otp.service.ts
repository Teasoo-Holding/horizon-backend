import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async storeOtp(
    email: string,
    otp: string,
    expiresIn: number = 30 * 60 * 1000,
  ): Promise<any> {
    
    return await this.prisma.user.update({
      where: { email },
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
  // mini function to get future date
  const hoursFromNow = (hours: number): Date => {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  };
  const user = await this.prisma.user.findUnique({
    where: { email}
  })

  await this.emailService.sendEmail(email, { otp, first_name:  user?.first_name }, 3);

  await this.prisma.user.update({
    where: { email },
    data: {
      otpHash: this.jwtService.sign({ otp }, { expiresIn: '3h', secret: this.configService.get<string>("JWT_SECRET") }),
      otpExpiresAt: hoursFromNow(3),
    },
  });
}


async testEmailSending(email:string, otp: string, first_name){
return  await this.emailService.sendEmail(email, {otp, first_name}, 3)
}

  async resendOtp(email: string): Promise<string> {
    const otp = this.generateOtp();
    await this.sendOtp(email, otp);
    return `OTP ${otp} resent to ${email}`;
  }
}

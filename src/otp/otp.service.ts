import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
    generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async storeOtp(userId: string, otp: string, expiresIn: number = 300000) {
    return `This user ${userId} has the otp ${otp} stored for ${expiresIn} milliseconds`;
  }

  async verifyOtp(userId: string, otp: string): Promise<boolean | string> {
    return `This user ${userId} has the otp ${otp} verified`;
  }
}

import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { DemoRequestDto } from './demo-request.dto';

@Injectable()
export class ContactService {
  private readonly SUPPORT_EMAIL = 'support@esghorizon.africa';

  constructor(private emailService: EmailService) {}

  async submitDemoRequest(dto: DemoRequestDto) {
    // Internal notification to support team
    const internalResult = await this.emailService.sendEmail(
      this.SUPPORT_EMAIL,
      {
        first_name: dto.firstName,
        last_name: dto.lastName,
        email: dto.email,
        organization: dto.organization,
        industry: dto.industry,
        org_size: dto.orgSize || '',
        challenge: dto.challenge || '',
      },
      20,
    );

    // User confirmation (fire-and-forget)
    this.emailService
      .sendEmail(
        dto.email,
        {
          first_name: dto.firstName,
          organization: dto.organization,
          email: dto.email,
        },
        21,
      )
      .catch((err) => console.error('Failed to send confirmation email:', err));

    return internalResult;
  }
}

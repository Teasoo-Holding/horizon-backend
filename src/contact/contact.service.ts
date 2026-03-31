import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { DemoRequestDto } from './demo-request.dto';

@Injectable()
export class ContactService {
  private readonly SUPPORT_EMAIL = 'support@esghorizon.africa';

  constructor(private emailService: EmailService) {}

  private getTemplateIds(type: string): { internal: number; confirmation: number } {
    switch (type) {
      case 'quote':
        return { internal: 22, confirmation: 23 };
      case 'support':
        return { internal: 20, confirmation: 21 };
      default:
        return { internal: 20, confirmation: 21 };
    }
  }

  async submitDemoRequest(dto: DemoRequestDto) {
    const requestType = dto.requestType || 'demo';
    const templates = this.getTemplateIds(requestType);

    // Internal notification to support team
    const internalResult = await this.emailService.sendEmail(
      this.SUPPORT_EMAIL,
      {
        request_type: requestType,
        first_name: dto.firstName,
        last_name: dto.lastName,
        email: dto.email,
        organization: dto.organization,
        industry: dto.industry,
        org_size: dto.orgSize || '',
        challenge: dto.challenge || '',
      },
      templates.internal,
    );

    // User confirmation (fire-and-forget)
    this.emailService
      .sendEmail(
        dto.email,
        {
          request_type: requestType,
          first_name: dto.firstName,
          organization: dto.organization,
          email: dto.email,
        },
        templates.confirmation,
      )
      .catch((err) => console.error('Failed to send confirmation email:', err));

    return internalResult;
  }
}

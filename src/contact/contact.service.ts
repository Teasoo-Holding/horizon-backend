import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { DemoRequestDto } from './demo-request.dto';

@Injectable()
export class ContactService {
  private readonly SUPPORT_EMAIL = 'support@esghorizon.africa';
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

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

    // Persist first so a lead is never lost, even if email delivery fails
    let requestId: string;
    try {
      const saved = await this.prisma.contactRequest.create({
        data: {
          requestType,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          organization: dto.organization,
          industry: dto.industry,
          orgSize: dto.orgSize,
          challenge: dto.challenge,
        },
      });
      requestId = saved.id;
    } catch (err) {
      this.logger.error('Failed to save contact request', err as Error);
      return { success: false };
    }

    // Emails are best-effort and must not delay or fail the response
    this.sendNotifications(requestId, requestType, dto).catch((err) =>
      this.logger.error(`Notification emails failed for contact request ${requestId}`, err),
    );

    return { success: true };
  }

  private async sendNotifications(requestId: string, requestType: string, dto: DemoRequestDto) {
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

    await this.prisma.contactRequest.update({
      where: { id: requestId },
      data: internalResult.success
        ? { emailStatus: 'sent' }
        : { emailStatus: 'failed', emailError: String(internalResult.error ?? 'Unknown error') },
    });

    // User confirmation
    const confirmationResult = await this.emailService.sendEmail(
      dto.email,
      {
        request_type: requestType,
        first_name: dto.firstName,
        organization: dto.organization,
        email: dto.email,
      },
      templates.confirmation,
    );
    if (!confirmationResult.success) {
      this.logger.warn(`Confirmation email failed for contact request ${requestId}: ${confirmationResult.error}`);
    }
  }
}

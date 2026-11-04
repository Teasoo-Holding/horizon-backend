import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const DEFAULT_TEAM_NOTIFICATION_EMAILS = [
  'esghorizon@gmail.com',
  'efeosasere.okoro@teasooconsulting.com',
  'israel.oni@teasooconsulting.com',
];

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) { }
  private getSender() {
    return {
      email: this.configService.get<string>('SENDER_EMAIL') || 'noreply@esghorizon.africa',
      name: 'ESG Horizon',
    };
  }

  private getReplyTo() {
    return {
      email: this.configService.get<string>('REPLY_TO_EMAIL') || 'support@esghorizon.africa',
      name: 'ESG Horizon',
    };
  }

  /**
   * Team inboxes notified about contact form submissions and new registrations.
   * Override on the server with TEAM_NOTIFICATION_EMAILS (comma-separated).
   */
  getTeamNotificationEmails(): string[] {
    const configured = this.configService.get<string>('TEAM_NOTIFICATION_EMAILS');
    const emails = configured
      ? configured.split(',').map((e) => e.trim()).filter(Boolean)
      : [];
    return emails.length ? emails : DEFAULT_TEAM_NOTIFICATION_EMAILS;
  }

  async sendEmail(to: string, params: Record<string, any>, templateId: number) {
    try {
      const apiKey = this.configService.get<string>('BREVO_API_KEY');
      if (!apiKey) {
        console.warn('[EmailService] BREVO_API_KEY is not defined in environment variables');
        return { success: false, error: 'API key missing' };
      }

      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: this.getSender(),
          replyTo: this.getReplyTo(),
          to: [{ email: to }],
          templateId,
          params,
        },
        {
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
          },
        },
      );

      return { success: true, message: `Email sent` };
    } catch (error: unknown) {
      const axErr = error as any;
      const status = axErr?.response?.status;
      const body = axErr?.response?.data;
      console.error('Error sending email:', { status, body: body ?? axErr?.message });
      const errorMessage = body?.message || axErr?.message || 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async sendRawEmail(to: string, subject: string, htmlContent: string) {
    try {
      const apiKey = this.configService.get<string>('BREVO_API_KEY');
      if (!apiKey) {
        console.warn('[EmailService] BREVO_API_KEY is not defined');
        return { success: false, error: 'API key missing' };
      }

      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: this.getSender(),
          replyTo: this.getReplyTo(),
          to: [{ email: to }],
          subject,
          htmlContent,
        },
        {
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
          },
        },
      );

      return { success: true, message: 'Email sent' };
    } catch (error: unknown) {
      const axErr = error as any;
      const status = axErr?.response?.status;
      const body = axErr?.response?.data;
      console.error('Error sending raw email:', { status, body: body ?? axErr?.message });
      return { success: false, error: body?.message || axErr?.message || 'Unknown error' };
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) { }
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
          sender: {
            email: this.configService.get<string>('SENDER_EMAIL') as string,
          },
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
          sender: {
            email: this.configService.get<string>('SENDER_EMAIL') as string,
            name: 'ESG Horizon',
          },
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

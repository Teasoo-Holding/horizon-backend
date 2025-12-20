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
      console.error('Error sending email:', error);
      let errorMessage = 'Unknown error';
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as any).message === 'string'
      ) {
        errorMessage = (error as { message: string }).message;
      }
      return { success: false, error: errorMessage };
    }
  }
}

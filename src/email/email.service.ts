import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}
  async sendEmail(to: string, params: Record<string, any>, templateId: number) {
    try {
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
            'api-key': this.configService.get<string>(
              'BREVO_API_KEY',
            ) as string,
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

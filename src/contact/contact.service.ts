import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { DemoRequestDto } from './demo-request.dto';

@Injectable()
export class ContactService {
  private readonly SUPPORT_EMAIL = 'support@esghorizon.africa';

  constructor(private emailService: EmailService) {}

  async submitDemoRequest(dto: DemoRequestDto) {
    const internalHtml = this.buildInternalEmailHtml(dto);
    const internalSubject = `New Demo Request — ${dto.organization} (${dto.firstName} ${dto.lastName})`;

    const result = await this.emailService.sendRawEmail(
      this.SUPPORT_EMAIL,
      internalSubject,
      internalHtml,
    );

    // Send confirmation email to the user (fire-and-forget)
    const confirmationHtml = this.buildConfirmationEmailHtml(dto);
    this.emailService
      .sendRawEmail(dto.email, 'We received your demo request — ESG Horizon', confirmationHtml)
      .catch((err) => console.error('Failed to send confirmation email:', err));

    return result;
  }

  private buildConfirmationEmailHtml(dto: DemoRequestDto): string {
    return `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f7fdfb;">
        <!-- Header with logo -->
        <div style="padding:28px 30px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e5e5;">
          <img src="https://esghorizon.africa/logo-full.png" alt="ESG Horizon" width="140" style="display:block;margin-bottom:20px;" />
          <h1 style="margin:0;color:#1a1a1a;font-size:22px;font-weight:700;">Thank you, ${this.escapeHtml(dto.firstName)}!</h1>
          <p style="margin:6px 0 0;color:#666;font-size:14px;">We've received your demo request</p>
        </div>

        <!-- Body -->
        <div style="background:#fff;padding:28px 30px;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5;">
          <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">
            We're excited that <strong>${this.escapeHtml(dto.organization)}</strong> is interested in ESG Horizon. Here's what happens next:
          </p>
          <ol style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin:0 0 16px;">
            <li>An account lead will reach out within <strong>1 business day</strong> to schedule your personalised demo.</li>
            <li>Your 30-minute walkthrough will be tailored to your industry and reporting needs — not a generic product tour.</li>
            <li>After the demo, you'll receive a custom proposal within 24 hours.</li>
          </ol>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 0;">
            In the meantime, feel free to explore our <a href="https://esghorizon.africa/features" style="color:#0F9E8E;text-decoration:none;font-weight:600;">features</a> or check out our <a href="https://esghorizon.africa/pricing" style="color:#0F9E8E;text-decoration:none;font-weight:600;">pricing</a>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f0faf7;padding:20px 30px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <p style="font-size:12px;color:#666;margin:0 0 6px;font-weight:600;">
            ESG Horizon — Africa's #1 IFRS-Ready ESG Reporting Platform
          </p>
          <p style="font-size:11px;color:#999;margin:0 0 6px;">
            43 Oghosa Crescent, Off Ihama Road, GRA, Benin City, 300001
          </p>
          <p style="font-size:11px;color:#999;margin:0;">
            <a href="mailto:support@esghorizon.africa" style="color:#0F9E8E;text-decoration:none;">support@esghorizon.africa</a>
            &nbsp;&middot;&nbsp;
            <a href="https://esghorizon.africa" style="color:#0F9E8E;text-decoration:none;">esghorizon.africa</a>
          </p>
        </div>
      </div>
    `;
  }

  private buildInternalEmailHtml(dto: DemoRequestDto): string {
    const rows = [
      ['Name', `${dto.firstName} ${dto.lastName}`],
      ['Email', dto.email],
      ['Organization', dto.organization],
      ['Industry', dto.industry],
      ...(dto.orgSize ? [['Organization Size', dto.orgSize]] : []),
      ...(dto.challenge ? [['Biggest Challenge', dto.challenge]] : []),
    ];

    const tableRows = rows
      .map(
        ([label, value]) => `
        <tr>
          <td style="padding:10px 14px;font-weight:600;color:#333;border-bottom:1px solid #eee;width:180px;">${label}</td>
          <td style="padding:10px 14px;color:#555;border-bottom:1px solid #eee;">${this.escapeHtml(value)}</td>
        </tr>`,
      )
      .join('');

    return `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="padding:24px 30px;border-radius:12px 12px 0 0;border-bottom:1px solid #e5e5e5;">
          <img src="https://esghorizon.africa/logo-full.png" alt="ESG Horizon" width="140" style="display:block;margin-bottom:16px;" />
          <h1 style="margin:0;color:#1a1a1a;font-size:20px;font-weight:700;">New Demo Request</h1>
          <p style="margin:6px 0 0;color:#666;font-size:14px;">Someone wants a personalised walkthrough</p>
        </div>
        <div style="background:#fff;padding:24px 30px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${tableRows}
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#999;">
            Submitted via esghorizon.africa contact form
          </p>
        </div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

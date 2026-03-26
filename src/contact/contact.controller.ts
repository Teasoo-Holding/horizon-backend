import { Body, Controller, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { DemoRequestDto } from './demo-request.dto';

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('demo')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async requestDemo(@Body() dto: DemoRequestDto) {
    const result = await this.contactService.submitDemoRequest(dto);

    if (!result.success) {
      return { success: false, message: 'Something went wrong. Please try again later.' };
    }

    return { success: true, message: 'Demo request submitted successfully.' };
  }
}

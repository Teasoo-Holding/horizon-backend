import { Controller, Post, Body } from '@nestjs/common';
import { TestService } from './test.service';
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  create(@Body("phoneNumber") phoneNumber: string) {
    return this.testService.create(phoneNumber);
  }


}

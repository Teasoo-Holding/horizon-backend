import { Module } from '@nestjs/common';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { PhoneValidationService } from '../phone-validation.service';

@Module({
  controllers: [TestController],
  providers: [TestService, PhoneValidationService],
})
export class TestModule {}

import { Injectable } from '@nestjs/common';
import { PhoneValidationService } from '../phone-validation.service';

@Injectable()
export class TestService {
  constructor(
    private readonly phoneValidationService: PhoneValidationService
  ){}
  create(phoneNumber: string) {
    const validNumber = this.phoneValidationService.validatePhoneNumber(phoneNumber, 'NG');
    return validNumber;
  }

}

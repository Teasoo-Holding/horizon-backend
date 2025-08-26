import { BadRequestException, Injectable } from "@nestjs/common";
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';


@Injectable()
export class PhoneValidationService {
 private phoneUtil = PhoneNumberUtil.getInstance();

 validatePhoneNumber(phoneNumber: string, region: string): boolean {
   try {
    const parsedPhoneNumber = this.phoneUtil.parseAndKeepRawInput(phoneNumber, region);
    return this.phoneUtil.isValidNumber(parsedPhoneNumber);

   }
   catch( error: any) {
    console.log("Phone number validation failed:", error.message);
    return false;

   }
 }

 formatPhoneNumber(phoneNumber: string, region: string): string | null {
    try {
        const parsedNumber = this.phoneUtil.parseAndKeepRawInput(phoneNumber, region);
        if (!this.phoneUtil.isValidNumber(parsedNumber)) {
        throw new BadRequestException('Invalid phone number');
      }
        return this.phoneUtil.format(parsedNumber, PhoneNumberFormat.E164);
    } catch (error) {
        console.log("Phone number formatting failed:", error.message);
        throw new BadRequestException('Invalid phone number');
    }
 }
}
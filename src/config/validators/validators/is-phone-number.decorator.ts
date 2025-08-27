// validators/is-phone-number.decorator.ts
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { PhoneNumberUtil } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

export function IsValidPhoneNumber(region: string = 'NG', validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName,
      constraints: [region],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
           console.log('Validating phone:', value);
          try {
            const [region] = args.constraints;
            const number = phoneUtil.parseAndKeepRawInput(value, region);
            return phoneUtil.isValidNumber(number);
          } catch {
            return false;
          }
        },
        // defaultMessage(args: ValidationArguments) {
        //   return `${args.property} must be a valid phone number`;
        // },
      },
    });
  };
}

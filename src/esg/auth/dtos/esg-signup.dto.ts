import { IsString } from 'class-validator';
import { RegisterDto } from 'src/auth/dto';

export class EsgSignupDto extends RegisterDto {
  @IsString()
  company_name: string;
  
  @IsString()
  company_website: string;

  @IsString()
  registration_number: string;

  @IsString()
  industry_type: string;

  @IsString()
  address: string;

  @IsString()
  contact_email: string;

  @IsString()
  contact_phone: string;

  readonly role = 'SUSTAINABILITY_MANAGER';
}

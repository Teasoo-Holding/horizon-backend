import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  full_name: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/)
  phone_number?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsString()
  @IsOptional()
  profile_photo_url?: string;

  @IsOptional()
  @IsString()
  profile_photo_url_public_id?: string;
}

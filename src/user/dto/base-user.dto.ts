import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class BaseUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/)
  phone_number?: string;

  @IsOptional()
  @IsString()
  profile_photo_url?: string;

  @IsOptional()
  @IsString()
  profile_photo_url_public_id?: string;
}
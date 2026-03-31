import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DemoRequestDto {
  @IsString()
  @IsOptional()
  @IsIn(['demo', 'quote', 'support'])
  requestType?: 'demo' | 'quote' | 'support';
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  organization: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  industry: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  orgSize?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  challenge?: string;
}

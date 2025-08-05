import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'somebody@teasoo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'lePassword' })
  @IsString()
  password: string;
}

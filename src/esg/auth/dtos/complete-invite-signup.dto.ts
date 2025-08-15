import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CompleteInviteSignupDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(2)
    first_name: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(2)
    last_name: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @MinLength(8)
    password: string;
}

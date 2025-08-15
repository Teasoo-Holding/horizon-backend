import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional } from 'class-validator';

export class CreateInvitationDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 1 })
    @IsOptional()
    @IsInt()
    departmentId?: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    roleId: number;
}

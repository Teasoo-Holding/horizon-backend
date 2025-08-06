import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class TeasoAdminSendRequest {
    
    @ApiProperty({
        description: 'Email of the user to be registered',
        example: 'user@example.com'
      })
    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Role ID of the user to be registered',
        example: 1
      })
    @IsInt()
    @IsNotEmpty()
    @IsInt()
    roleId: number;

    @ApiProperty({
        description: 'Department ID of the user to be registered',
        example: 1,
        required: false
      })
    @IsInt()
    departmentId?: number;

    @ApiProperty({
        description: 'First name of the user',
        example: 'John',
        required: false
      })
    @IsString()
    @IsOptional()
    first_name?: string;

    @ApiProperty({
        description: 'Last name of the user',
        example: 'Doe',
        required: false
      })
    @IsString()
    @IsOptional()
    last_name?: string;

    @ApiProperty({
        description: 'Phone number of the user',
        example: '+1234567890',
        required: false
      })
    @IsString()
    @IsOptional()
    phone_number?: string;

    @ApiProperty({
        description: 'Status of the user registration',
        example: 'PENDING',
        required: false
      })
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

    @ApiProperty({
        description: 'Company ID of the user',
        example: 1,
        required: false
      })
    @IsString()
    @IsOptional()
    companyId: number = 1;

    @ApiProperty({
        description: 'Password of the user',
        example: 'password123',
        required: false
      })
    @IsString()
    @IsOptional()
    password: string = '';

    
}
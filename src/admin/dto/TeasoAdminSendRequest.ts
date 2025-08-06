import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class TeasoAdminSendRequest {
    
    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsInt()
    @IsNotEmpty()
    @IsInt()
    roleId: number;

    @IsInt()
    departmentId?: number;

    @IsString()
    @IsOptional()
    first_name?: string;

    @IsString()
    @IsOptional()
    last_name?: string;

    @IsString()
    @IsOptional()
    phone_number?: string;

    status?: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

    @IsString()
    @IsOptional()
    password: string = '';

    
}
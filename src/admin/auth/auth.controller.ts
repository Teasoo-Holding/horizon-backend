import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminAuthService } from './auth.service';
import { RegisterDto } from 'src/auth/dto';
import { TeasoAdminSendRequest } from '../dto';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin')
export class AdminAuthController {
    constructor(private adminAuthService: AdminAuthService) {}
    
    @Post('register')
    async registerAdmin(@Body() dto: RegisterDto) {
        return this.adminAuthService.registerAdmin(dto);
    }

    @Post('verify-email')
    async verifyEmail(@Body() dto: { email: string; otp: string }) {
        return this.adminAuthService.verifyEmail(dto.email, dto.otp);
    }

    @Post('complete-registration')
    async completeRegistration(@Body() token: string, @Body() dto: TeasoAdminSendRequest) {
        return this.adminAuthService.completeRegistration(token, dto);
    }

    @Post('verify-invite-token')
    async verifyInviteToken(@Body() dto: { token: string }) {
        return this.adminAuthService.verifyInviteToken(dto.token);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('invite-admin')
    async inviteAdmin(@Body() dto: TeasoAdminSendRequest, @GetUserDecorator() user: { role: number }) {
        console.log('Inviting admin with user role:', user);
        return this.adminAuthService.inviteAdminUser(dto, user.role);
    }

}

import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Company - Invitations')
@ApiBearerAuth()
@Controller('company/esg/invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    @Post()
    @ApiOperation({ summary: 'Invite a user to the company' })
    async createInvitation(
        @Body() dto: CreateInvitationDto,
        @Request() req: { user: { userId: number } },
    ) {
        return this.invitationsService.create(dto, req.user.userId);
    }   

    @Get(':token')
    @ApiOperation({ summary: 'Get invitation by token' })
    async getInvitation(@Param('token') token: string) {
        return this.invitationsService.getByToken(token);
    }
}

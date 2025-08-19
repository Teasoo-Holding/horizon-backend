import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';

@ApiTags('Company - Invitations')
@ApiBearerAuth()
@Controller('company/esg/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtRolesGuard)
  @ApiOperation({ summary: 'Invite a user to the company' })
  async createInvitation(
    @Body() dto: CreateInvitationDto,
    @Request() req: { user: { id: number } },
  ) {
    console.log(req.user)
    return this.invitationsService.create(dto, req.user.id);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  async getInvitation(@Param('token') token: string) {
    return this.invitationsService.getByToken(token);
  }
}

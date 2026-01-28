import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
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
  constructor(private readonly invitationsService: InvitationsService) { }

  @Post()
  @UseGuards(JwtRolesGuard)
  @ApiOperation({ summary: 'Invite a user to the company' })
  async createInvitation(
    @Body() dto: CreateInvitationDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.invitationsService.create(dto, req.user.id);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  async getInvitation(@Param('token') token: string) {
    return this.invitationsService.getByToken(token);
  }

  @Delete(':id')
  @UseGuards(JwtRolesGuard)
  @ApiOperation({ summary: 'Delete an invitation' })
  async deleteInvitation(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.invitationsService.delete(+id, req.user.id);
  }
}

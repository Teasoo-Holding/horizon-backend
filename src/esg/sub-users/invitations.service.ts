import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import { EmailService } from 'src/email/email.service';
import { randomUUID } from 'crypto';

@Injectable()
export class InvitationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    async create(dto: CreateInvitationDto, invitedById: number) {
        await this.prisma.invitation.updateMany({
            where: { email: dto.email, status: 'pending' },
            data: { status: 'expired' },
        });

        const invitingUser = await this.prisma.user.findUnique({
            where: { id: invitedById }
        });

        if (!invitingUser) {
            throw new Error('Inviting user not found');
        }

        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const invitation = await this.prisma.invitation.create({
            data: {
                email: dto.email,
                token,
                expiresAt,
                status: 'pending',
                companyId: invitingUser.companyId,
                departmentId: dto.departmentId ?? null,
                roleId: dto.roleId,
                invitedById,
            },
        });

        const link = `${process.env.FRONTEND_URL}/esg/auth/signup?token=${token}`;
        await this.emailService.sendEmail(dto.email, { first_name: dto.email, link }, 8);

        return invitation;
    }

    async getByToken(token: string) {
        const invitation = await this.prisma.invitation.findUnique({ where: { token } });
        if (!invitation) {
            throw new BadRequestException('Invalid invitation token');
        }
        return invitation;
    }
}

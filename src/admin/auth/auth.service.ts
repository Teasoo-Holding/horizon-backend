import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { RegisterDto } from 'src/auth/dto';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeasoAdminSendRequest } from '../dto';
import { JwtService } from '@nestjs/jwt';
import { AccessLevels } from '@prisma/client';
import { AdminGetusersDto } from '../dto/getuser.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private otpService: OtpService,
    private jwtService: JwtService,
  ) {}

  async registerAdmin(dto: RegisterDto) {
    const { email, password, first_name, last_name, phone_number } = dto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await hash(password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone_number,
        roleId: 2,
        companyId: 0,
        status: 'PENDING',
        accessLevel: AccessLevels.SUPER_ADMIN
      },
    });

    // Send welcome email with OTP
    try {
      const otp = await this.otpService.generateOtp();
      await this.otpService.storeOtp(email, otp);
      await this.emailService.sendEmail(email, { first_name, otp }, 7);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    return newUser;
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const verificationResult = await this.otpService.verifyOtp(user.id, otp);
    if (verificationResult !== true) {
      throw new BadRequestException(
        `OTP verification failed: ${verificationResult}`,
      );
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'APPROVED' },
    });
  }

  async inviteAdminUser(dto: TeasoAdminSendRequest, roleId: number) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('User with email already exists');

    // Only admin (roleId 1) and super admin (roleId 2) can invite others
    if (roleId !== 1 && roleId !== 2) {
      throw new UnauthorizedException(
        'Only users with admin privileges can invite others',
      );
    }

    // Prevent creating another super admin (roleId 1)
    if (dto.roleId === 1) {
      throw new UnauthorizedException('You cannot add another super admin');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        roleId: dto.roleId,
        departmentId: dto.departmentId,
        status: 'PENDING',
        first_name: '',
        last_name: '',
        phone_number: '',
        companyId: 1,
        password: '',
        accessLevel: AccessLevels.RESTRICTED_ADMIN
      },
    });

    const payload = { userId: user.id, email: user.email };
    const token = this.jwtService.sign(payload, { expiresIn: '24h' });

    try {
      const link = `http://localhost:3000/admin/verify-invite-token?token=${token}`;

      // console.log('Sending invitation email to:', dto.email);
      await this.emailService.sendEmail(
        dto.email,
        { token, first_name: dto.first_name, link, role: dto.roleId },
        2,
      );
    } catch (error) {
      console.error('Error sending invitation email:', error);
    }

    return {
      status: 'success',
      message: 'User invited successfully',
      user,
      token,
    };
  }

  async verifyInviteToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.userId) {
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status !== 'PENDING') {
        throw new BadRequestException('User is not in pending status');
      }

      return user;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException(
        `Token verification failed: ${error.message}`,
      );
    }
  }

  async completeRegistration(token: string, dto: TeasoAdminSendRequest) {
    let payload;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException(
        `Invalid or expired token: ${error.message}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired invite');
    }

    const hashedPassword = await hash(dto.password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
        password: hashedPassword,
        status: 'APPROVED',
      },
    });

    try {
      await this.emailService.sendEmail(
        user.email,
        { first_name: dto.first_name },
        9,
      );
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    return updatedUser;
  }

  async getAllUsers(
    filters: AdminGetusersDto,
    roleId: number = 1, 
  )
  {
    const { search, status } = filters;
    const where: any = {};

    if(status) {
      where.status = status;
    }
    if(roleId !== 1 && roleId !== 2 && roleId !== 3) {
      throw new UnauthorizedException('Only admin can view all users');

    }
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        status: true,
        roleId: true,
        departmentId: true,
        companyId: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

  }

  }

// import { Test, TestingModule } from '@nestjs/testing';
// import { JwtService } from '@nestjs/jwt';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { EmailService } from 'src/email/email.service';
// import { OtpService } from 'src/otp/otp.service';
// import { UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
// import { TeasoAdminSendRequest } from '../dto';
// import { AdminAuthController } from './auth.controller';
// import { AdminAuthService } from './auth.service';
// import { RegisterDto } from 'src/auth/dto';

// // Mock implementations
// const mockAuthService = {
//   registerAdmin: jest.fn(),
//   verifyEmail: jest.fn(),
//   completeRegistration: jest.fn(),
//   verifyInviteToken: jest.fn(),
//   inviteAdmin: jest.fn(),
// };

// const mockJwtService = {
//   verify: jest.fn(),
// };

// // Mock the custom decorator directly
// jest.mock('src/auth/decorators/getuser.decorator', () => ({
//   GetUserDecorator: () => (target, key, descriptor) => {
//     descriptor.value = jest.fn().mockImplementation((dto, user) => {
//       return mockAuthService.inviteAdmin(dto, user.role);
//     });
//   }
// }));

// describe('AdminAuthController', () => {
//   let controller: AdminAuthController;
//   let service: AdminAuthService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [AdminAuthController],
//       providers: [
//         { provide: AdminAuthService, useValue: mockAuthService },
//         { provide: JwtService, useValue: mockJwtService },
//         { provide: PrismaService, useValue: {} },
//         { provide: EmailService, useValue: {} },
//         { provide: OtpService, useValue: {} },
//       ],
//     }).compile();

//     controller = module.get<AdminAuthController>(AdminAuthController);
//     service = module.get<AdminAuthService>(AdminAuthService);
//     jest.clearAllMocks();
//   });

//   describe('registerAdmin', () => {
//     it('should successfully register an admin', async () => {
//       const dto: RegisterDto = {
//         email: 'test@example.com',
//         password: 'password123',
//         first_name: 'Test',
//         last_name: 'User',
//         phone_number: '1234567890',
//         role: "ADMIN"
//       };
//       const result = { ...dto, id: 1 };
//       mockAuthService.registerAdmin.mockResolvedValue(result);

//       expect(await controller.registerAdmin(dto)).toEqual(result);
//       expect(service.registerAdmin).toHaveBeenCalledWith(dto);
//     });

//     it('should throw ConflictException for duplicate email', async () => {
//       const dto: RegisterDto = {
//         email: 'duplicate@example.com',
//         password: 'password123',
//         first_name: 'Test',
//         last_name: 'User',
//         phone_number: '1234567890',
//         role: "ADMIN"
//       };
//       mockAuthService.registerAdmin.mockRejectedValue(new ConflictException('User already exists'));

//       await expect(controller.registerAdmin(dto)).rejects.toThrow(ConflictException);
//     });
//   });

//   describe('verifyEmail', () => {
//     it('should verify email successfully', async () => {
//       const dto = { email: 'test@example.com', otp: '123456' };
//       const result = { status: 'APPROVED' };
//       mockAuthService.verifyEmail.mockResolvedValue(result);

//       expect(await controller.verifyEmail(dto)).toEqual(result);
//       expect(service.verifyEmail).toHaveBeenCalledWith(dto.email, dto.otp);
//     });

//     it('should throw NotFoundException for non-existent user', async () => {
//       const dto = { email: 'missing@example.com', otp: '123456' };
//       mockAuthService.verifyEmail.mockRejectedValue(new NotFoundException('User not found'));

//       await expect(controller.verifyEmail(dto)).rejects.toThrow(NotFoundException);
//     });
//   });

//   describe('completeRegistration', () => {
//     const validDto: TeasoAdminSendRequest = {
//       first_name: 'John',
//       last_name: 'Doe',
//       phone_number: '1234567890',
//       password: 'newPassword123',
//       roleId: 2,
//       departmentId: 1,
//       email: 'john.doe@example.com',
//     };
//     const authHeader = 'Bearer valid.token.here';

//     it('should complete registration successfully', async () => {
//       const result = { ...validDto, id: 1, status: 'APPROVED' };
//       mockAuthService.completeRegistration.mockResolvedValue(result);

//       const response = await controller.completeRegistration(validDto, authHeader);
//       expect(response).toEqual(result);
//       expect(service.completeRegistration).toHaveBeenCalledWith('valid.token.here', validDto);
//     });

//     it('should throw UnauthorizedException for missing token', async () => {
//       await expect(controller.completeRegistration(validDto, "null")).rejects.toThrow(
//         UnauthorizedException,
//       );
//     });

//     it('should propagate service exceptions', async () => {
//       mockAuthService.completeRegistration.mockRejectedValue(
//         new BadRequestException('Invalid or expired invite'),
//       );

//       await expect(
//         controller.completeRegistration(validDto, authHeader),
//       ).rejects.toThrow(BadRequestException);
//     });
//   });

//   describe('verifyInviteToken', () => {
//     it('should verify token successfully', async () => {
//       const dto = { token: 'valid.token' };
//       const result = { id: 1, status: 'PENDING' };
//       mockAuthService.verifyInviteToken.mockResolvedValue(result);

//       expect(await controller.verifyInviteToken(dto)).toEqual(result);
//       expect(service.verifyInviteToken).toHaveBeenCalledWith(dto.token);
//     });

//     it('should throw UnauthorizedException for invalid token', async () => {
//       const dto = { token: 'invalid.token' };
//       mockAuthService.verifyInviteToken.mockRejectedValue(
//         new UnauthorizedException('Invalid token'),
//       );

//       await expect(controller.verifyInviteToken(dto)).rejects.toThrow(
//         UnauthorizedException,
//       );
//     });
//   });

//   describe('inviteAdmin', () => {
//     const inviteDto: TeasoAdminSendRequest = {
//       email: 'new.admin@example.com',
//       roleId: 2,
//       departmentId: 1,
//       first_name: 'New',
//       last_name: 'Admin',
//       phone_number: '0987654321',
//       password: 'tempPassword',
//     };

//     it('should successfully invite admin', async () => {
//       const result = { status: 'success', message: 'User invited successfully' };
//       mockAuthService.inviteAdmin.mockResolvedValue(result);

//       // We need to pass a user object that the mocked decorator will use
//       const user = { role: 1 };
//       expect(await controller.inviteAdmin(inviteDto, user as any)).toEqual(result);
//       expect(service.inviteAdminUser).toHaveBeenCalledWith(inviteDto, 1);
//     });

//     it('should throw UnauthorizedException for insufficient privileges', async () => {
//       mockAuthService.inviteAdmin.mockRejectedValue(
//         new UnauthorizedException('Only admin users can invite others'),
//       );

//       const user = { role: 3 };
//       await expect(controller.inviteAdmin(inviteDto, user as any)).rejects.toThrow(
//         UnauthorizedException,
//       );
//     });
//   });
// });
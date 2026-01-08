import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      register: jest
        .fn()
        .mockResolvedValue({ id: 1, email: 'test@example.com' }),
      login: jest.fn().mockResolvedValue({ access_token: 'mock-token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Jaga',
      last_name: 'Ban',
      full_name: 'Jaga Ban',
      phoneNumber: '08012345678',
      company: 'TestCo',
      role: 'super_admin',
    } as any;

    const result = await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1, email: 'test@example.com' });
  });

  it('should login a user', async () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockRes = {
      cookie: jest.fn(),
    } as any;

    const result = await controller.login(dto, mockRes);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 'mock-token' });
  });
});

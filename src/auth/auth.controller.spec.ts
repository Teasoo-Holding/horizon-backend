import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

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
    const dto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Jaga',
      last_name: 'Ban',
      role: 'SUPER_ADMIN',
    };

    const result = await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1, email: 'test@example.com' });
  });

  it('should login a user', async () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = await controller.login(dto);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 'mock-token' });
  });
});

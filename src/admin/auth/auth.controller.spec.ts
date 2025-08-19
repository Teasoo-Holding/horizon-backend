import { Test } from '@nestjs/testing';
import { AdminAuthController } from './auth.controller';
import { AdminAuthService } from './auth.service';
import { AdminGetusersDto } from '../dto/getuser.dto';
import { UserStatus } from '@prisma/client';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let service: AdminAuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: AdminAuthService,
          useValue: {
            getAllUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
    service = module.get<AdminAuthService>(AdminAuthService);
  });

  describe('getUsers', () => {
    it('should call service with query parameters', async () => {
      const filters: AdminGetusersDto = { status: UserStatus.active, search: 'john' };
      const mockResponse = [
        {
          id: 1,
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '1234567890',
          roleId: 1,
          companyId: 1,
          departmentId: null,
          status: UserStatus.active,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      jest.spyOn(service, 'getAllUsers').mockResolvedValue(mockResponse);

      const result = await controller.getAllUsers(filters, { role: 1 });

      expect(result).toEqual(mockResponse);
      expect(service.getAllUsers).toHaveBeenCalledWith(filters, 1);
    });

    it('should work with empty filters', async () => {
      const filters: AdminGetusersDto = {};
      const mockResponse = [
        {
          id: 1,
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '1234567890',
          roleId: 1,
          companyId: 1,
          departmentId: null,
          status: UserStatus.pending,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      jest.spyOn(service, 'getAllUsers').mockResolvedValue(mockResponse);

      const result = await controller.getAllUsers(filters, { role: 1 });

      expect(result).toEqual(mockResponse);
      expect(service.getAllUsers).toHaveBeenCalledWith({}, 1);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    findMe: jest.fn().mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    }),
    updateMe: jest.fn().mockImplementation((userId, dto) => ({
      id: userId,
      ...dto,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return the currently authenticated user', async () => {
      const result = await controller.getMe({ user: { userId: 1 } } as any);
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(service.findMe).toHaveBeenCalledWith(1);
    });
  });

  describe('updateMe', () => {
    it('should update and return the current user', async () => {
      const updateDto: UpdateUserDto = { first_name: 'Updated Name' };
      const result = await controller.updateMe(
        { user: { userId: 1 } } as any,
        updateDto,
      );
      expect(result).toEqual({
        id: 1,
        first_name: 'Updated Name',
      });
      expect(service.updateMe).toHaveBeenCalledWith(1, updateDto);
    });
  });
});

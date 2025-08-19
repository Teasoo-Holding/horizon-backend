import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_photo_url: 'http://example.com/photo.jpg',
      }),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({
          id: where.id,
          ...data,
        }),
      ),
    },
    role: {
      findUnique: jest.fn().mockResolvedValue({ id: 'role-id' }),
    },
    permission: {
      findUnique: jest.fn().mockResolvedValue({ id: 'permission-id' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMe', () => {
    it('should return the current user', async () => {
      const user = await service.findMe(1);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          profile_photo_url: true,
        },
      });
      expect(user).toEqual({
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_photo_url: 'http://example.com/photo.jpg',
      });
    });
  });

  describe('updateMe', () => {
    it('should update the user with given fields', async () => {
      const updated = await service.updateMe(1, {
        first_name: 'Jane',
        last_name: 'Smith',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          first_name: 'Jane',
          last_name: 'Smith',
        },
      });

      expect(updated).toEqual({
        id: 1,
        first_name: 'Jane',
        last_name: 'Smith',
      });
    });

    // it('should include role when role is passed in dto', async () => {
    //   const updated = await service.updateMe(1, {
    //     first_name: 'Jane',
    //     last_name: 'Smith',
    //     role: 'super_admin',
    //   });

    //   expect(mockPrismaService.user.update).toHaveBeenCalledWith({
    //     where: { id: 1 },
    //     data: {
    //       first_name: 'Jane',
    //       last_name: 'Smith',
    //       role: {
    //         connect: {
    //           id: 'role-id',
    //         },
    //       },
    //     },
    //   });

    //   expect(updated).toEqual({
    //     id: 1,
    //     first_name: 'Jane',
    //     last_name: 'Smith',
    //     role: {
    //       connect: {
    //         id: 'role-id',
    //       },
    //     },
    //   });
    // });
  });
});

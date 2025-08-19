import { Module } from '@nestjs/common';
import { CompanyUsersController } from './company-users.controller';
import { CompanyUsersService } from './company-users.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CompanyUsersController],
  providers: [CompanyUsersService, PrismaService],
  exports: [CompanyUsersService],
})
export class CompanyUsersModule {}

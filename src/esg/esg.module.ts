import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { CompanyController } from './controllers/company.controller';
import { UsersService } from './services/users.service';
import { CompanyService } from './services/company.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [UsersController, CompanyController],
  providers: [UsersService, CompanyService, PrismaService],
  exports: [UsersService, CompanyService],
})
export class EsgModule {}

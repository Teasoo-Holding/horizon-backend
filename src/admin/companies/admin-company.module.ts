import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminCompanyService } from './admin-company.service';
import { AdminCompanyController } from './admin-company.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCompanyController],
  providers: [AdminCompanyService],
  exports: [AdminCompanyService]
})
export class AdminCompanyModule {}

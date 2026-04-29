import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminRolesPermissionsService } from './roles-permissions.service';
import { AdminRolesPermissionsController } from './roles-permissions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminRolesPermissionsController],
  providers: [AdminRolesPermissionsService],
  exports: [AdminRolesPermissionsService]
})
export class AdminRolesPermissionsModule {}

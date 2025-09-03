import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AdminService } from './admin/admin.service';
import { AdminServiceTsService } from './admin.service.ts/admin.service.ts.service';

@Module({
  controllers: [UserController],
  providers: [UserService, AdminService, AdminServiceTsService],
})
export class UserModule {}

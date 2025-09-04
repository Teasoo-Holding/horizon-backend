import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [UserController, AdminController],
  providers: [UserService, AdminService],
})
export class UserModule {}

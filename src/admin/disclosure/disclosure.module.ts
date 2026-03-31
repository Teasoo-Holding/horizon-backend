import { Module } from '@nestjs/common';
import { DisclosureService } from './disclosure.service';
import { DisclosureController } from './disclosure.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminModule } from '../admin.module';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [DisclosureController],
  providers: [DisclosureService],
  exports: [DisclosureService],
})
export class DisclosureModule {}

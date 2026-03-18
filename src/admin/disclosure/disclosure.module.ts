import { Module } from '@nestjs/common';
import { DisclosureService } from './disclosure.service';
import { DisclosureController } from './disclosure.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DisclosureController],
  providers: [DisclosureService],
  exports: [DisclosureService],
})
export class DisclosureModule {}

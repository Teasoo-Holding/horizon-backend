import { Module } from '@nestjs/common';
import { IndustriesController } from './industries.controller';
import { IndustriesService } from './industries.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [IndustriesController],
  providers: [IndustriesService, PrismaService],
})
export class IndustriesModule {}

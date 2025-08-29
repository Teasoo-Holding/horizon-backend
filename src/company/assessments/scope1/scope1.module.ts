import { Module } from '@nestjs/common';
import { Scope1Controller } from './scope1.controller';
import { Scope1Service } from './scope1.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [Scope1Controller],
  providers: [Scope1Service, PrismaService],
})
export class Scope1Module {}

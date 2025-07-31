import { Module } from '@nestjs/common';
import { EsgAuthController } from './auth/esg-auth.controller';
import { EsgAuthService } from './auth/esg-auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EsgAuthController],
  providers: [EsgAuthService]
})
export class EsgModule {}
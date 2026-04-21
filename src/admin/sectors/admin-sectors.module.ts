import { Module } from '@nestjs/common';
import { AdminSectorsService } from './admin-sectors.service';
import { AdminSectorsController } from './admin-sectors.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminSectorsController],
  providers: [AdminSectorsService],
})
export class AdminSectorsModule {}

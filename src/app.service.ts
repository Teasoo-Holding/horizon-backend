import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello ESG Horizon!';
  }

  async checkDatabaseHealth() {
    // This fires an ultra-light raw query directly to Postgres.
    // It forces an active database lookup without reading/writing table rows.
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }
}

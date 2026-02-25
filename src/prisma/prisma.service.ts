import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 3000;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    for (let attempt = 1; attempt <= PrismaService.MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        return;
      } catch (error) {
        this.logger.warn(
          `Database connection attempt ${attempt}/${PrismaService.MAX_RETRIES} failed: ${error.message}`,
        );
        if (attempt < PrismaService.MAX_RETRIES) {
          await new Promise((r) =>
            setTimeout(r, PrismaService.RETRY_DELAY_MS * attempt),
          );
        }
      }
    }
    this.logger.error(
      'Could not connect to database after all retries. ' +
        'Check DATABASE_URL and that the database server is reachable.',
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn(`Database health check failed: ${error.message}`);
      return false;
    }
  }
}

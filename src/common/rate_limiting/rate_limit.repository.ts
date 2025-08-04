import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RateLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async increment(
    key: string,
    ttlMs: number,
  ): Promise<{ hits: number; resetTime: Date }> {
    await this.prisma.$executeRaw`
      INSERT INTO rate_limit (key, hits, expires_at)
      VALUES (${key}, 1, NOW() + (${ttlMs} * INTERVAL '1 millisecond'))
      ON CONFLICT (key) DO UPDATE
      SET hits = CASE 
        WHEN rate_limit.expires_at < NOW() THEN 1
        ELSE rate_limit.hits + 1
      END,
      expires_at = CASE
        WHEN rate_limit.expires_at < NOW() THEN NOW() + (${ttlMs} * INTERVAL '1 millisecond')
        ELSE rate_limit.expires_at
      END
      RETURNING hits, expires_at as "resetTime"
    `;

    const result = await this.prisma.rate_limit.findUnique({
      where: { key },
      select: { hits: true, expires_at: true },
    });

    return {
      hits: result?.hits || 1,
      resetTime: result?.expires_at || new Date(Date.now() + ttlMs),
    };
  }
}

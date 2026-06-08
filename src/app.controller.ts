import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'System and Database Health Check', 
    description: 'Pings the underlying database to reset the activity timer and verify connectivity.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database connection is healthy.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'UP' },
        timestamp: { type: 'string', example: '2026-06-08T12:00:00.000Z' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Database connection failed or application is unhealthy.' 
  })
  async getHealth() {
    return await this.appService.checkDatabaseHealth();
  }
}

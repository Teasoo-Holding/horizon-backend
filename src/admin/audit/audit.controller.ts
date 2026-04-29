import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin Audit')
@Controller('admin/audit')
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  @ApiOperation({ summary: 'Get all audit logs' })
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get audit trail KPIs' })
  async getKpis() {
    return this.auditService.getKpis();
  }
}

import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiBearerAuth() // Adds Bearer token authentication to all endpoints :cite[2]:cite[3]:cite[6]
@ApiTags('Reports') // Groups endpoints under "Reports" in Swagger UI :cite[2]:cite[6]:cite[9]
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get all assessment reports for organization',
    description: 'Retrieves all assessment reports for the authenticated user\'s company' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved all organization assessment reports' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token' 
  })
  findAll(
    @Req()
    req: {
      user: {
        id: number;
        email: string;
        role: string;
        companyId: number;
        departmentId?: number;
      };
    },
  ) {
    return this.reportService.findOrganizationAssessmentReport(req.user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get specific report by ID',
    description: 'Retrieves a specific assessment report by ID for the authenticated user\'s company' 
  })
  @ApiParam({ 
    name: 'id', 
    type: String, 
    description: 'The ID of the report to retrieve',
    example: '123' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved the report' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Report not found for the given ID and company' 
  })
  findOne(
    @Param('id') id: string,
    @Req()
    req: {
      user: {
        id: number;
        email: string;
        role: string;
        companyId: number;
        departmentId?: number;
      };
    },
  ) {
    return this.reportService.getReport(
      +id,
      req.user.companyId
    );
  }

  @Get('/one/:id')
  @UseGuards(JwtAuthGuard)
  getOneAssessmentReport(
    @Param('id') id: string,
   
  ) {
    return this.reportService.getAssessmentReport(
      +id
    );
  }
}
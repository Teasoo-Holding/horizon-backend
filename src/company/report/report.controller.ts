import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';
import { ReportResponseDto } from './dto/report-response.dto';
import { ALL_ROLES, DATA_WRITE_ROLES } from 'src/auth/roles/role.constants';

@ApiBearerAuth() // Adds Bearer token authentication to all endpoints :cite[2]:cite[3]:cite[6]
@ApiTags('Reports') // Groups endpoints under "Reports" in Swagger UI :cite[2]:cite[6]:cite[9]
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  @Get()
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Get all assessment reports for organization',
    description: 'Retrieves all assessment reports for the authenticated user\'s company, ordered by creation date. Includes basic report metadata and progress information.'
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all organization assessment reports',
    type: [ReportResponseDto],
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
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Get detailed assessment report by ID',
    description: 'Retrieves comprehensive assessment report data including environmental metrics, social capital, human capital, business model data, targets, and emission summaries. Only returns reports for assessments belonging to the authenticated user\'s company.'
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The ID of the assessment report to retrieve',
    example: 123
  })
  @ApiOkResponse({
    description: 'Successfully retrieved detailed report data',
    type: ReportResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token'
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found for the given assessment ID and company'
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
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Get internal report summary',
    description: 'Retrieves internal report structure and calculation data for a specific assessment. Used for debugging and internal analysis.'
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID',
    example: 123
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved internal report object with calculation details',
    schema: {
      type: 'object',
      description: 'Internal assessment data structure with calculated values and progress tracking',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found'
  })
  getOneAssessmentReport(
    @Param('id') id: string,
  ) {
    return this.reportService.getAssessmentReport(
      +id
    );
  }

  @Post('/generate/:id')
  @UseGuards(JwtRolesGuard)
  @Roles(...DATA_WRITE_ROLES)
  @ApiOperation({
    summary: 'Manually generate/refresh report data',
    description: 'Triggers manual recalculation of all report metrics and persists the data to the database. Useful for updating reports after data changes or fixing calculation errors.'
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Assessment ID to generate report for',
    example: 123
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated and saved report data',
    schema: {
      type: 'object',
      description: 'Generated report data with all calculated metrics',
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Assessment belongs to different company',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found',
  })
  generateReport(
    @Param('id') id: string,
  ) {
    return this.reportService.saveReportingData(+id);
  }
}
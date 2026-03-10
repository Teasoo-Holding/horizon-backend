// target.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtRolesGuard } from 'src/auth/guards/jwtroles.guard';
import { RequestWithUser } from 'src/user/user.controller';
import { BaselineOptionDto } from './dto/baseline-options.dto';
import {
  CreateGeneralTargetDto,
  CreateScopeTargetDto,
} from './dto/create-target.dto';
import {
  DeleteResponseDto,
  TargetResponseDto,
} from './dto/target-response.dto';
import {
  UpdateGeneralTargetData,
  UpdateScopeTargetData,
} from './dto/update-target.dto';
import { TargetService } from './target.service';

@ApiTags('Targets')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('target')
@UseGuards(JwtRolesGuard)
export class TargetController {
  constructor(private readonly targetService: TargetService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new target',
    description:
      'Create either a general target or scope-based target for the company',
  })
  @ApiBody({
    description: 'Target creation data',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/CreateGeneralTargetDto' },
        { $ref: '#/components/schemas/CreateScopeTargetDto' },
      ],
    },
    examples: {
      'General Target': {
        value: {
          name: '2030 Net Zero Target',
          type: 'GENERAL',
          description: 'Overall company emissions reduction target',
          baselineYear: 2024,
          targetYear: 2030,
          reductionPercentage: 45.5,
        },
      },
      'Scope Target': {
        value: {
          name: 'Scope-Based 2030 Target',
          type: 'SCOPE',
          description: 'Detailed scope-based reduction targets',
          baselineYear: 2024,
          targetYear: 2030,
          scopes: {
            scope1: { reductionPercentage: 40.0 },
            scope2: { reductionPercentage: 35.0 },
            scope3: { reductionPercentage: 25.0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Target created successfully',
    type: TargetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or target name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async createTarget(
    @Req() req: RequestWithUser,
    @Body() createTargetDto: CreateGeneralTargetDto | CreateScopeTargetDto,
  ) {
    if (!req.user?.companyId || !req.user?.id) {
      throw new BadRequestException('User company ID or user ID is missing');
    }

    return await this.targetService.createTarget(
      req.user.companyId,
      req.user.id,
      createTargetDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all targets for company',
    description:
      "Retrieve all targets belonging to the authenticated user's company",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of company targets',
    type: [TargetResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getCompanyTargets(@Req() req: RequestWithUser) {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }

    return await this.targetService.getCompanyTargets(req.user.companyId);
  }

  @Get('/latest')
  @ApiOperation({
    summary: 'Get the latest targets for company',
    description:
      "Retrieve the latest targets belonging to the authenticated user's company",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The latest target of the company',
    type: [TargetResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getCompanyLatstTargets(@Req() req: RequestWithUser) {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }

    return await this.targetService.getCompanyLatestTarget(req.user.companyId);
  }

  @Get('baseline-options')
  @ApiOperation({
    summary: 'List baseline-eligible assessments',
    description:
      'Return completed assessments that can be used as a baseline when setting targets.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Baseline options retrieved successfully',
    type: [BaselineOptionDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getBaselineOptions(
    @Req() req: RequestWithUser,
  ): Promise<BaselineOptionDto[]> {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }

    return this.targetService.getBaselineOptions(req.user.companyId);
  }

  @Get('latest-pair')
  @ApiOperation({
    summary: 'Get latest General and Scope targets for company',
    description:
      'Returns the most recent GENERAL and SCOPE targets independently, with refreshed emission values.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Latest target pair',
  })
  async getLatestTargetPair(@Req() req: RequestWithUser) {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }
    return this.targetService.getLatestTargetPair(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single target by ID',
    description:
      "Retrieve a specific target by its ID (must belong to user's company)",
  })
  @ApiParam({
    name: 'id',
    description: 'Target ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Target details',
    type: TargetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Target not found or does not belong to company',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getSingleTarget(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }

    return await this.targetService.getSingleTarget(id, req.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a target',
    description: 'Update an existing target (partial updates supported)',
  })
  @ApiParam({
    name: 'id',
    description: 'Target ID',
    type: Number,
    example: 1,
  })
  @ApiBody({
    description: 'Target update data',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/UpdateGeneralTargetData' },
        { $ref: '#/components/schemas/UpdateScopeTargetData' },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Target updated successfully',
    type: TargetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Target not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updateTarget(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTargetDto: UpdateGeneralTargetData | UpdateScopeTargetData,
  ) {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }

    return await this.targetService.updateTarget(
      id,
      req.user.companyId,
      updateTargetDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a target',
    description: 'Delete a target and all its associated data',
  })
  @ApiParam({
    name: 'id',
    description: 'Target ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Target deleted successfully',
    type: DeleteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Target not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async deleteTarget(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (!req.user?.companyId) {
      throw new BadRequestException('User company ID is missing');
    }

    return await this.targetService.deleteTarget(id, req.user.companyId);
  }

  @Get('baseline/:id')
  async getBaselineValue(@Param('id', ParseIntPipe) id: number) {
    const baseline = await this.targetService.getBaselineValue(id);
    return baseline;
  }
  @Get('baseline-scope/:id')
  async getBaselineValueByScope(
    @Param('id', ParseIntPipe) id: number,
    @Query('assessmentId') assessmentId?: string,
  ) {
    const assessmentIdNumber = assessmentId ? Number(assessmentId) : undefined;
    const baseline = await this.targetService.getBaselineValueByScope(
      id,
      assessmentIdNumber,
    );
    return baseline;
  }
}

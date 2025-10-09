import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';

interface JwtUser {
  id: number;
  role: RoleName;
  companyId?: number;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('company/esg/activities')
@UseGuards(JwtRolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles(
    'company_esg_admin',
    'company_esg_subadmin',
    'company_esg_data_officer',
    'company_esg_viewer',
  )
  async getCompanyActivities(@Req() req: RequestWithUser) {
    return this.activitiesService.getActivities(req.user);
  }
}

import {
  Controller,
  Post,
  Patch,
  Param,
  Delete,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaskService } from './tasks.service';
import { AssignTaskDto, ReassignTaskDto } from './dto/task.dto';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { Request } from 'express';

interface CustomRequest extends Request {
  user: {
    id: number;
    userId?: number;
    companyId: number;
    role?: string;
  };
}

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtRolesGuard)
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Post('assign')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Assign a new task to users' })
  assignTask(@Body() dto: AssignTaskDto, @Req() req: CustomRequest) {
    return this.taskService.assignTask(dto, req.user.id);
  }

  @Patch(':id/reassign')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Reassign task to new users' })
  reassignTask(
    @Param('id') id: number,
    @Body() dto: ReassignTaskDto,
    @Req() req: CustomRequest,
  ) {
    return this.taskService.reassignTask(+id, dto, req.user.id);
  }

  @Patch(':id/approve')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Approve a task' })
  approveTask(@Param('id') id: number, @Req() req: CustomRequest) {
    return this.taskService.approveTask(+id, req.user.id);
  }

  @Patch(':id/reject')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Reject a task' })
  rejectTask(@Param('id') id: number, @Req() req: CustomRequest) {
    return this.taskService.rejectTask(+id, req.user.id);
  }

  @Post(':id/reminder')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Send reminder to task assignees' })
  sendReminder(@Param('id') id: number, @Req() req: CustomRequest) {
    return this.taskService.sendReminder(+id, req.user.id);
  }

  @Delete(':id')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a task' })
  deleteTask(@Param('id') id: number, @Req() req: CustomRequest) {
    return this.taskService.deleteTask(+id, req.user.id);
  }

  @Get('all')
  @Roles('super_admin')
  async getAllTasks() {
    return this.taskService.getAllTasks();
  }

  @Get('company')
  @Roles('company_esg_admin')
  async getCompanyTasks(@Req() req: Request & { user: { companyId: number } }) {
    const companyId = req.user.companyId;
    return this.taskService.getCompanyTasks(companyId);
  }

  @Get(':id')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Get details of a single task' })
  getTask(@Param('id') id: number) {
    return this.taskService.getTaskById(+id);
  }
}

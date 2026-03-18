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
import {
  AddTaskCommentDto,
  AssignTaskDto,
  EditTaskDto,
  ReassignTaskDto,
} from './dto/task.dto';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';
import { VALIDATOR_ROLES, ALL_ROLES } from 'src/auth/roles/role.constants';
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
  constructor(private taskService: TaskService) { }

  @Get('my-tasks')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get all tasks assigned to the current user' })
  getMyTasks(@Req() req: CustomRequest) {
    return this.taskService.getUserAssignedTasks(req.user.id);
  }

  @Post(':id/start')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Start a task - creates assessment and links it' })
  startTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.startTask(Number(id), req.user.id);
  }

  @Post('assign')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Assign a new task to users' })
  assignTask(@Body() dto: AssignTaskDto, @Req() req: CustomRequest) {
    return this.taskService.assignTask(dto, req.user.id);
  }

  @Patch(':id/reassign')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Reassign task to new users' })
  reassignTask(
    @Param('id') id: string,
    @Body() dto: ReassignTaskDto,
    @Req() req: CustomRequest,
  ) {
    return this.taskService.reassignTask(Number(id), dto, req.user.id);
  }

  @Patch(':id/approve')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Approve a task' })
  approveTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.approveTask(Number(id), req.user.id);
  }

  @Patch(':id/reject')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Reject a task' })
  rejectTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.rejectTask(Number(id), req.user.id);
  }

  @Post(':id/reminder')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Send reminder to task assignees' })
  sendReminder(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.sendReminder(Number(id), req.user.id);
  }

  @Delete(':id')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Delete a task' })
  deleteTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.deleteTask(Number(id), req.user.id);
  }

  @Get('all')
  @Roles(RoleName.super_admin, RoleName.platform_subadmin)
  @ApiOperation({ summary: 'Get all tasks (platform admin only)' })
  getAllTasks() {
    return this.taskService.getAllTasks();
  }

  @Get('company')
  @Roles(RoleName.company_esg_admin, RoleName.company_esg_subadmin)
  @ApiOperation({
    summary: 'Get all tasks for the company of the logged-in user',
  })
  getCompanyTasks(@Req() req: CustomRequest) {
    return this.taskService.getCompanyTasks(req.user.companyId);
  }

  @Get(':id')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Get details of a single task' })
  getTaskById(@Param('id') id: string) {
    return this.taskService.getTaskById(Number(id));
  }

  @Patch(':id')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Edit an existing task' })
  editTask(
    @Param('id') id: string,
    @Body() dto: EditTaskDto,
    @Req() req: CustomRequest,
  ) {
    return this.taskService.editTask(Number(id), dto, req.user.id);
  }

  @Post(':id/comments')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Add a comment to a task' })
  addComment(@Param('id') id: string, @Body() dto: AddTaskCommentDto) {
    return this.taskService.addComment(Number(id), dto);
  }

  @Get(':id/comments')
  @Roles(...VALIDATOR_ROLES)
  @ApiOperation({ summary: 'Get all comments for a task' })
  getComments(@Param('id') id: string) {
    return this.taskService.getComments(Number(id));
  }
}

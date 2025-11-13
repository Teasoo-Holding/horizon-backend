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
    @Param('id') id: string,
    @Body() dto: ReassignTaskDto,
    @Req() req: CustomRequest,
  ) {
    return this.taskService.reassignTask(Number(id), dto, req.user.id);
  }

  @Patch(':id/approve')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Approve a task' })
  approveTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.approveTask(Number(id), req.user.id);
  }

  @Patch(':id/reject')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Reject a task' })
  rejectTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.rejectTask(Number(id), req.user.id);
  }

  @Post(':id/reminder')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Send reminder to task assignees' })
  sendReminder(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.sendReminder(Number(id), req.user.id);
  }

  @Delete(':id')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a task' })
  deleteTask(@Param('id') id: string, @Req() req: CustomRequest) {
    return this.taskService.deleteTask(Number(id), req.user.id);
  }

  @Get('all')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get all tasks (super admin only)' })
  getAllTasks() {
    return this.taskService.getAllTasks();
  }

  @Get('company')
  @Roles('company_esg_admin')
  @ApiOperation({
    summary: 'Get all tasks for the company of the logged-in user',
  })
  getCompanyTasks(@Req() req: CustomRequest) {
    return this.taskService.getCompanyTasks(req.user.companyId);
  }

  @Get(':id')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Get details of a single task' })
  getTaskById(@Param('id') id: string) {
    return this.taskService.getTaskById(Number(id));
  }

  @Patch(':id')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Edit an existing task' })
  editTask(
    @Param('id') id: string,
    @Body() dto: EditTaskDto,
    @Req() req: CustomRequest,
  ) {
    return this.taskService.editTask(Number(id), dto, req.user.id);
  }

  @Post(':id/comments')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Add a comment to a task' })
  addComment(@Param('id') id: string, @Body() dto: AddTaskCommentDto) {
    return this.taskService.addComment(Number(id), dto);
  }

  @Get(':id/comments')
  @Roles('company_esg_admin', 'super_admin')
  @ApiOperation({ summary: 'Get all comments for a task' })
  getComments(@Param('id') id: string) {
    return this.taskService.getComments(Number(id));
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ActivitiesService } from 'src/activities/activities.service';
import { AssignTaskDto, ReassignTaskDto } from './dto/task.dto';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private activitiesService: ActivitiesService,
  ) {}

  async assignTask(dto: AssignTaskDto, assignedById: number) {
    const { taskName, dueDate, userIds, topics, sendEmail } = dto;

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('At least one user must be assigned');
    }

    const assignedBy = await this.prisma.user.findUnique({
      where: { id: assignedById },
      select: { first_name: true, last_name: true, email: true },
    });
    const assignedByName =
      `${assignedBy?.first_name || ''} ${assignedBy?.last_name || ''}`.trim();
    const assignedByEmail = assignedBy?.email || '';

    const assessmentName = 'ESG Assessment';

    const task = await this.prisma.task.create({
      data: {
        taskName,
        dueDate: new Date(dueDate),
        createdById: assignedById,
        assignments: {
          create: userIds.map((userId) => ({ userId, topics })),
        },
      },
      include: {
        assignments: {
          include: {
            user: {
              include: { company: true },
            },
          },
        },
      },
    });

    await this.activitiesService.logActivity({
      companyId: task.assignments[0]?.user?.companyId ?? undefined,
      createdById: assignedById,
      title: `Assigned task: ${taskName}`,
      description: `Task assigned to ${userIds.length} user(s)`,
      type: 'task',
    });

    if (sendEmail) {
      for (const assignment of task.assignments) {
        const user = assignment.user;
        if (!user?.email) continue;

        const emailParams = {
          CompanyName: user.company?.name || 'Your Company',
          FirstName: user.first_name,
          LastName: user.last_name || '',
          CompanyAdminName: assignedByName,
          CompanyAdminEmailAddress: assignedByEmail,
          TaskName: taskName,
          AssessmentName: assessmentName,
          DueDate: new Date(dueDate).toDateString(),
          TaskLink: `${process.env.FRONTEND_URL}/assessments/tasks`,
        };

        await this.emailService.sendEmail(user.email, emailParams, 10);
      }
    }

    return task;
  }

  async reassignTask(
    taskId: number,
    dto: ReassignTaskDto,
    reassignedById: number,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: { user: { select: { companyId: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskAssignment.deleteMany({ where: { taskId } });
    await this.prisma.taskAssignment.createMany({
      data: dto.userIds.map((userId) => ({
        taskId,
        userId,
        topics: dto.topics || [],
      })),
    });

    await this.activitiesService.logActivity({
      companyId: task.assignments[0]?.user?.companyId ?? undefined,
      createdById: reassignedById,
      title: `Reassigned task: ${task.taskName}`,
      description: `Task reassigned to ${dto.userIds.length} user(s)`,
      type: 'task',
    });

    return { message: 'Task reassigned successfully' };
  }

  async approveTask(taskId: number, approvedById: number) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'approved' },
    });

    await this.activitiesService.logActivity({
      companyId: task.createdById ?? undefined,
      createdById: approvedById,
      title: `Approved task: ${task.taskName}`,
      description: `Task approved`,
      type: 'task',
    });

    return updated;
  }

  async rejectTask(taskId: number, rejectedById: number) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'rejected' },
    });

    await this.activitiesService.logActivity({
      companyId: task.createdById ?? undefined,
      createdById: rejectedById,
      title: `Rejected task: ${task.taskName}`,
      description: `Task rejected`,
      type: 'task',
    });

    return updated;
  }

  async sendReminder(taskId: number, sentById: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: { user: { include: { company: true } } },
        },
        createdBy: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.activitiesService.logActivity({
      companyId: task.assignments[0]?.user?.companyId ?? undefined,
      createdById: sentById,
      title: `Reminder sent for task: ${task.taskName}`,
      description: `Sent reminders to ${task.assignments.length} user(s)`,
      type: 'task',
    });

    for (const assignment of task.assignments) {
      const user = assignment.user;
      if (!user?.email) continue;

      const emailParams = {
        CompanyName: user.company?.name || 'Your Company',
        FirstName: user.first_name,
        LastName: user.last_name || '',
        CompanyAdminName:
          task.createdBy.first_name + ' ' + (task.createdBy.last_name || ''),
        CompanyAdminEmailAddress: task.createdBy.email,
        TaskName: task.taskName,
        AssessmentName: 'ESG Assessment',
        DueDate: task.dueDate.toDateString(),
        TaskLink: `${process.env.FRONTEND_URL}/assessments/tasks`,
      };

      await this.emailService.sendEmail(user.email, emailParams, 10);
    }

    return { message: `Reminders sent to ${task.assignments.length} user(s)` };
  }

  async deleteTask(taskId: number, deletedById: number) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskAssignment.deleteMany({ where: { taskId } });
    await this.prisma.task.delete({ where: { id: taskId } });

    await this.activitiesService.logActivity({
      companyId: task.createdById ?? undefined,
      createdById: deletedById,
      title: `Deleted task: ${task.taskName}`,
      description: `Task deleted`,
      type: 'task',
    });

    return { message: 'Task deleted successfully' };
  }

  async getAllTasks() {
    return this.prisma.task.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company: { select: { id: true, name: true } },
          },
        },
        assignments: true,
      },
    });
  }

  async getCompanyTasks(companyId: number) {
    if (!companyId) throw new Error('Company ID required');

    return this.prisma.task.findMany({
      where: { createdBy: { companyId } },
      include: {
        createdBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company: { select: { id: true, name: true } },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                company: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async getTaskById(taskId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            companyId: true,
            subsidiaryId: true,
            departmentId: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}

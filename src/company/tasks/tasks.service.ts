import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ActivitiesService } from 'src/activities/activities.service';
import {
  AddTaskCommentDto,
  AssignTaskDto,
  EditTaskDto,
  ReassignTaskDto,
} from './dto/task.dto';
import { TaskStatus, AssessmentStatus } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private activitiesService: ActivitiesService,
  ) { }

  async getUserAssignedTasks(userId: number) {
    return this.prisma.taskAssignment.findMany({
      where: { userId },
      select: {
        id: true,
        assessmentId: true,
        startedAt: true,
        topics: true,
        task: {
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
                    email: true,
                    company: { select: { id: true, name: true } },
                  },
                },
                assessment: {
                  select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
        assessment: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            subsidiary: true,
            startMonth: true,
            startYear: true,
            endMonth: true,
            endYear: true,
          },
        },
      },
      orderBy: { task: { createdAt: 'desc' } },
    });
  }

  async startTask(taskId: number, userId: number) {
    // 1. Find the user's assignment for this task
    const assignment = await this.prisma.taskAssignment.findFirst({
      where: { taskId, userId },
      include: {
        user: { include: { company: true } },
        task: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Task assignment not found for this user');
    }

    if (assignment.assessmentId) {
      // Task already started - return existing assessment
      const existingAssessment = await this.prisma.assessment.findUnique({
        where: { id: assignment.assessmentId },
      });
      return {
        taskAssignment: assignment,
        assessment: existingAssessment,
        message: 'Task already started',
      };
    }

    // 2. Create the assessment
    const now = new Date();
    const companyId = assignment.user.companyId;
    if (!companyId) {
      throw new BadRequestException('User must belong to a company to start a task');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        companyId,
        created_by: userId,
        updated_by: userId,
        status: AssessmentStatus.in_progress,
        subsidiary: 'Self',
        startMonth: now.toLocaleString('default', { month: 'long' }),
        startYear: now.getFullYear().toString(),
        endMonth: assignment.task.dueDate.toLocaleString('default', { month: 'long' }),
        endYear: assignment.task.dueDate.getFullYear().toString(),
        assessmentData: { lastSavedForm: null },
      },
    });

    // 3. Link assessment to task assignment
    const updatedAssignment = await this.prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: {
        assessmentId: assessment.id,
        startedAt: now,
      },
      include: {
        assessment: true,
        task: true,
        user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    // 4. Update task status to in_progress
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.in_progress },
    });

    // 5. Log activity
    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: `Started task: ${assignment.task.taskName}`,
      description: `Assessment #${assessment.id} created for task`,
      type: 'task',
    });

    return {
      taskAssignment: updatedAssignment,
      assessment,
      message: 'Task started successfully',
    };
  }

  async assignTask(dto: AssignTaskDto, assignedById: number) {
    const { taskName, dueDate, userIds, topics, sendEmail } = dto;

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('At least one user must be assigned');
    }

    const task = await this.prisma.task.create({
      data: {
        taskName,
        dueDate: new Date(dueDate),
        createdById: assignedById,
        assignments: {
          create: userIds.map((userId) => ({ userId, topics: topics ?? [] })),
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
      await this.sendTaskAssignmentEmails(task.id, assignedById);
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

    if (dto.sendEmail) {
      await this.sendTaskAssignmentEmails(taskId, reassignedById);
    }

    return { message: 'Task reassigned successfully' };
  }

  async approveTask(taskId: number, approvedById: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { createdBy: { select: { companyId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'approved' },
    });

    await this.activitiesService.logActivity({
      companyId: task.createdBy?.companyId ?? undefined,
      createdById: approvedById,
      title: `Approved task: ${task.taskName}`,
      description: `Task approved`,
      type: 'task',
    });

    return updated;
  }

  async rejectTask(taskId: number, rejectedById: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { createdBy: { select: { companyId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.declined },
    });

    await this.activitiesService.logActivity({
      companyId: task.createdBy?.companyId ?? undefined,
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
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { createdBy: { select: { companyId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskComment.deleteMany({ where: { taskId } });
    await this.prisma.taskAssignment.deleteMany({ where: { taskId } });
    await this.prisma.task.delete({ where: { id: taskId } });

    await this.activitiesService.logActivity({
      companyId: task.createdBy?.companyId ?? undefined,
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
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                company: { select: { id: true, name: true } },
              },
            },
            assessment: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
                email: true,
                company: { select: { id: true, name: true } },
              },
            },
            assessment: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
            assessment: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                subsidiary: true,
                startMonth: true,
                startYear: true,
                endMonth: true,
                endYear: true,
              },
            },
          },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async editTask(taskId: number, dto: EditTaskDto, editedById: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: { include: { user: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        taskName: dto.taskName ?? task.taskName,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : task.dueDate,
      },
      include: { assignments: true },
    });

    if (dto.userIds && dto.userIds.length > 0) {
      await this.prisma.taskAssignment.deleteMany({ where: { taskId } });
      await this.prisma.taskAssignment.createMany({
        data: dto.userIds.map((userId) => ({
          taskId,
          userId,
          topics: dto.topics || [],
        })),
      });
    }

    await this.activitiesService.logActivity({
      companyId: task.assignments[0]?.user?.companyId ?? undefined,
      createdById: editedById,
      title: `Edited task: ${updatedTask.taskName}`,
      description: `Task details updated`,
      type: 'task',
    });

    if (dto.sendEmail) {
      await this.sendTaskAssignmentEmails(taskId, editedById);
    }

    return updatedTask;
  }

  private async sendTaskAssignmentEmails(taskId: number, assignedById: number) {
    console.log(`[TaskService] Starting email notification process for task ${taskId}`);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        },
      },
    });

    if (!task) {
      console.warn(`[TaskService] Task ${taskId} not found during email sending`);
      return;
    }

    const assignedBy = await this.prisma.user.findUnique({
      where: { id: assignedById },
      select: { first_name: true, last_name: true, email: true },
    });

    const assignedByName =
      `${assignedBy?.first_name || ''} ${assignedBy?.last_name || ''}`.trim();
    const assignedByEmail = assignedBy?.email || '';
    const assessmentName = 'ESG Assessment';

    console.log(`[TaskService] Found ${task.assignments.length} assignments. Assigner: ${assignedByName} (${assignedByEmail})`);

    for (const assignment of task.assignments) {
      const user = assignment.user;
      if (!user?.email) {
        console.warn(`[TaskService] Skipping user with no email (ID: ${user?.id})`);
        continue;
      }

      const emailParams = {
        firstName: user.first_name,
        firstNameFallback: user.first_name, // Some templates use different keys
        CompanyAdminName: assignedByName,
        AssessmentName: assessmentName,
        TaskName: task.taskName,
        DueDate: task.dueDate.toLocaleDateString(),
        TaskLink: `${process.env.FRONTEND_URL}/assessments/tasks`,
        CompanyAdminEmailAddress: assignedByEmail,
      };

      console.log(`[TaskService] Sending email to ${user.email} using template 18...`);
      const result = await this.emailService.sendEmail(user.email, emailParams, 18);
      console.log(`[TaskService] Email result for ${user.email}:`, result);
    }
  }

  async addComment(taskId: number, dto: AddTaskCommentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const newComment = await this.prisma.taskComment.create({
      data: {
        taskId,
        commenter: dto.commenter,
        comment: dto.comment,
      },
    });

    return newComment;
  }

  async getComments(taskId: number) {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

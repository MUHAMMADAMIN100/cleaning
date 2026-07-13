import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  Role,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const taskInclude = {
  assignee: { select: { id: true, fullName: true } },
  creator: { select: { id: true, fullName: true } },
};

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Руководитель видит все задачи; менеджер — только свои (назначенные ему) */
  list(user: AuthUser) {
    const where: Prisma.TaskWhereInput =
      user.role === Role.DIRECTOR ? {} : { assigneeId: user.id };
    return this.prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    });
  }

  /** Создание задачи руководителем + уведомление менеджеру */
  async create(
    user: AuthUser,
    dto: {
      title: string;
      description?: string;
      assigneeId: string;
      priority?: TaskPriority;
      deadline?: string;
    },
  ) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        creatorId: user.id,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
      include: taskInclude,
    });

    await this.notifications.notify({
      userId: dto.assigneeId,
      type: NotificationType.NEW_TASK,
      title: 'Новая задача от руководителя',
      message: `${task.title}${task.deadline ? ` · до ${task.deadline.toLocaleDateString('ru-RU')}` : ''}`,
      taskId: task.id,
    });

    return task;
  }

  /** Менеджер меняет статус своей задачи; руководитель — любой */
  async updateStatus(user: AuthUser, id: string, status: TaskStatus) {
    const where: Prisma.TaskWhereUniqueInput = { id };
    if (user.role !== Role.DIRECTOR) {
      // менеджер может менять только свою задачу
      const task = await this.prisma.task.findUnique({ where: { id } });
      if (!task || task.assigneeId !== user.id) {
        throw new ForbiddenException('Нет доступа к этой задаче');
      }
    }
    return this.prisma.task.update({
      where,
      data: { status },
      include: taskInclude,
    });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}

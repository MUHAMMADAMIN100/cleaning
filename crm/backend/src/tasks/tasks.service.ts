import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuthUser,
  seesAll,
} from '../common/decorators/current-user.decorator';

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

  /**
   * Директор и ops-менеджер видят все задачи; обычный менеджер — только свои.
   * ops-менеджер видит и задачи, которые он поставил (creatorId), и все
   * (для контроля выполнения) — поэтому seesAll даёт полный список.
   */
  list(user: AuthUser) {
    const where: Prisma.TaskWhereInput = seesAll(user)
      ? {}
      : { assigneeId: user.id };
    return this.prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    });
  }

  /** Постановка задачи (директор или ops-менеджер) + уведомление исполнителю */
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
    if (!seesAll(user)) {
      throw new ForbiddenException('Нет прав ставить задачи');
    }
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

  /** Директор/ops-менеджер меняет статус любой задачи; менеджер — только своей */
  async updateStatus(user: AuthUser, id: string, status: TaskStatus) {
    if (!seesAll(user)) {
      const task = await this.prisma.task.findUnique({ where: { id } });
      if (!task || task.assigneeId !== user.id) {
        throw new ForbiddenException('Нет доступа к этой задаче');
      }
    }
    return this.prisma.task.update({
      where: { id },
      data: { status },
      include: taskInclude,
    });
  }

  /** Удаление задачи (директор или ops-менеджер) */
  async remove(user: AuthUser, id: string) {
    if (!seesAll(user)) {
      throw new ForbiddenException('Нет прав удалять задачи');
    }
    return this.prisma.task.delete({ where: { id } });
  }
}

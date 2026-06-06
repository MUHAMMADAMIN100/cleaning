import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class CleanersService {
  constructor(private prisma: PrismaService) {}

  /** Руководитель видит всех; менеджер — только свою команду */
  list(user: AuthUser) {
    const where =
      user.role === Role.DIRECTOR ? {} : { managerId: user.id };
    return this.prisma.cleaner.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: { manager: { select: { id: true, fullName: true } } },
    });
  }

  create(
    user: AuthUser,
    data: { fullName: string; phone?: string; managerId?: string },
  ) {
    // менеджер создаёт клинера только в своей команде
    const managerId =
      user.role === Role.DIRECTOR ? data.managerId ?? user.id : user.id;
    return this.prisma.cleaner.create({
      data: { fullName: data.fullName, phone: data.phone, managerId },
    });
  }

  update(id: string, data: { fullName?: string; phone?: string; isActive?: boolean }) {
    return this.prisma.cleaner.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.cleaner.delete({ where: { id } });
  }

  /** Задания команды на день: заказы в работе с назначенными клинерами */
  async teamTasksForDay(user: AuthUser, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      stage: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      scheduledDate: { gte: start, lte: end },
    };
    if (user.role !== Role.DIRECTOR) where.managerId = user.id;

    return this.prisma.order.findMany({
      where,
      include: {
        client: { select: { fullName: true, phone: true } },
        cleaners: { select: { id: true, fullName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, ScheduleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  /** События расписания. Менеджер — свои; руководитель — все (или конкретного). */
  list(user: AuthUser, q: { from?: string; to?: string; managerId?: string }) {
    const where: Prisma.ScheduleEventWhereInput = {};
    if (user.role !== Role.DIRECTOR) where.managerId = user.id;
    else if (q.managerId) where.managerId = q.managerId;

    if (q.from || q.to) {
      where.date = {};
      if (q.from) (where.date as any).gte = new Date(q.from);
      if (q.to) (where.date as any).lte = new Date(q.to);
    }
    return this.prisma.scheduleEvent.findMany({
      where,
      orderBy: { date: 'asc' },
      include: { manager: { select: { id: true, fullName: true } } },
    });
  }

  create(
    user: AuthUser,
    dto: {
      title: string;
      type?: ScheduleType;
      date: string;
      note?: string;
      orderId?: string;
      managerId?: string;
    },
  ) {
    const managerId =
      user.role === Role.DIRECTOR ? dto.managerId ?? user.id : user.id;
    return this.prisma.scheduleEvent.create({
      data: {
        title: dto.title,
        type: dto.type ?? ScheduleType.MEETING,
        date: new Date(dto.date),
        note: dto.note,
        orderId: dto.orderId,
        managerId,
      },
    });
  }

  /** Удаление события. Менеджер — только своё; руководитель — любое. */
  async remove(user: AuthUser, id: string) {
    const where: Prisma.ScheduleEventWhereInput = { id };
    if (user.role !== Role.DIRECTOR) where.managerId = user.id;
    const res = await this.prisma.scheduleEvent.deleteMany({ where });
    if (res.count === 0) {
      throw new NotFoundException('Событие не найдено');
    }
    return { ok: true };
  }
}

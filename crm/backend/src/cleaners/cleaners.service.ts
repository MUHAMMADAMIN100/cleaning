import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  seesAll,
} from '../common/decorators/current-user.decorator';

const brigadeInclude = {
  leader: { select: { id: true, fullName: true } },
  cleaners: {
    orderBy: { fullName: 'asc' as const },
    select: {
      id: true,
      fullName: true,
      phone: true,
      rate: true,
      duties: true,
      isActive: true,
      brigadeId: true,
    },
  },
};

@Injectable()
export class CleanersService {
  constructor(private prisma: PrismaService) {}

  /** Все клинеры компании (бригады общие — видят обе роли) */
  list(_user: AuthUser) {
    return this.prisma.cleaner.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        manager: { select: { id: true, fullName: true } },
        brigade: { select: { id: true, name: true } },
      },
    });
  }

  create(
    user: AuthUser,
    data: {
      fullName: string;
      phone?: string;
      rate?: number;
      brigadeId?: string;
      managerId?: string;
    },
  ) {
    if (!data.fullName?.trim()) {
      throw new BadRequestException('Укажите имя клинера');
    }
    const managerId = seesAll(user) ? data.managerId ?? user.id : user.id;
    const rate = Math.round(Number(data.rate));
    return this.prisma.cleaner.create({
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone,
        rate: Number.isFinite(rate) && rate > 0 ? rate : 230,
        brigadeId: data.brigadeId || null,
        managerId,
      },
      include: { brigade: { select: { id: true, name: true } } },
    });
  }

  update(
    id: string,
    data: {
      fullName?: string;
      phone?: string;
      rate?: number;
      brigadeId?: string | null;
      isActive?: boolean;
    },
  ) {
    const patch: any = {};
    if (data.fullName !== undefined) patch.fullName = data.fullName;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.brigadeId !== undefined) patch.brigadeId = data.brigadeId || null;
    if (data.rate !== undefined) {
      const rate = Math.round(Number(data.rate));
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new BadRequestException('Укажите ставку больше нуля');
      }
      patch.rate = rate;
    }
    return this.prisma.cleaner.update({
      where: { id },
      data: patch,
      include: { brigade: { select: { id: true, name: true } } },
    });
  }

  /**
   * Удаление клинера. Если есть история смен/штрафов — не удаляем физически
   * (иначе каскад стёр бы историю и изменил суммы выплат за прошлые месяцы),
   * а отключаем: из списков пропадает, история сохраняется.
   */
  async remove(id: string) {
    const [shifts, fines] = await Promise.all([
      this.prisma.shift.count({ where: { cleanerId: id } }),
      this.prisma.fine.count({ where: { cleanerId: id } }),
    ]);
    if (shifts > 0 || fines > 0) {
      return this.prisma.cleaner.update({
        where: { id },
        data: { isActive: false, brigadeId: null },
      });
    }
    return this.prisma.cleaner.delete({ where: { id } });
  }

  // ─────────────── БРИГАДЫ ───────────────

  listBrigades() {
    return this.prisma.brigade.findMany({
      include: brigadeInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  createBrigade(data: { name: string }) {
    if (!data.name?.trim()) throw new BadRequestException('Укажите название');
    return this.prisma.brigade.create({
      data: { name: data.name.trim() },
      include: brigadeInclude,
    });
  }

  async updateBrigade(
    id: string,
    data: { name?: string; leaderId?: string | null },
  ) {
    const brigade = await this.prisma.brigade.findUnique({ where: { id } });
    if (!brigade) throw new NotFoundException('Бригада не найдена');

    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.leaderId !== undefined && data.leaderId) {
      const leader = await this.prisma.cleaner.findUnique({
        where: { id: data.leaderId },
      });
      if (!leader) throw new NotFoundException('Клинер не найден');
    }
    if (data.leaderId === undefined) {
      return this.prisma.brigade.update({
        where: { id },
        data: patch,
        include: brigadeInclude,
      });
    }
    // атомарно: снимаем лидерство в другой бригаде (leaderId уникален),
    // переводим клинера в эту бригаду и назначаем бригадиром
    patch.leaderId = data.leaderId || null;
    const ops: any[] = [];
    if (data.leaderId) {
      ops.push(
        this.prisma.brigade.updateMany({
          where: { leaderId: data.leaderId, id: { not: id } },
          data: { leaderId: null },
        }),
        this.prisma.cleaner.update({
          where: { id: data.leaderId },
          data: { brigadeId: id },
        }),
      );
    }
    ops.push(
      this.prisma.brigade.update({
        where: { id },
        data: patch,
        include: brigadeInclude,
      }),
    );
    const results = await this.prisma.$transaction(ops);
    return results[results.length - 1];
  }

  async removeBrigade(id: string) {
    const brigade = await this.prisma.brigade.findUnique({ where: { id } });
    if (!brigade) throw new NotFoundException('Бригада не найдена');
    await this.prisma.brigade.delete({ where: { id } }); // клинеры остаются (brigadeId → null)
    return { ok: true };
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
    if (!seesAll(user)) where.managerId = user.id;

    return this.prisma.order.findMany({
      where,
      include: {
        client: { select: { fullName: true, phone: true } },
        cleaners: { select: { id: true, fullName: true } },
        manager: { select: { id: true, fullName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}

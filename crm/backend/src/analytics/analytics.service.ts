import { Injectable } from '@nestjs/common';
import { FunnelStage, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const TYPE_LABEL: Record<string, string> = {
  MAINTENANCE: 'Поддерживающая',
  GENERAL: 'Генеральная',
  POST_RENOVATION: 'После ремонта',
};
const SOURCE_LABEL: Record<string, string> = {
  SITE: 'Сайт',
  INSTAGRAM: 'Instagram',
  CALL: 'Звонок',
  RECOMMENDATION: 'Рекомендация',
};

function priceOf(o: { finalPrice: number | null; estimatedPrice: number }) {
  return o.finalPrice ?? o.estimatedPrice;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private scope(user: AuthUser): Prisma.OrderWhereInput {
    return user.role === Role.DIRECTOR ? {} : { managerId: user.id };
  }

  /** Сводка для дашборда */
  async summary(user: AuthUser) {
    const scope = this.scope(user);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [newLeads, inProgress, doneThisMonth, totalClients] =
      await Promise.all([
        this.prisma.order.count({ where: { ...scope, stage: FunnelStage.NEW } }),
        this.prisma.order.count({
          where: { ...scope, stage: FunnelStage.IN_PROGRESS },
        }),
        this.prisma.order.count({
          where: {
            ...scope,
            stage: FunnelStage.PAID,
            closedAt: { gte: monthStart },
          },
        }),
        this.prisma.client.count({
          where:
            user.role === Role.DIRECTOR ? {} : { managerId: user.id },
        }),
      ]);

    const result: any = { newLeads, inProgress, doneThisMonth, totalClients };

    // финансы — только руководителю
    if (user.role === Role.DIRECTOR) {
      result.revenueMonth = await this.revenueInRange(scope, monthStart, now);
    }
    return result;
  }

  private async revenueInRange(
    scope: Prisma.OrderWhereInput,
    from: Date,
    to: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: { ...scope, stage: FunnelStage.PAID, closedAt: { gte: from, lte: to } },
      select: { finalPrice: true, estimatedPrice: true },
    });
    return orders.reduce((s, o) => s + priceOf(o), 0);
  }

  /** Полная аналитика. Менеджеру — без финансовых данных. */
  async full(user: AuthUser) {
    const scope = this.scope(user);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      1,
    );

    // Заказы по типам уборки
    const byTypeRaw = await this.prisma.order.groupBy({
      by: ['cleaningType'],
      where: scope,
      _count: { _all: true },
    });
    const byType = byTypeRaw.map((r) => ({
      type: r.cleaningType,
      label: TYPE_LABEL[r.cleaningType],
      count: r._count._all,
    }));

    // Источники заявок
    const bySourceRaw = await this.prisma.order.groupBy({
      by: ['source'],
      where: scope,
      _count: { _all: true },
    });
    const sources = bySourceRaw.map((r) => ({
      source: r.source,
      label: SOURCE_LABEL[r.source],
      count: r._count._all,
    }));

    // Конверсия заявок в оплаченные заказы
    const totalOrders = await this.prisma.order.count({ where: scope });
    const paidOrders = await this.prisma.order.count({
      where: { ...scope, stage: FunnelStage.PAID },
    });
    const rejectedOrders = await this.prisma.order.count({
      where: { ...scope, stage: FunnelStage.REJECTED },
    });
    const conversion = {
      total: totalOrders,
      paid: paidOrders,
      rejected: rejectedOrders,
      rate: totalOrders ? Math.round((paidOrders / totalOrders) * 100) : 0,
    };

    const result: any = { byType, sources, conversion };

    if (user.role === Role.DIRECTOR) {
      // Доходы по периодам
      result.revenue = {
        day: await this.revenueInRange(scope, startOfDay, now),
        week: await this.revenueInRange(scope, weekStart, now),
        month: await this.revenueInRange(scope, monthStart, now),
        quarter: await this.revenueInRange(scope, quarterStart, now),
      };

      // Доход по дням за 14 дней (для графика)
      result.revenueSeries = await this.revenueSeries(scope, 14);

      // Загруженность менеджеров (активные заказы)
      result.managerWorkload = await this.managerWorkload();
    }

    return result;
  }

  private async revenueSeries(scope: Prisma.OrderWhereInput, days: number) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { ...scope, stage: FunnelStage.PAID, closedAt: { gte: start } },
      select: { finalPrice: true, estimatedPrice: true, closedAt: true },
    });

    const buckets: { date: string; revenue: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ date: key.slice(5), revenue: 0 });
    }
    for (const o of orders) {
      if (!o.closedAt) continue;
      const key = o.closedAt.toISOString().slice(5, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) b.revenue += priceOf(o);
    }
    return buckets;
  }

  private async managerWorkload() {
    const managers = await this.prisma.user.findMany({
      where: { role: Role.MANAGER },
      select: { id: true, fullName: true },
    });
    const activeStages: FunnelStage[] = [
      FunnelStage.NEW,
      FunnelStage.PROCESSING,
      FunnelStage.INSPECTION,
      FunnelStage.OFFER,
      FunnelStage.CONFIRMED,
      FunnelStage.IN_PROGRESS,
      FunnelStage.DONE,
    ];
    const result: { id: string; name: string; active: number; paid: number }[] = [];
    for (const m of managers) {
      const active = await this.prisma.order.count({
        where: { managerId: m.id, stage: { in: activeStages } },
      });
      const paid = await this.prisma.order.count({
        where: { managerId: m.id, stage: FunnelStage.PAID },
      });
      result.push({ id: m.id, name: m.fullName, active, paid });
    }
    return result;
  }
}

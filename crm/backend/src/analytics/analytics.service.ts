import { Injectable } from '@nestjs/common';
import { FunnelStage, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const TYPE_LABEL: Record<string, string> = {
  MAINTENANCE: 'Поддерживающая (архив)',
  GENERAL: 'Генеральная',
  POST_RENOVATION: 'После ремонта',
  FURNITURE: 'Мягкая мебель',
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

    // Независимые агрегаты — одним пакетом (Promise.all вместо цепочки await)
    const [byTypeRaw, bySourceRaw, totalOrders, paidOrders, rejectedOrders] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ['cleaningType'],
          where: scope,
          _count: { _all: true },
        }),
        this.prisma.order.groupBy({
          by: ['source'],
          where: scope,
          _count: { _all: true },
        }),
        this.prisma.order.count({ where: scope }),
        this.prisma.order.count({ where: { ...scope, stage: FunnelStage.PAID } }),
        this.prisma.order.count({
          where: { ...scope, stage: FunnelStage.REJECTED },
        }),
      ]);
    const byType = byTypeRaw.map((r) => ({
      type: r.cleaningType,
      label: TYPE_LABEL[r.cleaningType],
      count: r._count._all,
    }));
    const sources = bySourceRaw.map((r) => ({
      source: r.source,
      label: SOURCE_LABEL[r.source],
      count: r._count._all,
    }));

    const conversion = {
      total: totalOrders,
      paid: paidOrders,
      rejected: rejectedOrders,
      rate: totalOrders ? Math.round((paidOrders / totalOrders) * 100) : 0,
    };

    const result: any = { byType, sources, conversion };

    if (user.role === Role.DIRECTOR) {
      // Все финансовые агрегаты параллельно
      const [day, week, month, quarter, revenueSeries, managerWorkload] =
        await Promise.all([
          this.revenueInRange(scope, startOfDay, now),
          this.revenueInRange(scope, weekStart, now),
          this.revenueInRange(scope, monthStart, now),
          this.revenueInRange(scope, quarterStart, now),
          this.revenueSeries(scope, 14),
          this.managerWorkload(),
        ]);
      result.revenue = { day, week, month, quarter };
      result.revenueSeries = revenueSeries;
      result.managerWorkload = managerWorkload;
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
    const activeStages: FunnelStage[] = [
      FunnelStage.NEW,
      FunnelStage.PROCESSING,
      FunnelStage.INSPECTION,
      FunnelStage.OFFER,
      FunnelStage.CONFIRMED,
      FunnelStage.IN_PROGRESS,
      FunnelStage.DONE,
    ];
    // 3 запроса вместо 1+2N: список менеджеров + 2 групповых count
    const [managers, activeGroups, paidGroups] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.MANAGER },
        select: { id: true, fullName: true },
      }),
      this.prisma.order.groupBy({
        by: ['managerId'],
        where: { stage: { in: activeStages }, managerId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['managerId'],
        where: { stage: FunnelStage.PAID, managerId: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const activeBy = new Map(
      activeGroups.map((g) => [g.managerId, g._count._all]),
    );
    const paidBy = new Map(paidGroups.map((g) => [g.managerId, g._count._all]));
    return managers.map((m) => ({
      id: m.id,
      name: m.fullName,
      active: activeBy.get(m.id) ?? 0,
      paid: paidBy.get(m.id) ?? 0,
    }));
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientTag,
  FunnelStage,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  AssignCleanersDto,
  ChangeStageDto,
  CreateOrderDto,
  UpdateOrderDto,
} from './dto/order.dto';

/** Порог «крупного заказа» (сомони) — для уведомления руководителю */
const LARGE_ORDER_THRESHOLD = 2000;

const STAGE_LABEL: Record<FunnelStage, string> = {
  NEW: 'Новая заявка',
  PROCESSING: 'Обработка',
  INSPECTION: 'Осмотр объекта',
  OFFER: 'Коммерческое предложение',
  CONFIRMED: 'Подтверждён',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
  PAID: 'Оплачено / Закрыто',
  REJECTED: 'Отказ',
};

const orderInclude = {
  client: { select: { id: true, fullName: true, phone: true } },
  manager: { select: { id: true, fullName: true } },
  cleaners: { select: { id: true, fullName: true } },
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private scopeWhere(user: AuthUser): Prisma.OrderWhereInput {
    return user.role === Role.DIRECTOR ? {} : { managerId: user.id };
  }

  list(
    user: AuthUser,
    q: { stage?: FunnelStage; managerId?: string; search?: string },
  ) {
    const where: Prisma.OrderWhereInput = this.scopeWhere(user);
    if (q.stage) where.stage = q.stage;
    if (user.role === Role.DIRECTOR && q.managerId) where.managerId = q.managerId;
    if (q.search) {
      where.client = {
        OR: [
          { fullName: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search.replace(/\D/g, '') } },
        ],
      };
    }
    return this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Доска воронки: заказы, сгруппированные по этапам */
  async board(user: AuthUser) {
    const orders = await this.list(user, {});
    const stages = Object.keys(STAGE_LABEL) as FunnelStage[];
    return stages.map((stage) => ({
      stage,
      label: STAGE_LABEL[stage],
      orders: orders.filter((o) => o.stage === stage),
    }));
  }

  async getOne(user: AuthUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (user.role !== Role.DIRECTOR && order.managerId !== user.id) {
      throw new NotFoundException('Заказ не найден');
    }
    return order;
  }

  async create(user: AuthUser, dto: CreateOrderDto) {
    const managerId =
      user.role === Role.DIRECTOR ? dto.managerId ?? null : user.id;
    const estimatedPrice = dto.estimatedPrice ?? 0;
    const order = await this.prisma.order.create({
      data: {
        clientId: dto.clientId,
        managerId,
        cleaningType: dto.cleaningType ?? 'GENERAL',
        dirtLevel:
          dto.cleaningType === 'FURNITURE' ? null : dto.dirtLevel ?? null,
        area: dto.area ?? 0,
        seats: dto.seats ?? null,
        address: dto.address,
        estimatedPrice,
        source: dto.source ?? 'CALL',
        comment: dto.comment,
        isLarge: estimatedPrice >= LARGE_ORDER_THRESHOLD,
      },
      include: orderInclude,
    });
    await this.prisma.client.update({
      where: { id: dto.clientId },
      data: { lastContactAt: new Date() },
    });
    return order;
  }

  async update(user: AuthUser, id: string, dto: UpdateOrderDto) {
    await this.getOne(user, id);
    const data: Prisma.OrderUpdateInput = {} as any;
    const assignable: (keyof UpdateOrderDto)[] = [
      'cleaningType',
      'dirtLevel',
      'area',
      'seats',
      'address',
      'estimatedPrice',
      'finalPrice',
      'comment',
      'accessMethod',
      'hasUtilities',
    ];
    for (const key of assignable) {
      if (dto[key] !== undefined) (data as any)[key] = dto[key];
    }
    // у мойки мебели нет степени загрязнения
    if ((data as any).cleaningType === 'FURNITURE') (data as any).dirtLevel = null;
    if (dto.inspectionDate) (data as any).inspectionDate = new Date(dto.inspectionDate);
    if (dto.scheduledDate) (data as any).scheduledDate = new Date(dto.scheduledDate);
    if (dto.managerId && user.role === Role.DIRECTOR)
      (data as any).managerId = dto.managerId;

    // пересчёт «крупности» по актуальной цене
    const price = dto.finalPrice ?? dto.estimatedPrice;
    if (price !== undefined) (data as any).isLarge = price >= LARGE_ORDER_THRESHOLD;

    return this.prisma.order.update({
      where: { id },
      data,
      include: orderInclude,
    });
  }

  /** Перевод по воронке + побочные эффекты */
  async changeStage(user: AuthUser, id: string, dto: ChangeStageDto) {
    const order = await this.getOne(user, id);

    if (dto.stage === FunnelStage.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Укажите причину отказа');
    }

    const data: Prisma.OrderUpdateInput = { stage: dto.stage } as any;
    if (dto.stage === FunnelStage.REJECTED) {
      (data as any).rejectionReason = dto.rejectionReason;
      (data as any).closedAt = new Date();
    }
    if (dto.stage === FunnelStage.PAID) (data as any).closedAt = new Date();
    if (dto.scheduledDate) (data as any).scheduledDate = new Date(dto.scheduledDate);

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: orderInclude,
    });

    // дата последнего контакта клиента
    await this.prisma.client.update({
      where: { id: order.clientId },
      data: { lastContactAt: new Date() },
    });

    // авто-теги клиента
    if (dto.stage === FunnelStage.REJECTED) {
      await this.addClientTag(order.clientId, ClientTag.REFUSED);
    }
    if (dto.stage === FunnelStage.PAID) {
      const paidCount = await this.prisma.order.count({
        where: { clientId: order.clientId, stage: FunnelStage.PAID },
      });
      if (paidCount >= 2) await this.addClientTag(order.clientId, ClientTag.REGULAR);
    }

    // уведомление руководителю о смене статуса крупного заказа
    if (updated.isLarge) {
      await this.notifications.notifyDirectors({
        type: NotificationType.ORDER_STATUS_CHANGED,
        title: 'Статус крупного заказа изменён',
        message: `Заказ ${updated.client.fullName} → «${STAGE_LABEL[dto.stage]}» (${updated.finalPrice ?? updated.estimatedPrice} сомони)`,
        orderId: updated.id,
      });
    }

    return updated;
  }

  async assignCleaners(user: AuthUser, id: string, dto: AssignCleanersDto) {
    await this.getOne(user, id);
    return this.prisma.order.update({
      where: { id },
      data: { cleaners: { set: dto.cleanerIds.map((cid) => ({ id: cid })) } },
      include: orderInclude,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.getOne(user, id); // проверка доступа
    await this.prisma.order.delete({ where: { id } });
    return { ok: true };
  }

  private async addClientTag(clientId: string, tag: ClientTag) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { tags: true },
    });
    if (client && !client.tags.includes(tag)) {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { tags: { set: [...client.tags, tag] } },
      });
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientTag, LeadSource, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

/** Нормализуем телефон до цифр (для дедупликации) */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  /** Список с поиском/фильтром/сортировкой. Менеджер видит только своих. */
  async list(
    user: AuthUser,
    q: {
      search?: string;
      tag?: ClientTag;
      source?: LeadSource;
      managerId?: string;
      sort?: 'recent' | 'name';
    },
  ) {
    const where: Prisma.ClientWhereInput = {};
    if (user.role !== Role.DIRECTOR) where.managerId = user.id;
    else if (q.managerId) where.managerId = q.managerId;

    if (q.tag) where.tags = { has: q.tag };
    if (q.source) where.source = q.source;
    if (q.search) {
      where.OR = [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: normalizePhone(q.search) } },
      ];
    }

    return this.prisma.client.findMany({
      where,
      orderBy:
        q.sort === 'name'
          ? { fullName: 'asc' }
          : { lastContactAt: 'desc' },
      include: {
        manager: { select: { id: true, fullName: true } },
        _count: { select: { orders: true } },
      },
    });
  }

  async getOne(user: AuthUser, id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, fullName: true } },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            cleaners: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!client) throw new NotFoundException('Клиент не найден');
    if (user.role !== Role.DIRECTOR && client.managerId !== user.id) {
      throw new NotFoundException('Клиент не найден');
    }
    return client;
  }

  /**
   * Защита от дублей: ищем клиента по телефону.
   * Если есть — возвращаем существующего, иначе создаём.
   */
  async findOrCreateByPhone(data: {
    fullName: string;
    phone: string;
    email?: string;
    source?: LeadSource;
    managerId?: string;
    tags?: ClientTag[];
    notes?: string;
  }) {
    const phone = normalizePhone(data.phone);
    const existing = await this.prisma.client.findUnique({ where: { phone } });
    if (existing) {
      // обновляем дату последнего контакта
      await this.prisma.client.update({
        where: { id: existing.id },
        data: { lastContactAt: new Date() },
      });
      return { client: existing, created: false };
    }
    const client = await this.prisma.client.create({
      data: {
        fullName: data.fullName,
        phone,
        email: data.email,
        source: data.source ?? LeadSource.SITE,
        managerId: data.managerId,
        tags: data.tags ?? [],
        notes: data.notes,
      },
    });
    return { client, created: true };
  }

  async create(user: AuthUser, dto: CreateClientDto) {
    const managerId =
      user.role === Role.DIRECTOR ? dto.managerId ?? null : user.id;
    const res = await this.findOrCreateByPhone({
      ...dto,
      managerId: managerId ?? undefined,
      source: dto.source ?? LeadSource.CALL,
    });
    return res.client;
  }

  async update(user: AuthUser, id: string, dto: UpdateClientDto) {
    await this.getOne(user, id); // проверка доступа
    const data: Prisma.ClientUpdateInput = { ...dto } as any;
    // переназначать менеджера может только руководитель (mass-assignment)
    if (user.role !== Role.DIRECTOR) delete (data as any).managerId;
    if (dto.phone) (data as any).phone = normalizePhone(dto.phone);
    return this.prisma.client.update({ where: { id }, data });
  }

  async touch(id: string) {
    return this.prisma.client.update({
      where: { id },
      data: { lastContactAt: new Date() },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.getOne(user, id); // проверка доступа
    await this.prisma.client.delete({ where: { id } }); // заказы — каскадно
    return { ok: true };
  }

  /** Экспорт в CSV */
  async exportCsv(user: AuthUser): Promise<string> {
    const where: Prisma.ClientWhereInput =
      user.role === Role.DIRECTOR ? {} : { managerId: user.id };
    const clients = await this.prisma.client.findMany({
      where,
      include: {
        manager: { select: { fullName: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Экранирование поля CSV + защита от формула-инъекции (CWE-1236):
    // ведущие = + - @ (и таб/CR) обезвреживаем апострофом, всё оборачиваем в кавычки.
    const cell = (v: unknown): string => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = [
      'ФИО',
      'Телефон',
      'Источник',
      'Теги',
      'Менеджер',
      'Заказов',
      'Последний контакт',
    ]
      .map(cell)
      .join(';');
    const rows = clients.map((c) =>
      [
        c.fullName,
        c.phone,
        c.source,
        c.tags.join('|'),
        c.manager?.fullName ?? '—',
        c._count.orders,
        c.lastContactAt.toISOString().slice(0, 10),
      ]
        .map(cell)
        .join(';'),
    );
    return [header, ...rows].join('\n');
  }
}

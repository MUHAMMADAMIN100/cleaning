import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FunnelStage, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';

const SAFE_SELECT = {
  id: true,
  login: true,
  fullName: true,
  role: true,
  phone: true,
  isActive: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  findManagers() {
    return this.prisma.user.findMany({
      where: { role: Role.MANAGER },
      select: SAFE_SELECT,
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const login = dto.login.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { login } });
    if (exists) throw new BadRequestException('Логин уже занят');

    const passwordHash = await AuthService.hashPassword(dto.password);
    return this.prisma.user.create({
      data: {
        login,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role ?? Role.MANAGER,
        phone: dto.phone,
      },
      select: SAFE_SELECT,
    });
  }

  /** Карточка сотрудника + статистика. Доступ: руководитель или сам сотрудник. */
  async getOne(requester: AuthUser, id: string) {
    if (requester.role !== Role.DIRECTOR && requester.id !== id) {
      throw new ForbiddenException('Нет доступа к этому профилю');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('Сотрудник не найден');

    const activeStages: FunnelStage[] = [
      FunnelStage.NEW,
      FunnelStage.PROCESSING,
      FunnelStage.INSPECTION,
      FunnelStage.OFFER,
      FunnelStage.CONFIRMED,
      FunnelStage.IN_PROGRESS,
      FunnelStage.DONE,
    ];
    const [clients, ordersActive, ordersPaid, cleaners, tasksOpen] =
      await Promise.all([
        this.prisma.client.count({ where: { managerId: id } }),
        this.prisma.order.count({
          where: { managerId: id, stage: { in: activeStages } },
        }),
        this.prisma.order.count({
          where: { managerId: id, stage: FunnelStage.PAID },
        }),
        this.prisma.cleaner.count({ where: { managerId: id } }),
        this.prisma.task.count({
          where: { assigneeId: id, status: { not: 'DONE' } },
        }),
      ]);

    return {
      ...user,
      stats: { clients, ordersActive, ordersPaid, cleaners, tasksOpen },
    };
  }

  /** Список элементов для боксов профиля (клиенты/заказы/клинеры/задачи). */
  async getList(
    requester: AuthUser,
    id: string,
    type: string,
  ): Promise<{ id: string; primary: string; secondary: string }[]> {
    if (requester.role !== Role.DIRECTOR && requester.id !== id) {
      throw new ForbiddenException('Нет доступа');
    }
    const activeStages: FunnelStage[] = [
      FunnelStage.NEW,
      FunnelStage.PROCESSING,
      FunnelStage.INSPECTION,
      FunnelStage.OFFER,
      FunnelStage.CONFIRMED,
      FunnelStage.IN_PROGRESS,
      FunnelStage.DONE,
    ];

    if (type === 'clients') {
      const rows = await this.prisma.client.findMany({
        where: { managerId: id },
        orderBy: { lastContactAt: 'desc' },
      });
      return rows.map((c) => ({ id: c.id, primary: c.fullName, secondary: c.phone }));
    }
    if (type === 'active' || type === 'paid') {
      const rows = await this.prisma.order.findMany({
        where: {
          managerId: id,
          stage: type === 'paid' ? FunnelStage.PAID : { in: activeStages },
        },
        include: { client: { select: { fullName: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      return rows.map((o) => ({
        id: o.id,
        primary: o.client?.fullName ?? '—',
        secondary: `${o.area} м² · ${o.finalPrice ?? o.estimatedPrice} сомони`,
      }));
    }
    if (type === 'cleaners') {
      const rows = await this.prisma.cleaner.findMany({
        where: { managerId: id },
        orderBy: { fullName: 'asc' },
      });
      return rows.map((c) => ({
        id: c.id,
        primary: c.fullName,
        secondary: c.phone ?? '—',
      }));
    }
    if (type === 'tasks') {
      const rows = await this.prisma.task.findMany({
        where: { assigneeId: id, status: { not: 'DONE' } },
        orderBy: { deadline: 'asc' },
      });
      return rows.map((t) => ({
        id: t.id,
        primary: t.title,
        secondary: t.deadline
          ? `до ${t.deadline.toLocaleDateString('ru-RU')}`
          : 'без срока',
      }));
    }
    return [];
  }

  /** Полное редактирование сотрудника руководителем. */
  async update(
    id: string,
    dto: {
      fullName?: string;
      login?: string;
      phone?: string;
      role?: Role;
      isActive?: boolean;
      password?: string;
    },
  ) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Сотрудник не найден');

    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.login) {
      const login = dto.login.trim().toLowerCase();
      const taken = await this.prisma.user.findUnique({ where: { login } });
      if (taken && taken.id !== id) {
        throw new BadRequestException('Логин уже занят');
      }
      data.login = login;
    }
    if (dto.password && dto.password.length >= 4) {
      data.passwordHash = await AuthService.hashPassword(dto.password);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_SELECT,
    });
  }
}

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

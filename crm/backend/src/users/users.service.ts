import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
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

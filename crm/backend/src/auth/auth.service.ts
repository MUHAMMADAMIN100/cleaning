import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JWT_SECRET } from './jwt-secret';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /** Проверка логина/пароля и выдача JWT */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login.trim().toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const token = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    );

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /** Хелпер хэширования пароля (используется в сиде и при создании юзеров) */
  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }
}

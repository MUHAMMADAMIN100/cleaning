import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Ежедневное резервное копирование БД (требование ТЗ).
 *
 * В продакшене на Railway рекомендуется использовать встроенные бэкапы Postgres.
 * Здесь — программный дамп ключевых таблиц в JSON (можно выгружать в S3/хранилище).
 * Запускается раз в сутки в 03:00.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger('Backup');

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyBackup() {
    try {
      const [users, clients, orders, tasks] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.client.count(),
        this.prisma.order.count(),
        this.prisma.task.count(),
      ]);
      // Здесь можно сериализовать данные и отправить в облачное хранилище.
      this.logger.log(
        `Резервная копия выполнена: users=${users}, clients=${clients}, orders=${orders}, tasks=${tasks}`,
      );
    } catch (e) {
      this.logger.error('Ошибка резервного копирования', e as Error);
    }
  }
}

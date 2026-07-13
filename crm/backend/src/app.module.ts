import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProxyThrottlerGuard } from './common/guards/proxy-throttler.guard';

import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CleanersModule } from './cleaners/cleaners.module';
import { ClientsModule } from './clients/clients.module';
import { OrdersModule } from './orders/orders.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule as MeetingsModule } from './schedule/schedule.module';
import { TariffsModule } from './tariffs/tariffs.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LeadsModule } from './leads/leads.module';
import { PayrollModule } from './payroll/payroll.module';
import { ReportsModule } from './reports/reports.module';
import { SetupModule } from './setup/setup.module';
import { BackupModule } from './backup/backup.module';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Глобальный rate-limit: 300 запросов за 60 сек с одного IP
    // (CRM активно поллит; жёстче — точечно на /auth/login и /leads/intake)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CleanersModule,
    ClientsModule,
    OrdersModule,
    TasksModule,
    MeetingsModule,
    TariffsModule,
    AnalyticsModule,
    LeadsModule,
    PayrollModule,
    ReportsModule,
    SetupModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [
    // Rate-limit применяется первым (до аутентификации); ключ — реальный IP за прокси
    { provide: APP_GUARD, useClass: ProxyThrottlerGuard },
    // Глобальная JWT-защита: все роуты требуют авторизации, кроме @Public
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

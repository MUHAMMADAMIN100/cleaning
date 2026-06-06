import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

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
import { BackupModule } from './backup/backup.module';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    BackupModule,
  ],
  controllers: [AppController],
  providers: [
    // Глобальная JWT-защита: все роуты требуют авторизации, кроме @Public
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

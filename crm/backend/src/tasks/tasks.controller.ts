import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  // создавать/удалять задачи может директор или ops-менеджер (проверка в сервисе)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      title: string;
      description?: string;
      assigneeId: string;
      priority?: TaskPriority;
      deadline?: string;
    },
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.service.updateStatus(user, id, status);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}

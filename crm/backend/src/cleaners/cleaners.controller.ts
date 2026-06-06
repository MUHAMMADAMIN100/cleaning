import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CleanersService } from './cleaners.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('cleaners')
export class CleanersController {
  constructor(private service: CleanersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Get('team-tasks')
  teamTasks(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.service.teamTasksForDay(user, date);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { fullName: string; phone?: string; managerId?: string },
  ) {
    return this.service.create(user, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { fullName?: string; phone?: string; isActive?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

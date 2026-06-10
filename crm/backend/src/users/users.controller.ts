import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  // менеджеров видят оба (для назначения), полный список — только руководитель
  @Get('managers')
  managers() {
    return this.service.findManagers();
  }

  @Roles(Role.DIRECTOR)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.DIRECTOR)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Roles(Role.DIRECTOR)
  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.setActive(id, isActive);
  }

  // Карточка сотрудника / профиль (руководитель — любой, сотрудник — себя)
  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  // Списки для боксов профиля
  @Get(':id/list/:type')
  getList(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('type') type: string,
  ) {
    return this.service.getList(user, id, type);
  }
}

import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CleaningType, Role } from '@prisma/client';
import { TariffsService } from './tariffs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('tariffs')
export class TariffsController {
  constructor(private service: TariffsService) {}

  /** Публично — чтобы лендинг мог тянуть актуальные цены */
  @Public()
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DIRECTOR)
  @Patch('tariff/:key')
  updateTariff(
    @Param('key') key: CleaningType,
    @Body('pricePerSqm') pricePerSqm: number,
  ) {
    return this.service.updateTariff(key, Number(pricePerSqm));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DIRECTOR)
  @Patch('extra/:key')
  updateExtra(@Param('key') key: string, @Body('price') price: number) {
    return this.service.updateExtra(key, Number(price));
  }
}

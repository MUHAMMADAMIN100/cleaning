import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { LeadIntakeDto } from './dto/intake.dto';
import { Public } from '../common/decorators/public.decorator';
import { ApiKeyGuard } from './api-key.guard';

@Controller('leads')
export class LeadsController {
  constructor(private service: LeadsService) {}

  /** Приём заявки с лендинга. Публично + защита API-ключом + rate-limit по IP. */
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('intake')
  intake(@Body() dto: LeadIntakeDto) {
    return this.service.intake(dto);
  }
}

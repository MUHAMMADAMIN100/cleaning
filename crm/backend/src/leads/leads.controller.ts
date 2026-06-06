import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadIntakeDto } from './dto/intake.dto';
import { Public } from '../common/decorators/public.decorator';
import { ApiKeyGuard } from './api-key.guard';

@Controller('leads')
export class LeadsController {
  constructor(private service: LeadsService) {}

  /** Приём заявки с лендинга. Публично + защита API-ключом. */
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('intake')
  intake(@Body() dto: LeadIntakeDto) {
    return this.service.intake(dto);
  }
}

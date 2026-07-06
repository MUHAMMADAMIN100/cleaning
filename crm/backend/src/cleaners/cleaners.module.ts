import { Module } from '@nestjs/common';
import { CleanersService } from './cleaners.service';
import { BrigadesController, CleanersController } from './cleaners.controller';

@Module({
  providers: [CleanersService],
  controllers: [CleanersController, BrigadesController],
})
export class CleanersModule {}

import { Module } from '@nestjs/common';
import { CleanersService } from './cleaners.service';
import { CleanersController } from './cleaners.controller';

@Module({
  providers: [CleanersService],
  controllers: [CleanersController],
})
export class CleanersModule {}

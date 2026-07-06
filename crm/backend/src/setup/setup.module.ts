import { Module } from '@nestjs/common';
import { SetupService } from './setup.service';

@Module({
  providers: [SetupService],
})
export class SetupModule {}

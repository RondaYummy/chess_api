import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { DatabaseModule } from '../database.module';
import { RatingService } from '../rating/rating.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [TelegramService, RatingService],
})
export class TelegramModule { }

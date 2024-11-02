import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { DatabaseModule } from 'src/database.module';
import { RatingService } from 'src/rating/rating.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [TelegramService, RatingService],
})
export class TelegramModule { }

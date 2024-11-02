import { Module } from '@nestjs/common';
import { ChessController } from './chess.controller';
import { ChessService } from './chess.service';
import { DatabaseModule } from '../database.module';
import { RatingService } from '../rating/rating.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChessController],
  providers: [ChessService, RatingService],
})
export class ChessModule { }

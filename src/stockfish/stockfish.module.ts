import { Module } from '@nestjs/common';
import { StockfishService } from './stockfish.service';

@Module({
  providers: [StockfishService],
  controllers: [],
  exports: [StockfishService]
})
export class StockfishModule { }

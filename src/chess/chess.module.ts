import { Module } from '@nestjs/common';
import { ChessController } from './chess.controller';
import { ChessService } from './chess.service';
import { DatabaseModule } from 'src/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ChessController],
  providers: [ChessService],
})
export class ChessModule { }

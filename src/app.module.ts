import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChessModule } from './chess/chess.module';
import { DatabaseModule } from './database.module';
import { GameGateway } from './game.gateway';
import { ChessService } from './chess/chess.service';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggingService } from './logging.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './telegram/telegram.module';
import { StockfishModule } from './stockfish/stockfish.module';

@Module({
  imports: [ChessModule, DatabaseModule, ScheduleModule.forRoot(), ConfigModule.forRoot({
    isGlobal: true,
  }), TelegramModule, StockfishModule],
  controllers: [AppController, AuthController],
  providers: [AppService, GameGateway, ChessService, LoggingService],
})
export class AppModule { }

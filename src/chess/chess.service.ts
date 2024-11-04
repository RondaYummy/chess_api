import { Injectable, Inject } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DatabaseSchema } from '../database.schema';
import { Chess } from 'chess.js';
import { RatingService } from '../rating/rating.service';
import { nanoid } from '../utils/nanoid';

@Injectable()
export class ChessService {
  constructor(@Inject('DB_CONNECTION') private db: Kysely<DatabaseSchema>, private ratingService: RatingService) { }

  async createGame(playerWhite: string, playerBlack: string, time: number, gameType: string, playWithBot: boolean = false): Promise<string> {
    try {
      const gameId = await nanoid();
      const chess = new Chess();
      const initialFen = chess.fen();
      const initialTime = time || 300000; // 10 min

      const data = {
        id: gameId,
        playerWhite,
        playerBlack,
        timeWhite: initialTime,
        timeBlack: initialTime,
        startTime: new Date(),
        type: gameType,
        turn: 'white',
        isBotGame: playWithBot,
        boardState: initialFen,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db
        .insertInto('chess_games')
        .values(data)
        .execute();

      return gameId;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  async getGameById(gameId: string) {
    const game = await this.db
      .selectFrom('chess_games')
      .selectAll()
      .where('id', '=', gameId)
      .executeTakeFirst();

    return game; // Повертає гру або null, якщо не знайдено
  }

  async getGameByPlayerId(userId: string) {
    const game = await this.db
      .selectFrom('chess_games')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('playerWhite', '=', userId),
          eb('playerBlack', '=', userId)
        ])
      )
      .where('winner', 'is', null) // Умова, що гра не завершена
      .where('gameEndReason', 'is', null) // Умова, що гра не завершена
      .executeTakeFirst();

    return game; // Повертає гру або null, якщо не знайдено
  }

  async getGameMovesByGameId(gameId: string) {
    const moves = await this.db
      .selectFrom('chess_moves')
      .selectAll()
      .where('gameId', '=', gameId)
      .execute();

    return moves; // Повертає moves або null, якщо не знайдено
  }

  async getGamePlayers(whiteUserId: string, blackUserId: string) {
    const white = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', whiteUserId)
      .executeTakeFirst();
    const black = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', whiteUserId)
      .executeTakeFirst();

    return { white, black };
  }

  getInitialBoard(fen?: string): any {
    const chess = new Chess(fen);
    return chess.board();
  }

  async getActivePlayerGame(playerId: string) {
    return this.getGameByPlayerId(playerId);
  }

  async timeLeftGame(game: { id: string; playerWhite: string; playerBlack: string; isBotGame: boolean; }, winner: string) {
    try {
      const gameEndReason = 'time-out';
      await this.db
        .updateTable('chess_games')
        .set({
          winner: winner,
          gameEndReason: gameEndReason,
          updatedAt: new Date(),
        })
        .where('id', '=', game.id)
        .execute();
      console.log(`Час вийшов. Переможець: ${winner}, причина завершення: ${gameEndReason}`);
      if (gameEndReason && winner && !game.isBotGame) {
        await this.ratingService.handleGameEnd({
          ...game,
          gameEndReason,
          winner,
        });
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async leftFromGame(game: { id: string; playerWhite: string; playerBlack: string; isBotGame: boolean; }, userId: string) {
    try {
      const isWhitePlayer = game.playerWhite === userId;
      const isBlackPlayer = game.playerBlack === userId;

      if (!isWhitePlayer && !isBlackPlayer) {
        console.log(`User ${userId} не є учасником цієї гри (${game.id}).`);
        return;
      }

      const winner = isWhitePlayer ? 'black' : 'white';
      const gameEndReason = 'resignation';

      await this.db
        .updateTable('chess_games')
        .set({
          winner: winner,
          gameEndReason: gameEndReason,
          updatedAt: new Date(),
        })
        .where('id', '=', game.id)
        .execute();

      console.log(`Гравець ${userId} покинув гру. Переможець: ${winner}, причина завершення: ${gameEndReason}`);

      if (gameEndReason && winner && !game.isBotGame) {
        await this.ratingService.handleGameEnd({
          ...game,
          gameEndReason,
          winner,
        });
      }

      const updatedGame = await this.db
        .selectFrom('chess_games')
        .selectAll()
        .where('id', '=', game.id)
        .executeTakeFirst();

      return updatedGame;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async savePlayerTime(gameId: string, updatedTimeField: "timeWhite" | "timeBlack", remainingTime: number, currentPlayer: string, now: Date) {
    await this.db
      .updateTable('chess_games')
      .set({
        [updatedTimeField]: remainingTime,
        turn: currentPlayer === 'white' ? 'black' : 'white',
        startTime: now,
      })
      .where('id', '=', gameId)
      .execute();
  }

  async handleMove(data: { from?: string; to?: string; userId?: string; gameId?: string; promotion?: string; }, game) {
    const chess = new Chess(game.boardState);

    let moveResult;
    if (data.to === 'O-O' || data.to === 'O-O-O') {
      console.log('Castling move detected!');
      moveResult = chess.move(data.to);
    } else {
      moveResult = chess.move({ from: data.from, to: data.to, promotion: data.promotion });
    }

    let gameEndReason: string | null = null;
    let winner: string | null = null;
    let isCheck: boolean = false;

    if (chess.isCheckmate()) {
      // Мат - гра завершується, переможець той, чий хід виконав мат
      console.log("Checkmate!");
      gameEndReason = 'checkmate';
      winner = game.turn === 'white' ? 'white' : 'black';
    } else if (chess.isStalemate()) {
      // Пат - гра завершується нічиєю
      console.log("Stalemate!");
      gameEndReason = 'stalemate';
      winner = 'draw';
    } else if (chess.isDraw()) {
      // Інші умови нічиєї (триразове повторення, 50-ходове правило і т.д.)
      console.log("Draw!");
      gameEndReason = 'draw';
      winner = 'draw';
    } else if (chess.isCheck()) {
      // Шах - гра не завершується, але варто відмітити шах
      console.log("Check!");
      isCheck = true;
    } else {
      console.log("Move successful:", moveResult);
    }

    if (gameEndReason && winner && !game.isBotGame) {
      await this.ratingService.handleGameEnd({
        ...game,
        gameEndReason,
        winner,
      });
    }

    await this.db
      .insertInto('chess_moves')
      .values({
        id: await nanoid(),
        gameId: data.gameId,
        move: `${data.from}-${data.to}`,
        fen: chess.fen(),
        playerId: data.userId,
      })
      .execute();

    await this.db
      .updateTable('chess_games')
      .set({
        boardState: chess.fen(), // Зберігаємо новий FEN
        updatedAt: new Date(),
        ...(gameEndReason && { gameEndReason }), // Додаємо причину завершення, якщо гра завершилась
        ...(winner && { winner }), // Додаємо переможця, якщо гра завершилась
      })
      .where('id', '=', data.gameId)
      .execute();

    return {
      success: true,
      playerId: data.userId,
      gameEndReason,
      winner,
      isCheck,
      move: {
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        color: moveResult.color,
        san: moveResult.san,
        boardState: chess.fen(), // Повертаємо стан дошки у форматі FEN
      },
    };
  }
}

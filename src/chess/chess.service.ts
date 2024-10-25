import { Injectable, Inject } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DatabaseSchema } from 'src/database.schema';
import { generateUniqueId, isValidFEN } from 'src/utils/ids';
import { Chess, Square } from 'chess.js';

@Injectable()
export class ChessService {
  constructor(@Inject('DB_CONNECTION') private db: Kysely<DatabaseSchema>) { }

  async createGame(playerWhite: string, playerBlack: string): Promise<string> {
    try {
      const gameId = generateUniqueId();
      const chess = new Chess();
      const initialFen = chess.fen();

      const data = {
        id: gameId,
        playerWhite,
        playerBlack,
        moves: [],
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

  async getGameMovesByGameId(gameId: string) {
    const moves = await this.db
      .selectFrom('chess_moves')
      .selectAll()
      .where('gameId', '=', gameId)
      .execute();

    return moves; // Повертає moves або null, якщо не знайдено
  }

  getInitialBoard(fen?: string): any {
    // Отримуємо стан дошки з chess.js
    const chess = new Chess(fen);
    return chess.board();
  }

  async handleMove(data: { from?: string; to?: string; userId?: string; gameId?: string; promotion?: string; }) {
    const game = await this.getGameById(data.gameId);
    if (!game) {
      throw new Error('Game not found'); // Краще кинути помилку?
    }
    if (!isValidFEN(game.boardState)) {
      throw new Error('Bad FEN'); // Краще кинути помилку?
    }

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

    await this.db
      .insertInto('chess_moves')
      .values({
        id: generateUniqueId(),
        gameId: data.gameId,
        move: `${data.from}-${data.to}`,
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

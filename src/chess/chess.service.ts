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

    if (chess.isCheckmate()) {
      // isCheckmate() МАТ
      console.log("Checkmate!");
    } else if (chess.isCheck()) {
      // isCheck() ШАХ
      console.log("Check!");
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
      })
      .where('id', '=', data.gameId)
      .execute();

    return {
      success: true,
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

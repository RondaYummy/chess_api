import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Kysely } from 'kysely';
import { DatabaseSchema } from '../database.schema';

@Injectable()
export class RatingService {
  public static readonly INITIAL_RATING = 1500;
  private static readonly INITIAL_RD = 350;
  private static readonly Q = Math.log(10) / 400;

  constructor(@Inject('DB_CONNECTION') private db: Kysely<DatabaseSchema>) {

  }

  initial() {
    return {
      rating: RatingService.INITIAL_RATING,
      RD: RatingService.INITIAL_RD,
    };
  }

  calculateNewRating(
    playerRating: number,
    playerRD: number,
    opponentRating: number,
    opponentRD: number,
    result: number // 1 - перемога, 0 - поразка, 0.5 - нічия
  ) {
    if (![0, 0.5, 1].includes(result)) {
      throw new Error("Result must be 0, 0.5, or 1.");
    }

    // Конвертую RD у scale Glicko
    const gOpponent = 1 / Math.sqrt(1 + (3 * RatingService.Q ** 2 * opponentRD ** 2) / Math.PI ** 2);
    const E = 1 / (1 + Math.exp(-gOpponent * (playerRating - opponentRating) * RatingService.Q));
    const d2 = 1 / (RatingService.Q ** 2 * gOpponent ** 2 * E * (1 - E));
    const newPlayerRating = playerRating + (RatingService.Q / (1 / playerRD ** 2 + 1 / d2)) * gOpponent * (result - E);
    const newPlayerRD = Math.sqrt(1 / (1 / playerRD ** 2 + 1 / d2));

    return { newRating: newPlayerRating, newRD: newPlayerRD };
  }

  /**
   * Оновлює рейтинг та RD для гравця після матчу.
   */
  async updatePlayerRating(playerId: string, opponentId: string, result: number) {
    try {
      const player = await this.db.selectFrom('users').selectAll().where('id', '=', playerId).executeTakeFirst();
      const opponent = await this.db.selectFrom('users').selectAll().where('id', '=', opponentId).executeTakeFirst();

      const playerRating = Number(player?.rating) ?? RatingService.INITIAL_RATING;
      const playerRD = Number(player?.rd) ?? RatingService.INITIAL_RD;
      const opponentRating = Number(opponent?.rating) ?? RatingService.INITIAL_RATING;
      const opponentRD = Number(opponent?.rd) ?? RatingService.INITIAL_RD;

      if (isNaN(playerRating) || isNaN(playerRD) || isNaN(opponentRating) || isNaN(opponentRD) || isNaN(result)) {
        throw new Error(`Неприпустиме значення: ${JSON.stringify({ playerRating, playerRD, opponentRating, opponentRD, result })}`);
      }

      const { newRating, newRD } = this.calculateNewRating(+playerRating, +playerRD, +opponentRating, +opponentRD, result);
      const roundedRating = Math.round(newRating);
      const roundedRD = Math.round(newRD);
      console.log(`Новий рейтинг для користувача ${playerId} - ${roundedRating} a RD ${roundedRD}`);

      await this.db
        .updateTable('users')
        .set({
          rating: roundedRating,
          rd: roundedRD,
          lastGameDate: new Date(),
        })
        .where('id', '=', playerId)
        .execute();

      return { newRating, newRD };
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  async handleGameEnd(game) {
    if (!game.winner) return;

    const player1Id = game.playerWhite;
    const player2Id = game.playerBlack;

    let result;
    if (game.winner === 'white') {
      result = 1;
    } else if (game.winner === 'black') {
      result = 0;
    } else {
      result = 0.5; // нічия
    }

    // We update the rating for both players
    await Promise.allSettled([
      this.updatePlayerRating(player1Id, player2Id, result),
      this.updatePlayerRating(player2Id, player1Id, 1 - result)
    ]);
  }


  @Cron('0 2 * * *')
  async increaseRDForInactivePlayers() {
    console.log('❗️Automatic RD increase for inactive players has been launched❗️');
    const now = new Date();
    const threshold = new Date(now.setMonth(now.getMonth() - 1)); // 1 month of inactivity

    const inactivePlayers = await this.db
      .selectFrom('users')
      .selectAll()
      .where('lastGameDate', '<', threshold)
      .execute();

    for (const player of inactivePlayers) {
      const increasedRD = Math.min(player.rd + 10, RatingService.INITIAL_RD); // RD limit
      await this.db
        .updateTable('users')
        .set({ rd: increasedRD })
        .where('id', '=', player.id)
        .execute();
    }
  }
}

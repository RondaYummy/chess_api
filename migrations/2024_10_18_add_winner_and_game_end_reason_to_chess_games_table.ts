import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .addColumn('winner', 'varchar') // Поле для переможця
    .addColumn('gameEndReason', 'varchar') // Поле для причини завершення гри
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .dropColumn('winner')
    .dropColumn('gameEndReason')
    .execute();
};

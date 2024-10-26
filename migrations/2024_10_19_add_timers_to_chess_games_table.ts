import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .addColumn('timeWhite', 'bigint') // Залишковий час для білих у мілісекундах
    .addColumn('timeBlack', 'bigint') // Залишковий час для чорних у мілісекундах
    .addColumn('startTime', 'timestamp') // Час початку поточного ходу
    .addColumn('turn', 'varchar') // Час початку поточного ходу
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .dropColumn('timeWhite')
    .dropColumn('timeBlack')
    .dropColumn('startTime')
    .dropColumn('turn')
    .execute();
};

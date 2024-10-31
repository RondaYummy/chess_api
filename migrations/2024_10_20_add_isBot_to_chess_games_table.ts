import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .addColumn('isBotGame', 'boolean')
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .dropColumn('isBotGame')
    .execute();
};

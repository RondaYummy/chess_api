import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .addColumn('type', 'varchar')
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_games')
    .dropColumn('type')
    .execute();
};

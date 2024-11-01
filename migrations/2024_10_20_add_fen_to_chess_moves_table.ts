import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_moves')
    .addColumn('fen', 'varchar')
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('chess_moves')
    .dropColumn('fen')
    .execute();
};

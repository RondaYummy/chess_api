import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('users')
    .addColumn('rating', 'integer')
    .addColumn('rd', 'integer')
    .addColumn('lastGameDate', 'timestamp')
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('users')
    .dropColumn('rating')
    .dropColumn('rd')
    .dropColumn('lastGameDate')
    .execute();
};

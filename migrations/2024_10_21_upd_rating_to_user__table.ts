import { Kysely } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('users')
    .alterColumn('rating', (col) => col.setDataType('numeric'))
    .alterColumn('rd', (col) => col.setDataType('numeric'))
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('users')
    .alterColumn('rating', (col) => col.setDataType('integer'))
    .alterColumn('rd', (col) => col.setDataType('integer'))
    .execute();
};

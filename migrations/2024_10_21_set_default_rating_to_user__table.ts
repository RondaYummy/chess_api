import { Kysely, sql } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await sql`ALTER TABLE users ALTER COLUMN rating SET DEFAULT 1500`.execute(db);
  await sql`ALTER TABLE users ALTER COLUMN rd SET DEFAULT 350`.execute(db);

  await db
    .updateTable('users')
    .set({
      rating: sql`COALESCE(rating, 1500)`,
      rd: sql`COALESCE(rd, 350)`,
    })
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await sql`ALTER TABLE users ALTER COLUMN rating DROP DEFAULT`.execute(db);
  await sql`ALTER TABLE users ALTER COLUMN rd DROP DEFAULT`.execute(db);
};

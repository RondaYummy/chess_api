import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Крок 1: Очистити всі записи з таблиць chess_moves та chess_games
  await db.deleteFrom('chess_moves').execute();
  await db.deleteFrom('chess_games').execute();

  // Крок 2: Видалити зовнішні ключі в таблиці chess_moves
  await sql`
    ALTER TABLE "chess_moves" DROP CONSTRAINT IF EXISTS "chess_moves_gameid_fkey";
  `.execute(db);

  await sql`
    ALTER TABLE "chess_moves" DROP CONSTRAINT IF EXISTS "chess_moves_playerid_fkey";
  `.execute(db);

  // Крок 3: Видалити колонки id та gameId з таблиць
  await db.schema
    .alterTable('chess_moves')
    .dropColumn('id')
    .dropColumn('gameId')
    .execute();

  await db.schema
    .alterTable('chess_games')
    .dropColumn('id')
    .execute();

  // Крок 4: Створити нові колонки id з типом varchar(36)
  await db.schema
    .alterTable('chess_games')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().notNull()
    )
    .execute();

  await db.schema
    .alterTable('chess_moves')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().notNull()
    )
    .addColumn('gameId', 'varchar(36)', (col) =>
      col.notNull()
    )
    .execute();

  // Крок 5: Відновити зовнішні ключі
  await sql`
    ALTER TABLE "chess_moves"
    ADD CONSTRAINT "chess_moves_gameid_fkey"
    FOREIGN KEY ("gameId") REFERENCES "chess_games"("id") ON DELETE CASCADE;
  `.execute(db);

  await sql`
    ALTER TABLE "chess_moves"
    ADD CONSTRAINT "chess_moves_playerid_fkey"
    FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> { }

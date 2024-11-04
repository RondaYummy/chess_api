import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Очистити всі записи з таблиць users
  await db.deleteFrom('users').execute();

  // Видалити зовнішній ключ між chess_moves та users
  await sql`
    ALTER TABLE "chess_moves" DROP CONSTRAINT IF EXISTS "chess_moves_playerid_fkey";
  `.execute(db);

  // Змінити тип колонки id у таблиці users
  await sql`
    ALTER TABLE "users"
    ALTER COLUMN "id" TYPE varchar(36);
  `.execute(db);

  // Змінити тип колонки playerId у таблиці chess_moves
  await sql`
    ALTER TABLE "chess_moves"
    ALTER COLUMN "playerId" TYPE varchar(36);
  `.execute(db);

  // Відновити зовнішній ключ між chess_moves та users
  await sql`
    ALTER TABLE "chess_moves"
    ADD CONSTRAINT "chess_moves_playerid_fkey"
    FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> { }

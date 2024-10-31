import { Kysely, sql } from 'kysely';
import { DatabaseSchema } from '../database.schema';

export async function up(db: Kysely<DatabaseSchema>) {
  await db.schema
    .createTable('chess_moves')
    .addColumn('id', 'uuid', col => col.primaryKey()) // Зміна типу на 'uuid' та первинний ключ
    .addColumn('gameId', 'uuid', col => col.notNull()) // ID гри, пов'язаної з ходом
    .addColumn('move', 'text', col => col.notNull()) // Хід
    .addColumn('playerId', 'uuid', col => col.notNull()) // ID гравця, який зробив хід
    .addColumn('createdAt', 'timestamp', col => col.defaultTo(sql`now()`).notNull()) // Час створення
    .execute();
}

export async function down(db: Kysely<DatabaseSchema>) {
  await db.schema
    .dropTable('chess_moves')
    .execute();
}

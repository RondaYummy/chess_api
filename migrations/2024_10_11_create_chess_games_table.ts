import { Kysely, sql } from 'kysely';

export const up = async (db: Kysely<any>) => {
  await db.schema
    .createTable('chess_games')
    .addColumn('id', 'uuid', col => col.notNull().primaryKey())
    .addColumn('playerWhite', 'varchar', col => col.notNull())
    .addColumn('playerBlack', 'varchar', col => col.notNull())
    .addColumn('boardState', 'text', col => col.notNull().defaultTo('')) // Додаємо новий стовпець
    .addColumn('moves', 'jsonb', col => col.notNull().defaultTo(sql`'[]'::jsonb`)) // Зберігання масиву ходів у форматі JSONB
    .addColumn('createdAt', 'timestamp', col => col.defaultTo(sql`now()`).notNull()) // Час створення
    .addColumn('updatedAt', 'timestamp', col => col.defaultTo(sql`now()`).notNull()) // Час оновлення
    .execute();
};

export const down = async (db: Kysely<any>) => {
  await db.schema.dropTable('chess_games').execute();
};

import { Kysely, sql } from 'kysely';
import { DatabaseSchema } from 'src/database.schema';

export async function up(db: Kysely<DatabaseSchema>) {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', col => col.primaryKey()) // Зміна типу на 'uuid' та первинний ключ
    .addColumn('telegramId', 'integer', col => col.defaultTo(null)) // ID користувача в Telegram
    .addColumn('username', 'text', col => col.defaultTo(null)) // Ім'я користувача, може бути null
    .addColumn('login', 'text', col => col.defaultTo(null))
    .addColumn('password', 'text', col => col.defaultTo(null))
    .addColumn('firstName', 'text', col => col.defaultTo(null)) // Ім'я, може бути null
    .addColumn('lastName', 'text', col => col.defaultTo(null)) // Прізвище, може бути null
    .addColumn('languageCode', 'text', col => col.defaultTo(null)) // Код мови, може бути null
    .addColumn('profilePicture', 'text', col => col.defaultTo(null)) // URL профільного зображення, може бути null
    .addColumn('createdAt', 'timestamp', col => col.notNull().defaultTo(sql`now()`)) // Дата створення
    .addColumn('updatedAt', 'timestamp', col => col.notNull().defaultTo(sql`now()`)) // Дата оновлення
    .execute();
}

export async function down(db: Kysely<DatabaseSchema>) {
  await db.schema
    .dropTable('users') // Вилучаємо таблицю у разі скасування
    .execute();
}

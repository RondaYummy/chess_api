import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

const db = new Kysely({
  dialect: new PostgresDialect({
    pool,
  }),
});

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.resolve(__dirname, 'migrations'),
  }),
  allowUnorderedMigrations: true,
});

export default {
  database: db,
  migrator,
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    tableName: 'migrations',
  },
};

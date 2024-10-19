import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'chess_db',
  user: 'postgres',
  password: '121314Qq',
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

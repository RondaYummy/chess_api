import { Module } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DatabaseSchema } from './database.schema';

@Module({
  providers: [
    {
      provide: 'DB_CONNECTION',
      useFactory: async () => {
        const pool = new Pool({
          host: 'localhost',
          port: 5432,
          database: 'chess_db',
          user: 'postgres',
          password: '121314Qq',
        });

        // Test connection
        try {
          await pool.connect();
          console.log('Connected to the database');
        } catch (error) {
          console.error('Database connection error:', error);
          throw error;
        }

        return new Kysely<DatabaseSchema>({
          dialect: new PostgresDialect({
            pool,
          }),
        });
      },
    },
  ],
  exports: ['DB_CONNECTION'],
})
export class DatabaseModule { }

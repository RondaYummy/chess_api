import { Module } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DatabaseSchema } from './database.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DB_CONNECTION',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          host: configService.get<string>('DATABASE_HOST'),
          user: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          port: configService.get<number>('DATABASE_PORT'),
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

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, Bot, Context, RawApi } from 'grammy';
import { Kysely } from 'kysely';
import { DatabaseSchema } from 'src/database.schema';
import { RatingService } from '../rating/rating.service';
import { generateUniqueId } from 'src/utils/ids';

@Injectable()
export class TelegramService {
  readonly bot: Bot<Context, Api<RawApi>>;

  constructor(private configService: ConfigService, @Inject('DB_CONNECTION') private db: Kysely<DatabaseSchema>, private ratingService: RatingService) {
    try {
      this.bot = new Bot<Context>(this.configService.get<string>('TELEGRAM_BOT_TOKEN'));

      // FIRST COMMAND "/START"
      this.bot.command('start', async (msg) => {
        msg.api.deleteMessage(msg.chatId, msg.update.message.message_id);
        const { from } = msg.update.message;

        let user = await this.db
          .selectFrom('users')
          .selectAll()
          .where('telegramId', '=', from.id)
          .executeTakeFirst();
        if (!user) {
          const initialRating = this.ratingService.initial();
          user = await this.db.insertInto('users').values({
            id: generateUniqueId(),
            createdAt: new Date(),
            telegramId: from.id,
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            languageCode: from.language_code,
            rating: initialRating.rating,
            rd: initialRating.RD,
            lastGameDate: new Date(),
          })
            .returningAll()
            .executeTakeFirst();
        }

        this.bot.api.sendMessage(msg.chatId, '♟️ Chess | Levych Bot – Ваша гра в шахи у Telegram!', {
          reply_markup: {
            inline_keyboard: [[{ text: '👉 Відкрити 👈', web_app: { url: this.configService.get<string>('BASE_WEB_APP_URL') } }]]
          }
        });
      });

      this.bot.start({
        // Make sure to specify the desired update types
        allowed_updates: ['chat_member', 'message', 'callback_query'],
      });
    } catch (error) {
      console.error(error);
    }
  }


}

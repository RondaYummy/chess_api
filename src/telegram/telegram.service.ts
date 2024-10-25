import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, Bot, Context, RawApi } from 'grammy';

@Injectable()
export class TelegramService {
  readonly bot: Bot<Context, Api<RawApi>>;

  constructor(private configService: ConfigService) {
    try {
      this.bot = new Bot<Context>(this.configService.get<string>('TELEGRAM_BOT_TOKEN'));

      // FIRST COMMAND "/START"
      this.bot.command('start', (msg) => {
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

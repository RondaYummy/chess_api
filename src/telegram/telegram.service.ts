import { Injectable } from '@nestjs/common';
import { Api, Bot, Context, RawApi } from 'grammy';

@Injectable()
export class TelegramService {
  readonly bot: Bot<Context, Api<RawApi>>;

  constructor() {
    try {
      this.bot = new Bot<Context>('7576109481:AAFJqAu2_Bk3wCmxLR5q1Ge_UjJpKFapi3g');

      // FIRST COMMAND "/START"
      this.bot.command('start', (msg) => {
        this.bot.api.sendMessage(msg.chatId, '♟️ Chess | Levych Bot – Ваша гра в шахи у Telegram!', {
          reply_markup: {
            inline_keyboard: [[{ text: '👉 Відкрити 👈', web_app: { url: 'https://c0a8-193-19-255-98.ngrok-free.app' } }]]
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

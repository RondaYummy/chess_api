import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) { }

  authTelegram(telegramInitData) {
    const initData = new URLSearchParams(telegramInitData);
    initData.sort();
    const hash = initData.get('hash');
    initData.delete('hash');
    const dataToCheck = [...initData.entries()].map(([key, value]) => key + '=' + value).join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(this.configService.get('TELEGRAM_BOT_TOKEN')).digest();
    const _hash = createHmac('sha256', secretKey).update(dataToCheck).digest('hex');

    return {
      isAuth: hash === _hash,
      userTelegramTd: JSON.parse(initData.get('user'))?.id,
    };
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<
      Request & {
        params: any;
        query: any;
        body: any;
        userTelegramTd: string | undefined;
      }
    >();
    const initData = request.params.initData || request.query.initData || request.body.initData;
    const { isAuth, userTelegramTd } = this.authTelegram(initData);
    if (isAuth) {
      request.userTelegramTd = userTelegramTd;
    }
    return isAuth;
  }
}

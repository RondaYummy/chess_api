import { Controller, Post, Body, Req, Res, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseSchema } from '../database.schema';
import { Kysely } from 'kysely';
import { comparePasswords, hashPassword } from '../utils/scypto';
import { Auth } from './auth.decorator';
import { nanoid } from '../utils/nanoid';

interface RegisterDto {
  username: string;
  password: string;
  login: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(@Inject('DB_CONNECTION') private db: Kysely<DatabaseSchema>, private configService: ConfigService) { }

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res() res: FastifyReply,
    @Req() req: FastifyRequest,
  ) {
    const { username, password, login } = body;
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('login', '=', login)
      .executeTakeFirst();

    if (user) {
      return res.status(400).send({ message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);
    await this.db
      .insertInto('users')
      .values({
        id: await nanoid(),
        firstName: username,
        password: hashedPassword,
        login,
      })
      .execute();

    res.send({ user: { username } });
  }

  @Post('profile')
  @Auth()
  async profile(
    @Req() req: FastifyRequest & { userTelegramTd: any; },
    @Res() res: FastifyReply
  ) {
    const userId = req.session.userId;
    if (!userId && !req.userTelegramTd) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where((eb) => eb.or([
        eb('id', '=', userId),
        eb('telegramId', '=', req.userTelegramTd)
      ]))
      .executeTakeFirst();

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    console.log({
      username: user.username,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      telegramId: user.telegramId,
      rating: user.rating,
      lastGameDate: user.lastGameDate,
    });

    res.send({
      user: {
        username: user.username,
        firstName: user.firstName,
        id: user.id,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        telegramId: user.telegramId,
        rating: user.rating,
        lastGameDate: user.lastGameDate,
      },
    });
  }

  @Post('login')
  async login(
    @Body() body: { username: string; password: string; },
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply
  ) {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('login', '=', body.username)
      .executeTakeFirst();

    if (!await comparePasswords(body.password, user?.password)) {
      return res.status(400).send({ message: 'Incorrect data entered or user not found' });
    }

    req.session.userId = user.id; // Save user ID to session

    res.send({
      user: {
        username: user.username,
        firstName: user.firstName,
        id: user.id,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        telegramId: user.telegramId,
      }
    });
  }

  @Post('logout')
  async logout(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply
  ) {
    req.session = null; // destroy session
    res.send({ message: 'Logged out' });
  }
}

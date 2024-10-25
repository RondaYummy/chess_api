import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketAdapter extends IoAdapter {
  createIOServer(
    port: number,
    options?: ServerOptions & {
      namespace?: string;
      server?: any;
    },
  ) {
    const server = super.createIOServer(port, { ...options, cors: true, origin: ['http://localhost:5173', 'https://chess.levych.com', 'https://levych.com', process.env.BASE_WEB_APP_URL] });
    return server;
  }
}


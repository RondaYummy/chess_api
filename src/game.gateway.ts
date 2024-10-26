import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChessService } from './chess/chess.service';
import { Cron } from '@nestjs/schedule';

@WebSocketGateway()
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private connectedUsers: { userId: string; socketId: string; timeoutId?: NodeJS.Timeout; }[] = [];
  private leftUsers: { userId: string; socketId: string; timeoutId?: NodeJS.Timeout; }[] = [];
  private queue: { userId: string; gameType: string; }[] = [];

  constructor(private chessService: ChessService) { }

  handleConnection(socket: Socket, @ConnectedSocket() client: Socket) {
    const userId = socket.handshake.query.userId as string;
    console.log(`User connected: ${socket.id} ::: ${userId}`);

    this.connectedUsers.push({ userId: userId, socketId: socket.id });
    console.log(`Connected users count: ${this.connectedUsers.length}`);

    const clearTimeoutUser = this.leftUsers.find(user => user.userId === userId);
    clearTimeout(clearTimeoutUser?.timeoutId);
    this.leftUsers = this.leftUsers.filter(user => user.userId !== userId);

    const queue = this.queue.find((q) => q.userId === userId);
    if (queue) {
      socket.emit('joinedQueue', queue);
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
    const user = this.connectedUsers.find(user => user.socketId === socket.id);

    if (user) {
      user.timeoutId = setTimeout(() => {
        console.log(`User ${user.userId} has timed out and lost the game.`);
        this.queue = this.queue.filter((q) => q.userId !== user.userId); // пошук гри
      }, 13000); // 13 секунд
      this.leftUsers.push(user);
    }

    this.connectedUsers = this.connectedUsers.filter(user => user.socketId !== socket.id);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(@MessageBody() data: { userId: string; gameType: string; }, @ConnectedSocket() client: Socket): void {
    console.log('--- JOIN QUEUE ---');
    const userId = data.userId;
    const gameType = data.gameType;

    const foundUser = this.queue.find((q) => q.gameType === gameType && q.userId === userId);

    if (!foundUser) {
      this.queue.push(data);

      console.log(`User ${userId} joined the queue with type ${gameType}. Current queue:`, this.queue);
      client.emit('joinedQueue', data); // Відправка тільки клієнту, який приєднався до черги
    }
  }

  @SubscribeMessage('subscribeToGame')
  async handleSubscribeToGame(@MessageBody() data: { gameId: string; }, @ConnectedSocket() client: Socket): Promise<void> {
    const gameId = data.gameId;

    // Додаємо клієнта до кімнати гри
    client.join(gameId);

    const game = await this.chessService.getGameById(gameId);
    const moves = await this.chessService.getGameMovesByGameId(gameId);

    if (game) {
      console.log(`User subscribed to game ${gameId}`);
      const board = this.chessService.getInitialBoard(game.boardState);
      // Відправляємо тільки в кімнату, щоб гравці отримували дані по грі
      this.server.to(gameId).emit('gameDetails', { game, board, moves });
    } else {
      console.log(`Game ${gameId} not found for subscription.`);
    }
  }

  @SubscribeMessage('move')
  async handleMove(@MessageBody() data: { from: string; to: string; userId: string; gameId: string; promotion?: string; }) {
    if (!data?.userId || !data?.from || !data?.to || !data?.gameId) {
      console.error('Missing data!');
      return;
    }

    console.log(`User ${data.userId} moved from ${data.from} to ${data.to}`);
    const moveResult = await this.chessService.handleMove(data);

    // Відправка оновлень тільки клієнтам у кімнаті гри
    this.server.to(data.gameId).emit('move', moveResult);
  }

  private async startGame(players: { userId: string; gameType: string; }[]) {
    const playerWhite = players[0].userId;
    const playerBlack = players[1].userId;

    const gameId = await this.chessService.createGame(playerWhite, playerBlack);

    const initialBoard = this.chessService.getInitialBoard();

    // Додаємо обох гравців до кімнати
    players.forEach(player => {
      const userSocket = this.connectedUsers.find(user => user.userId === player.userId);
      if (userSocket) {
        this.server.sockets.sockets.get(userSocket.socketId)?.join(gameId);
      }
    });

    // Відправляємо подію тільки гравцям у кімнаті гри
    this.server.to(gameId).emit('gameStarted', { players, board: initialBoard, id: gameId });
    console.log(`Game ${gameId} started between:`, players);
  }

  @Cron('*/10 * * * * *')
  handleGameCheck() {
    if (this.queue.length >= 2) {
      const players = this.queue.splice(0, 2);
      this.startGame(players);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong');
  }
}

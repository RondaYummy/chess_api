import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChessService } from './chess/chess.service';
import { Cron } from '@nestjs/schedule';
import { Square } from 'chess.js';

@WebSocketGateway()
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private connectedUsers: { userId: string; socketId: string; timeoutId?: NodeJS.Timeout; }[] = [];
  private leftUsers: { userId: string; socketId: string; timeoutId?: NodeJS.Timeout; }[] = [];
  private queue: { userId: string; gameType: string; }[] = [];

  constructor(private chessService: ChessService) { }

  handleConnection(socket: Socket) {
    console.log(`User connected: ${socket.id}`);
    const userId = socket.handshake.query.userId as string;
    this.connectedUsers.push({ userId: userId, socketId: socket.id });
    console.log(`Connected users count: ${this.connectedUsers.length}`);

    const clearTimeoutUser = this.leftUsers.find(user => user.userId === userId);
    clearTimeout(clearTimeoutUser?.timeoutId);
    this.leftUsers = this.leftUsers.filter(user => user.userId !== userId);
  }

  handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
    const user = this.connectedUsers.find(user => user.socketId === socket.id);

    if (user) {
      user.timeoutId = setTimeout(() => {
        console.log(`User ${user.userId} has timed out and lost the game.`);
      }, 13000); // 13 секунд
      this.leftUsers.push(user);
    }

    this.connectedUsers = this.connectedUsers.filter(user => user.socketId !== socket.id);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(@MessageBody() data: { userId: string; gameType: string; }): void {
    const userId = data.userId;
    const gameType = data.gameType;

    const foundUser = this.queue.find((q) => q.gameType === gameType && q.userId === userId);

    if (!foundUser) {
      this.queue.push(data);

      console.log(`User ${userId} joined the queue with type ${gameType}. Current queue:`, this.queue);
      this.server.emit('joinedQueue', data);
    }
  }

  @SubscribeMessage('moves')
  async moves(@MessageBody() data: { square: Square, gameId: string; }): Promise<void> {
    const moves = await this.chessService.moves(data.square, data.gameId);
    // Модифікуємо масив moves, щоб залишити лише останні два символи, якщо довжина більше 2
    const modifiedMoves = moves.map(move => {
      return move.length > 2 ? move.slice(-2) : move; // Вибираємо останні два символи або залишаємо без змін
    });
    this.server.emit('moves', modifiedMoves);
  }

  @SubscribeMessage('subscribeToGame')
  async handleSubscribeToGame(@MessageBody() data: { gameId: string; }): Promise<void> {
    const gameId = data.gameId;

    const game = await this.chessService.getGameById(gameId);
    const moves = await this.chessService.getGameMovesByGameId(gameId);

    if (game) {
      console.log(`User subscribed to game ${gameId}`);
      const board = this.chessService.getInitialBoard(game.boardState);
      this.server.emit('gameDetails', { game, board, moves });
    } else {
      console.log(`Game ${gameId} not found for subscription.`);
    }
  }

  @SubscribeMessage('move')
  async handleMove(@MessageBody() data: { from: string; to: string; userId: string; gameId: string; promotion?: string; }) {
    // Перевірка, що всі дані надійшли
    if (!data?.userId || !data?.from || !data?.to || !data?.gameId) {
      console.error('Missing data!');
      return; // Завершуємо функцію, якщо якісь дані відсутні
    }

    console.log(`User ${data.userId} moved from ${data.from} to ${data.to}`);
    const moveResult = await this.chessService.handleMove(data);

    // Відправка оновлень всім клієнтам
    this.server.emit('move', moveResult);
  }

  private async startGame(players: { userId: string; gameType: string; }[]) {
    const playerWhite = players[0].userId; // Перший гравець — білий
    const playerBlack = players[1].userId; // Другий гравець — чорний

    const gameId = await this.chessService.createGame(playerWhite, playerBlack); // Зберігаємо гру

    const initialBoard = this.chessService.getInitialBoard();
    this.server.emit('gameStarted', { players, board: initialBoard, id: gameId });
    console.log(`Game ${gameId} started between:`, players);
  }

  @Cron('*/10 * * * * *')
  handleGameCheck() {
    if (this.queue.length >= 2) {
      // Витягнути перших двох гравців з черги в майбутньому зробити підбір гравців ( ранг, тощо )
      const players = this.queue.splice(0, 2);
      this.startGame(players);
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: any): void {
    client.emit('pong');
  };
}

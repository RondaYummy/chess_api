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
import { isValidFEN } from './utils/ids';
import { StockfishService } from './stockfish/stockfish.service';

@WebSocketGateway()
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private connectedUsers: { userId: string; socketId: string; timeoutId?: NodeJS.Timeout; }[] = [];
  private leftUsers: { userId: string; socketId: string; timeoutId?: NodeJS.Timeout; }[] = [];
  private queue: { userId: string; gameType: string; time: number; }[] = [];

  constructor(private chessService: ChessService, private stockfishService: StockfishService) { }

  handleConnection(socket: Socket, @ConnectedSocket() client: Socket) {
    const userId = socket.handshake.query.userId as string;
    console.log(`User connected: ${socket.id} ::: ${userId}`);

    this.connectedUsers.push({ userId: userId, socketId: socket.id });
    console.log(`Connected users count: ${this.connectedUsers.length}`);

    const clearTimeoutUser = this.leftUsers.find(user => user.userId === userId);
    clearTimeout(clearTimeoutUser?.timeoutId);
    this.leftUsers = this.leftUsers.filter(user => user.userId !== userId);

    const queue = this.queue.find((q) => q.userId === userId);
    console.log(`[handleConnection]: `, queue);
    if (queue) {
      socket.emit('joinedQueue', queue);
    }
  }

  async handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
    const user = this.connectedUsers.find(user => user.socketId === socket.id);
    const game = await this.chessService.getActivePlayerGame(user.userId);

    if (user && game) {
      user.timeoutId = setTimeout(async () => {
        const updatedGame = await this.chessService.leftFromGame(game, user.userId);

        if (updatedGame && updatedGame?.id) {
          const moves = await this.chessService.getGameMovesByGameId(game.id);
          const board = this.chessService.getInitialBoard(game.boardState);
          this.server.to(game.id).emit('gameDetails', { game: updatedGame, board, moves });
        }
      }, 13000); // 13 seconds

      this.leftUsers.push(user);
    }

    this.queue = this.queue.filter((q) => q.userId !== user.userId);
    this.connectedUsers = this.connectedUsers.filter(user => user.socketId !== socket.id);
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@MessageBody() data: { userId: string; gameType: string; }, @ConnectedSocket() client: Socket): void {
    const userId = data.userId;
    const gameType = data.gameType;

    this.queue = this.queue.filter((q) => q.userId !== userId && q.gameType !== gameType);
    client.emit('leftTheQueue', data); // Sending only to a client who has left the queue
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(@MessageBody() data: { userId: string; gameType: string; time: number; withBot: boolean; }, @ConnectedSocket() client: Socket) {
    console.log('--- JOIN QUEUE ---');

    const userId = data.userId;
    const gameType = data.gameType;

    if (data.withBot) {
      return this.startGame([{
        userId,
        gameType,
        time: data.time,
      }], true);
    }

    const foundUser = this.queue.find((q) => q.gameType === gameType && q.userId === userId);
    console.log(foundUser);

    if (!foundUser) {
      this.queue.push(data);

      console.log(`User ${userId} joined the queue with type ${gameType}. Current queue:`, this.queue);
      client.emit('joinedQueue', data); // Send only to the client that joined the queue
    }
  };

  @SubscribeMessage('subscribeToGame')
  async handleSubscribeToGame(@MessageBody() data: { gameId: string; }, @ConnectedSocket() client: Socket): Promise<void> {
    const gameId = data.gameId;

    // Add a client to the game room
    client.join(gameId);

    const game = await this.chessService.getGameById(gameId);
    const moves = await this.chessService.getGameMovesByGameId(gameId);

    if (game) {
      console.log(`User subscribed to game ${gameId}`);
      const board = this.chessService.getInitialBoard(game.boardState);
      // Send only to the room so that players receive game data
      const currentPlayer = game.turn;
      const now = new Date();
      const elapsed = now.getTime() - new Date(game.startTime).getTime();

      let remainingWhiteTime;
      let remainingBlackTime;

      if (currentPlayer === 'white') {
        remainingWhiteTime = game['timeWhite'] - elapsed;
        remainingBlackTime = game['timeBlack'];
      } else {
        remainingWhiteTime = game['timeWhite'];
        remainingBlackTime = game['timeBlack'] - elapsed;
      }

      this.server.to(gameId).emit('gameDetails', { game, board, moves, remainingWhiteTime, remainingBlackTime, currentPlayer });
    } else {
      console.log(`Game ${gameId} not found for subscription.`);
    }
  };

  @SubscribeMessage('move')
  async handleMove(@MessageBody() data: { from: string; to: string; userId: string; gameId: string; promotion?: string; }) {
    if (!data?.userId || !data?.from || !data?.to || !data?.gameId) {
      console.error('Missing data!');
      return;
    }

    const game = await this.chessService.getGameById(data.gameId);
    if (!game) {
      throw new Error('Game not found'); // Is it better to throw a bug?
    }
    if (!isValidFEN(game.boardState)) {
      throw new Error('Bad FEN'); // Is it better to throw a bug?
    }

    const currentPlayer = game.turn;
    const now = new Date();
    const elapsed = now.getTime() - new Date(game.startTime).getTime();
    const updatedTimeField = currentPlayer === 'white' ? 'timeWhite' : 'timeBlack';
    const remainingTime = game[updatedTimeField] - elapsed;

    // Checking the stroke time
    if (remainingTime <= 0) {
      const winner = currentPlayer === 'white' ? 'black' : 'white';
      await this.chessService.timeLeftGame(game, winner);
      this.server.to(data.gameId).emit('updates', { type: 'time-out', winner });
      return;
    }

    console.log(`User ${data.userId} moved from ${data.from} to ${data.to}`);
    const moveResult = await this.chessService.handleMove(data, game);
    await this.chessService.savePlayerTime(game.id, updatedTimeField, remainingTime, currentPlayer, now);
    this.server.to(data.gameId).emit('move', { ...moveResult, remainingTime, currentPlayer });

    if (game.isBotGame) {
      const updatedGame = await this.chessService.getGameById(game.id);
      if (updatedGame.turn === 'black') {
        await this.handleBotMove(updatedGame, moveResult.move.boardState);
      }
    }
  }

  private async startGame(players: { userId: string; gameType: string; time: number; }[], playWithBot: boolean = false) {
    const playerWhite = players[0].userId;
    const playerBlack = playWithBot ? 'bot' : players[1].userId;
    const time = players[0].time;
    const gameType = players[0].gameType;

    const gameId = await this.chessService.createGame(playerWhite, playerBlack, time, gameType, playWithBot);

    // Add both players to the room
    players.forEach(player => {
      const userSocket = this.connectedUsers.find(user => user?.userId === player?.userId);
      if (userSocket) {
        this.server.sockets.sockets.get(userSocket.socketId)?.join(gameId);
      }
    });

    // Send the event only to players in the game room
    this.server.to(gameId).emit('gameStarted', { id: gameId });
    console.log(`Game ${gameId} started between:`, players);
  }

  private async handleBotMove(game: {
    id: string;
    playerWhite: string;
    playerBlack: string;
    boardState: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    winner: string;
    gameEndReason: string;
    timeWhite: number;
    timeBlack: number;
    turn: string;
    startTime: Date;
    isBotGame: boolean;
  }, boardState: string) {
    if (!game) return;
    const bestMove = await this.stockfishService.getBestMove(boardState);
    if (!bestMove || !bestMove.from || !bestMove.to) {
      console.log('Failed to get a valid move from Stockfish');
      return;
    }
    console.log(`Bot move from ${bestMove.from} to ${bestMove.to}`);

    // Apply the bot's move to the game and update its status
    const moveResult = await this.chessService.handleMove({ ...bestMove, gameId: game.id, userId: game.id }, game);
    if (!moveResult) {
      console.log('Failed to apply bot move');
      return;
    }
    const now = new Date();
    const remainingTime = game.turn === 'black' ? game.timeBlack : game.timeWhite;

    // Updating the time for the bot
    await this.chessService.savePlayerTime(game.id, 'timeBlack', remainingTime, 'black', now);

    this.server.to(game.id).emit('move', { ...moveResult, remainingTime, currentPlayer: 'white' });
  }


  @Cron('*/5 * * * * *')
  handleGameCheck() {
    // Group players by game type and time
    const groupedPlayers: { [key: string]: { userId: string; gameType: string; time: number; }[]; } = {};
    this.queue.forEach((player) => {
      const key = `${player.gameType}-${player.time}`; // Create a unique key for the game type and time
      if (!groupedPlayers[key]) {
        groupedPlayers[key] = [];
      }
      groupedPlayers[key].push(player);
    });

    for (const key in groupedPlayers) {
      if (groupedPlayers[key].length >= 2) {
        const players = groupedPlayers[key].splice(0, 2); // Take two players from the group
        this.startGame(players); // Start the game
      }
    }

    // Update the queue by removing players who are already playing
    this.queue = this.queue.filter((player) => {
      const key = `${player.gameType}-${player.time}`;
      return !(groupedPlayers[key] && groupedPlayers[key].length === 0);
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong');
  }
}

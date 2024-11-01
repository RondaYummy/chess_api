export interface DatabaseSchema {
  chess_games: {
    id: string; // 'uuid'?
    playerWhite: string;
    playerBlack: string;
    boardState: string; // FEN
    type: string;
    createdAt: Date;
    updatedAt: Date;
    winner: string | null; // 'white', 'black', or 'draw'
    gameEndReason: string | null; // Наприклад, 'checkmate', 'stalemate', 'resignation', 'time-out'
    timeWhite: number; // Time for white ( ms )
    timeBlack: number; // Time for black ( ms )
    turn: string; // Хід (white or black)
    startTime: Date; // Час початку поточного ходу
    isBotGame: boolean;
  };

  chess_moves: {
    id: string; // uuid
    gameId: string; // uuid
    move: string;
    playerId: string; // uuid
    fen: string;
    createdAt: Date;
  };

  users: {
    id: string; // uuid
    telegramId: number;
    username: string | null;
    login: string | null;
    password: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null; // Lang code
    profilePicture: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

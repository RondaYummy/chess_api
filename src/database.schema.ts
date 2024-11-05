export interface DatabaseSchema {
  chess_games: {
    id: string; // nanoid
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
    id: string; // nanoid
    gameId: string; // nanoid
    move: string;
    playerId: string; // nanoid
    fen: string;
    createdAt: Date;
  };

  users: {
    id: string; // nanoid
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

    // RATING SYSTEM
    rating: number; // Glicko-рейтинг користувача
    rd: number; // Rating Deviation для системи Glicko
    lastGameDate: Date; // Дата останньої гри
  };
}

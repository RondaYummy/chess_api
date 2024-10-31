export interface DatabaseSchema {
  chess_games: {
    id: string; // Зміна типу на 'uuid'
    playerWhite: string;
    playerBlack: string;
    boardState: string; // FEN
    type: string;
    createdAt: Date;
    updatedAt: Date;
    winner: string | null; // Значення: 'white', 'black', або 'draw'
    gameEndReason: string | null; // Наприклад, 'checkmate', 'stalemate', 'resignation', 'time-out'
    timeWhite: number; // Час для білих ( ms )
    timeBlack: number; // Час для чорних ( ms )
    turn: string; // Хід (white або black)
    startTime: Date; // Час початку поточного ходу
    isBotGame: boolean;
  };

  chess_moves: {
    id: string; // uuid
    gameId: string; // uuid
    move: string;
    playerId: string; // uuid
    createdAt: Date;
  };

  users: {
    id: string; // uuid
    telegramId: number; // ID користувача в Telegram
    username: string | null;
    login: string | null;
    password: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null; // Код мови
    profilePicture: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

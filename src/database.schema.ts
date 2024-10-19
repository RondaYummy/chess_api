export interface DatabaseSchema {
  chess_games: {
    id: string; // Зміна типу на 'uuid'
    playerWhite: string;
    playerBlack: string;
    boardState: string; // FEN
    createdAt: Date;
    updatedAt: Date;
    timeWhite: number; // Час для білих
    timeBlack: number; // Час для чорних
    turn: string; // Хід (white або black)
    startTime: Date; // Час початку поточного ходу
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
    username: string | null; // Ім'я користувача
    login: string | null; // Логін користувача
    password: string | null; // Пароль користувача
    firstName: string | null; // Ім'я
    lastName: string | null; // Прізвище
    languageCode: string | null; // Код мови
    profilePicture: string | null; // URL профільного зображення
    createdAt: Date; // Дата створення користувача
    updatedAt: Date; // Дата останнього оновлення
  };
}

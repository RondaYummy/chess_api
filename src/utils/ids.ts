import { v4 as uuidv4 } from 'uuid';

export function generateUniqueId(): string {
  return uuidv4();
}

export function isValidFEN(fen) {
  const fenParts = fen.split(' ');
  return fenParts.length === 6;
}

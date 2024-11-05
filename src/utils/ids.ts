export function isValidFEN(fen) {
  const fenParts = fen.split(' ');
  return fenParts.length === 6;
}

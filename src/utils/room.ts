export function generateRoomId() {
  return [
    Math.random().toString(36).slice(2, 5),
    Math.random().toString(36).slice(2, 6),
    Math.random().toString(36).slice(2, 5),
  ].join('-');
}

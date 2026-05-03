const OWNED_ROOMS_KEY = 'aao-milo-owned-rooms';

function readOwnedRooms() {
  try {
    const rooms = window.localStorage.getItem(OWNED_ROOMS_KEY);
    return rooms ? (JSON.parse(rooms) as string[]) : [];
  } catch {
    return [];
  }
}

export function markRoomAsOwned(roomId: string) {
  const rooms = new Set(readOwnedRooms());
  rooms.add(roomId);
  window.localStorage.setItem(OWNED_ROOMS_KEY, JSON.stringify([...rooms]));
}

export function isOwnedRoom(roomId: string) {
  return readOwnedRooms().includes(roomId);
}

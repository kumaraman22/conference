export function getRoomFromUrl() {
  return new URLSearchParams(window.location.search).get('room') ?? '';
}

export function getHostPeerFromUrl() {
  return new URLSearchParams(window.location.search).get('host') ?? '';
}

export function getInviteUrl(roomId: string, hostPeerId?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  if (hostPeerId) {
    url.searchParams.set('host', hostPeerId);
  }
  return url.toString();
}

export interface SignalingClient {
  connect(roomId: string): void;
  disconnect(): void;
}

export function createSignalingClient(): SignalingClient {
  let socket: WebSocket | null = null;

  return {
    connect(roomId) {
      const signalingUrl = import.meta.env.VITE_SIGNALING_URL;
      if (!signalingUrl || socket) return;

      const url = new URL(signalingUrl);
      url.searchParams.set('room', roomId);
      socket = new WebSocket(url);
    },
    disconnect() {
      socket?.close();
      socket = null;
    },
  };
}

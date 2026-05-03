export interface MeetingSession {
  roomId: string;
  displayName: string;
  isHost: boolean;
  hostPeerId?: string;
}

export interface Participant {
  id: string;
  displayName: string;
  isLocal?: boolean;
  isHost?: boolean;
  isSharingScreen?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  stream?: MediaStream;
}

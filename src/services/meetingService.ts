import type { MeetingSession } from '../types/meeting';
import { apiRequest } from './apiClient';

export interface JoinMeetingPayload {
  roomId: string;
  displayName: string;
  isHost: boolean;
  hostPeerId?: string;
}

export async function joinMeeting(
  payload: JoinMeetingPayload,
): Promise<MeetingSession> {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return payload;
  }

  return apiRequest<MeetingSession>('/meetings/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function leaveMeeting(roomId: string) {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return;
  }

  await apiRequest(`/meetings/${encodeURIComponent(roomId)}/leave`, {
    method: 'POST',
  });
}

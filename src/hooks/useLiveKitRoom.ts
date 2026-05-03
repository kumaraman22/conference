import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RemoteParticipant,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import type { MeetingSession, Participant } from '../types/meeting';
import { getSignalingHttpBase } from './usePeerMeeting';

interface UseLiveKitRoomOptions {
  isAdmitted: boolean;
  localStream: MediaStream | null;
  participantId: string;
  session: MeetingSession;
  onError: (message: string) => void;
}

interface TokenResponse {
  token: string;
  url: string;
  message?: string;
}

function emptyRemoteMedia() {
  return {
    audioTrack: undefined as MediaStreamTrack | undefined,
    videoTrack: undefined as MediaStreamTrack | undefined,
    displayName: 'Participant',
    isHost: false,
  };
}

export function useLiveKitRoom({
  isAdmitted,
  localStream,
  participantId,
  session,
  onError,
}: UseLiveKitRoomOptions) {
  const roomRef = useRef<Room | null>(null);
  const remoteMediaRef = useRef<Map<string, ReturnType<typeof emptyRemoteMedia>>>(new Map());
  const [mediaStatus, setMediaStatus] = useState('Waiting for admission');
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);

  const rebuildRemoteParticipants = useCallback(() => {
    setRemoteParticipants(
      [...remoteMediaRef.current.entries()].map(([id, media]) => {
        const tracks = [media.videoTrack, media.audioTrack].filter(
          Boolean,
        ) as MediaStreamTrack[];

        return {
          id,
          displayName: media.displayName,
          isHost: media.isHost,
          isCameraOff: !media.videoTrack,
          stream: tracks.length > 0 ? new MediaStream(tracks) : undefined,
        };
      }),
    );
  }, []);

  const ensureRemoteMedia = useCallback((participant: RemoteParticipant) => {
    const existing = remoteMediaRef.current.get(participant.identity);
    if (existing) return existing;

    const media = emptyRemoteMedia();
    media.displayName = participant.name || 'Participant';
    media.isHost = participant.identity.includes('host');
    remoteMediaRef.current.set(participant.identity, media);
    return media;
  }, []);

  const attachRemoteTrack = useCallback(
    (track: RemoteTrack, participant: RemoteParticipant) => {
      const media = ensureRemoteMedia(participant);
      if (track.kind === Track.Kind.Video) {
        media.videoTrack = track.mediaStreamTrack;
      }
      if (track.kind === Track.Kind.Audio) {
        media.audioTrack = track.mediaStreamTrack;
      }
      rebuildRemoteParticipants();
    },
    [ensureRemoteMedia, rebuildRemoteParticipants],
  );

  const detachRemoteTrack = useCallback(
    (track: RemoteTrack, participant: RemoteParticipant) => {
      const media = ensureRemoteMedia(participant);
      if (track.kind === Track.Kind.Video) {
        media.videoTrack = undefined;
      }
      if (track.kind === Track.Kind.Audio) {
        media.audioTrack = undefined;
      }
      rebuildRemoteParticipants();
    },
    [ensureRemoteMedia, rebuildRemoteParticipants],
  );

  const publishLocalStream = useCallback(async (room: Room, stream: MediaStream) => {
    await Promise.all(
      [...room.localParticipant.trackPublications.values()].map((publication) =>
        publication.track
          ? room.localParticipant.unpublishTrack(publication.track)
          : Promise.resolve(),
      ),
    );

    await Promise.all(
      stream
        .getTracks()
        .filter((track) => track.readyState === 'live')
        .map((track) => room.localParticipant.publishTrack(track)),
    );
  }, []);

  useEffect(() => {
    if (!isAdmitted || !localStream) {
      setMediaStatus(isAdmitted ? 'Preparing media' : 'Waiting for admission');
      return;
    }

    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;
    const streamToPublish = localStream;
    const remoteMedia = remoteMediaRef.current;

    async function connect() {
      try {
        setMediaStatus('Connecting to media server');
        const response = await fetch(`${getSignalingHttpBase()}/api/livekit-token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            roomId: session.roomId,
            participantId,
            displayName: session.displayName,
          }),
        });
        const payload = (await response.json()) as TokenResponse;
        if (!response.ok) {
          throw new Error(payload.message ?? 'Unable to create media token.');
        }

        room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
          attachRemoteTrack(track, participant);
        });
        room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
          detachRemoteTrack(track, participant);
        });
        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          remoteMediaRef.current.delete(participant.identity);
          rebuildRemoteParticipants();
        });

        await room.connect(payload.url, payload.token);
        if (cancelled) return;

        await publishLocalStream(room, streamToPublish);
        setMediaStatus('Media connected');

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track && publication.isSubscribed) {
              attachRemoteTrack(publication.track as RemoteTrack, participant);
            }
          });
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to connect to media server.';
        setMediaStatus('Media server unavailable');
        onError(message);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      remoteMedia.clear();
      setRemoteParticipants([]);
      room.disconnect();
    };
  }, [
    attachRemoteTrack,
    detachRemoteTrack,
    isAdmitted,
    localStream,
    onError,
    participantId,
    publishLocalStream,
    rebuildRemoteParticipants,
    session.displayName,
    session.roomId,
  ]);

  return {
    mediaStatus,
    remoteParticipants,
  };
}

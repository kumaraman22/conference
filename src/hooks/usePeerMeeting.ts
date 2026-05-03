import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MeetingSession, Participant } from '../types/meeting';

interface WaitingParticipant {
  id: string;
  displayName: string;
}

interface SignalingParticipant {
  id: string;
  displayName: string;
  isHost?: boolean;
}

type ServerMessage =
  | { type: 'host-ready'; participants: SignalingParticipant[]; waiting: WaitingParticipant[] }
  | { type: 'waiting' }
  | { type: 'waiting-list'; participants: WaitingParticipant[] }
  | { type: 'admitted'; participants: SignalingParticipant[] }
  | { type: 'rejected' }
  | { type: 'join-error'; message: string }
  | { type: 'participant-joined'; participant: SignalingParticipant }
  | { type: 'participant-left'; participantId: string }
  | { type: 'host-left' };

interface UsePeerMeetingOptions {
  localStream: MediaStream | null;
  session: MeetingSession;
  onError: (message: string) => void;
}

function createParticipantId() {
  const existing = window.sessionStorage.getItem('aao-milo-participant-id');
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.sessionStorage.setItem('aao-milo-participant-id', id);
  return id;
}

export function getSignalingUrl() {
  const configured = import.meta.env.VITE_SIGNALING_URL as string | undefined;
  if (configured) return configured;
  return window.location.protocol === 'https:'
    ? 'wss://conference-app-tu4u.onrender.com'
    : 'ws://localhost:4000';
}

export function getSignalingHttpBase() {
  return getSignalingUrl().replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
}

export function usePeerMeeting({
  localStream,
  session,
  onError,
}: UsePeerMeetingOptions) {
  const participantId = useMemo(createParticipantId, []);
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Preparing connection');
  const [isAdmitted, setIsAdmitted] = useState(session.isHost);
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);

  const send = useCallback((message: unknown) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const upsertRemoteParticipant = useCallback((participant: Participant) => {
    setRemoteParticipants((current) => {
      const existing = current.find((item) => item.id === participant.id);
      if (existing) {
        return current.map((item) =>
          item.id === participant.id ? { ...item, ...participant } : item,
        );
      }
      return [...current, participant];
    });
  }, []);

  const removeRemoteParticipant = useCallback((id: string) => {
    setRemoteParticipants((current) =>
      current.filter((participant) => participant.id !== id),
    );
  }, []);

  const handleServerMessage = useCallback(
    (message: ServerMessage) => {
      if (message.type === 'host-ready') {
        setIsAdmitted(true);
        setConnectionStatus('Host connection ready');
        setWaitingParticipants(message.waiting);
      }

      if (message.type === 'waiting') {
        setIsAdmitted(false);
        setConnectionStatus('Waiting for host approval');
      }

      if (message.type === 'waiting-list') {
        setWaitingParticipants(message.participants);
        if (message.participants.length > 0) {
          setConnectionStatus('Participant waiting for admission');
        } else if (session.isHost) {
          setConnectionStatus('Host connection ready');
        }
      }

      if (message.type === 'admitted') {
        setIsAdmitted(true);
        setConnectionStatus('Connected to meeting');
        setRemoteParticipants(
          message.participants
            .filter((participant) => participant.id !== participantId)
            .map((participant) => ({
              id: participant.id,
              displayName: participant.displayName,
              isHost: participant.isHost,
              isCameraOff: true,
            })),
        );
      }

      if (message.type === 'participant-joined') {
        upsertRemoteParticipant({
          id: message.participant.id,
          displayName: message.participant.displayName,
          isHost: message.participant.isHost,
          isCameraOff: true,
        });
      }

      if (message.type === 'participant-left') {
        removeRemoteParticipant(message.participantId);
      }

      if (message.type === 'rejected') {
        setIsAdmitted(false);
        setConnectionStatus('Host did not admit you');
        onError('The host did not admit you into this meeting.');
      }

      if (message.type === 'join-error') {
        setConnectionStatus('Host not reachable');
        onError(message.message);
      }

      if (message.type === 'host-left') {
        setConnectionStatus('Host left the meeting');
        onError('The host left the meeting.');
      }
    },
    [onError, participantId, removeRemoteParticipant, session.isHost, upsertRemoteParticipant],
  );

  useEffect(() => {
    if (!localStream) {
      setConnectionStatus('Allow camera and microphone');
      return;
    }

    const signalingUrl = getSignalingUrl();
    const socket = new WebSocket(signalingUrl);
    socketRef.current = socket;
    setConnectionStatus('Connecting to signaling server');

    socket.onopen = () => {
      send({
        type: 'join-room',
        roomId: session.roomId,
        participantId,
        displayName: session.displayName,
        isHost: session.isHost,
      });
      setConnectionStatus(session.isHost ? 'Starting host room' : 'Contacting host waiting room');
    };

    socket.onmessage = (event) => {
      handleServerMessage(JSON.parse(event.data) as ServerMessage);
    };

    socket.onerror = () => {
      setConnectionStatus('Signaling server unavailable');
      onError(`Signaling server is unavailable at ${signalingUrl}. Check the Render service.`);
    };

    socket.onclose = () => {
      setConnectionStatus('Disconnected from signaling server');
    };

    return () => {
      socket.close();
    };
  }, [
    handleServerMessage,
    localStream,
    onError,
    participantId,
    send,
    session.displayName,
    session.isHost,
    session.roomId,
  ]);

  const admitParticipant = useCallback(
    (waitingParticipantId: string) => {
      send({ type: 'admit-participant', participantId: waitingParticipantId });
    },
    [send],
  );

  const rejectParticipant = useCallback(
    (waitingParticipantId: string) => {
      send({ type: 'reject-participant', participantId: waitingParticipantId });
    },
    [send],
  );

  return {
    admitParticipant,
    connectionStatus,
    isAdmitted,
    participantId,
    rejectParticipant,
    remoteParticipants,
    waitingParticipants,
  };
}

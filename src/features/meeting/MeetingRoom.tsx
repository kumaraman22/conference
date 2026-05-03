import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Users } from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';
import { useClock } from '../../hooks/useClock';
import { useLiveKitRoom } from '../../hooks/useLiveKitRoom';
import { useLocalMedia } from '../../hooks/useLocalMedia';
import { usePeerMeeting } from '../../hooks/usePeerMeeting';
import { createSignalingClient } from '../../services/signalingClient';
import { leaveMeeting } from '../../services/meetingService';
import type { MeetingSession, Participant } from '../../types/meeting';
import { getInitials } from '../../utils/format';
import { getInviteUrl } from '../../utils/url';
import { MeetingToolbar } from './MeetingToolbar';
import { ParticipantsPanel } from './ParticipantsPanel';
import { VideoTile } from './VideoTile';

interface MeetingRoomProps {
  session: MeetingSession;
  onLeave: () => void;
}

export function MeetingRoom({ session, onLeave }: MeetingRoomProps) {
  const clock = useClock();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(true);
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const signalingClient = useMemo(() => createSignalingClient(), []);
  const {
    videoRef,
    isMuted,
    isCameraOff,
    isSharingScreen,
    activeStream,
    permissionState,
    startCamera,
    stopAllMedia,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useLocalMedia({ onError: setError });
  const currentUserId = 'local-user';
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: currentUserId,
      displayName: session.displayName,
      isLocal: true,
      isHost: session.isHost,
      isMuted: false,
      isCameraOff: false,
    },
  ]);
  const {
    admitParticipant,
    connectionStatus,
    isAdmitted,
    participantId,
    rejectParticipant,
    remoteParticipants: signalingParticipants,
    waitingParticipants,
  } = usePeerMeeting({
    localStream: activeStream,
    session,
    onError: setError,
  });
  const {
    mediaStatus,
    remoteParticipants: mediaParticipants,
  } = useLiveKitRoom({
    isAdmitted,
    localStream: activeStream,
    participantId,
    session,
    onError: setError,
  });

  const mergedRemoteParticipants = signalingParticipants.map((participant) => {
    const mediaParticipant = mediaParticipants.find((item) => item.id === participant.id);
    return {
      ...participant,
      ...mediaParticipant,
      displayName: participant.displayName,
      isHost: participant.isHost,
      isCameraOff: mediaParticipant?.isCameraOff ?? participant.isCameraOff,
    };
  });
  const visibleParticipants = [...participants, ...mergedRemoteParticipants].slice(0, 10);
  const currentUser = visibleParticipants.find((participant) => participant.id === currentUserId);
  const isCurrentUserHost = Boolean(currentUser?.isHost);
  const gridClassName = `video-grid video-grid--count-${Math.min(visibleParticipants.length, 10)}`;

  const handleLeave = useCallback(async () => {
    stopAllMedia();
    signalingClient.disconnect();
    await leaveMeeting(session.roomId);
    onLeave();
  }, [onLeave, session.roomId, signalingClient, stopAllMedia]);

  useEffect(() => {
    signalingClient.connect(session.roomId);
    void startCamera();

    return () => {
      signalingClient.disconnect();
    };
  }, [session.roomId, signalingClient, startCamera]);

  useEffect(() => {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === currentUserId
          ? {
              ...participant,
              isMuted,
              isCameraOff: isCameraOff && !isSharingScreen,
              isSharingScreen,
            }
          : participant,
      ),
    );
  }, [isCameraOff, isMuted, isSharingScreen]);

  useEffect(() => {
    if (session.isHost && waitingParticipants.length > 0) {
      setIsParticipantsOpen(true);
    }
  }, [session.isHost, waitingParticipants.length]);

  async function copyInvite() {
    await navigator.clipboard.writeText(getInviteUrl(session.roomId));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function makeHost(participantId: string) {
    setParticipants((current) =>
      current.map((participant) => ({
        ...participant,
        isHost: participant.id === participantId,
      })),
    );
  }

  function removeParticipant(participantId: string) {
    setParticipants((current) =>
      current.filter((participant) => participant.id !== participantId),
    );
  }

  function muteParticipant(participantId: string) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === participantId
          ? { ...participant, isMuted: true }
          : participant,
      ),
    );
  }

  function stopParticipantVideo(participantId: string) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === participantId
          ? { ...participant, isCameraOff: true, isSharingScreen: false }
          : participant,
      ),
    );
  }

  function muteAllParticipants() {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === currentUserId ? participant : { ...participant, isMuted: true },
      ),
    );
  }

  function stopAllParticipantVideo() {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === currentUserId
          ? participant
          : { ...participant, isCameraOff: true, isSharingScreen: false },
      ),
    );
  }

  return (
    <main className="meeting">
      <header className="meeting-header">
        <div className="meeting-header__left">
          <div className="meeting-header__brand">
            <BrandMark compact dark />
          </div>

          <div className="meeting-header__meta">
            <span>
              Meeting: <strong>{session.roomId}</strong>
            </span>
            <button type="button" onClick={copyInvite} title="Copy invite link">
              <Link size={16} />
              <span>Invite</span>
            </button>
            {copied ? <span className="meeting-header__copied">Copied!</span> : null}
            <span className="meeting-header__status">
              {isAdmitted ? mediaStatus : connectionStatus}
            </span>
          </div>
        </div>

        <div className="meeting-header__right">
          <div className="meeting-header__online">
            <Users size={14} />
            <span>{visibleParticipants.length}/10 Online</span>
          </div>
          <span className="meeting-header__clock">{clock}</span>
        </div>
      </header>

      {error ? <div className="meeting__error">{error}</div> : null}

      {session.isHost && waitingParticipants.length > 0 ? (
        <div className="host-admission-alert">
          <strong>{waitingParticipants.length} waiting</strong>
          <span>Review join requests in the waiting room.</span>
          <button type="button" onClick={() => setIsParticipantsOpen(true)}>
            Review
          </button>
        </div>
      ) : null}

      <div
        className={
          isParticipantsOpen
            ? 'meeting-workspace meeting-workspace--panel-open'
            : 'meeting-workspace'
        }
      >
        <section className="video-stage" aria-label="Meeting participants">
          {permissionState === 'requesting' ? (
            <div className="permission-banner">
              Allow camera and microphone permission to enter smoothly.
            </div>
          ) : null}

          {!isAdmitted ? (
            <div className="waiting-room">
              <div>
                <strong>Waiting room</strong>
                <p>{connectionStatus}</p>
              </div>
            </div>
          ) : null}

          <div className={gridClassName}>
            {visibleParticipants.map((participant) => (
              <VideoTile
                key={participant.id}
                videoRef={participant.isLocal ? videoRef : undefined}
                stream={participant.stream}
                displayName={participant.displayName}
                initials={getInitials(participant.displayName)}
                isLocal={participant.isLocal}
                isHost={participant.isHost}
                isMuted={Boolean(participant.isMuted)}
                isCameraOff={Boolean(participant.isCameraOff)}
                isScreenShare={Boolean(participant.isSharingScreen)}
              />
            ))}
          </div>
        </section>

        {isParticipantsOpen ? (
          <ParticipantsPanel
            participants={participants}
            remoteParticipants={mergedRemoteParticipants}
            waitingParticipants={waitingParticipants}
            currentUserId={currentUserId}
            isMeetingLocked={isMeetingLocked}
            onAdmitParticipant={admitParticipant}
            onClose={() => setIsParticipantsOpen(false)}
            onMakeHost={makeHost}
            onRejectParticipant={rejectParticipant}
            onRemoveParticipant={removeParticipant}
            onMuteParticipant={muteParticipant}
            onStopParticipantVideo={stopParticipantVideo}
            onMuteAll={muteAllParticipants}
            onStopAllVideo={stopAllParticipantVideo}
            onToggleMeetingLock={() => setIsMeetingLocked((locked) => !locked)}
          />
        ) : null}
      </div>

      <MeetingToolbar
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isSharingScreen={isSharingScreen}
        isHost={isCurrentUserHost}
        participantCount={visibleParticipants.length}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onCopyInvite={copyInvite}
        onToggleParticipants={() => setIsParticipantsOpen((open) => !open)}
        onLeave={handleLeave}
      />
    </main>
  );
}

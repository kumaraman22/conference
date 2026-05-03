import {
  Check,
  Crown,
  Lock,
  Mic,
  MicOff,
  MoreVertical,
  ShieldCheck,
  X,
  UserMinus,
  Video,
  VideoOff,
} from 'lucide-react';
import type { Participant } from '../../types/meeting';
import { getInitials } from '../../utils/format';

interface WaitingParticipant {
  id: string;
  displayName: string;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  remoteParticipants: Participant[];
  waitingParticipants: WaitingParticipant[];
  currentUserId: string;
  isMeetingLocked: boolean;
  onAdmitParticipant: (participantId: string) => void;
  onClose: () => void;
  onMakeHost: (participantId: string) => void;
  onRejectParticipant: (participantId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  onMuteParticipant: (participantId: string) => void;
  onStopParticipantVideo: (participantId: string) => void;
  onMuteAll: () => void;
  onStopAllVideo: () => void;
  onToggleMeetingLock: () => void;
}

export function ParticipantsPanel({
  participants,
  remoteParticipants,
  waitingParticipants,
  currentUserId,
  isMeetingLocked,
  onAdmitParticipant,
  onClose,
  onMakeHost,
  onRejectParticipant,
  onRemoveParticipant,
  onMuteParticipant,
  onStopParticipantVideo,
  onMuteAll,
  onStopAllVideo,
  onToggleMeetingLock,
}: ParticipantsPanelProps) {
  const currentUser = participants.find((participant) => participant.id === currentUserId);
  const canManage = Boolean(currentUser?.isHost);
  const visibleParticipants = [...participants, ...remoteParticipants].slice(0, 10);

  return (
    <aside className="participants-panel" aria-label="Participants">
      <div className="participants-panel__header">
        <div>
          <h2>Participants</h2>
          <p>{visibleParticipants.length} of 10 in this meeting</p>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      {canManage ? (
        <div className="host-controls" aria-label="Host controls">
          <button type="button" onClick={onMuteAll}>
            <MicOff size={15} />
            Mute All
          </button>
          <button type="button" onClick={onStopAllVideo}>
            <VideoOff size={15} />
            Stop Video
          </button>
          <button
            className={isMeetingLocked ? 'host-controls__lock host-controls__lock--active' : 'host-controls__lock'}
            type="button"
            onClick={onToggleMeetingLock}
          >
            <Lock size={15} />
            {isMeetingLocked ? 'Locked' : 'Lock'}
          </button>
        </div>
      ) : null}

      <div className="participants-panel__list">
        {canManage && waitingParticipants.length > 0 ? (
          <section className="waiting-list" aria-label="Waiting room">
            <h3>Waiting Room</h3>
            {waitingParticipants.map((participant) => (
              <article className="waiting-list__row" key={participant.id}>
                <div className="participant-row__avatar">
                  {getInitials(participant.displayName)}
                </div>
                <strong>{participant.displayName}</strong>
                <div className="waiting-list__actions">
                  <button
                    type="button"
                    onClick={() => onAdmitParticipant(participant.id)}
                    title="Admit participant"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectParticipant(participant.id)}
                    title="Reject participant"
                  >
                    <X size={15} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {visibleParticipants.map((participant) => {
          const isCurrentUser = participant.id === currentUserId;
          const showManagement = canManage && !isCurrentUser;

          return (
            <article className="participant-row" key={participant.id}>
              <div className="participant-row__avatar">
                {getInitials(participant.displayName)}
              </div>

              <div className="participant-row__body">
                <div className="participant-row__name">
                  <strong>
                    {participant.displayName}
                    {isCurrentUser ? ' (You)' : ''}
                  </strong>
                  {participant.isHost ? (
                    <span>
                      <Crown size={12} />
                      Host
                    </span>
                  ) : null}
                </div>
                <div className="participant-row__devices">
                  {participant.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  {participant.isCameraOff ? <VideoOff size={14} /> : <Video size={14} />}
                  {participant.isSharingScreen ? <em>Sharing</em> : null}
                </div>
              </div>

              {showManagement ? (
                <div className="participant-row__actions">
                  <button
                    type="button"
                    onClick={() => onMuteParticipant(participant.id)}
                    title="Mute participant"
                  >
                    <MicOff size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStopParticipantVideo(participant.id)}
                    title="Stop participant video"
                  >
                    <VideoOff size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMakeHost(participant.id)}
                    title="Make host"
                  >
                    <Crown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(participant.id)}
                    title="Remove participant"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              ) : (
                participant.isHost ? (
                  <ShieldCheck className="participant-row__muted-action" size={17} />
                ) : (
                  <MoreVertical className="participant-row__muted-action" size={17} />
                )
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}

import {
  Copy,
  Mic,
  MicOff,
  MonitorUp,
  PanelRight,
  PhoneOff,
  ShieldCheck,
  Video,
  VideoOff,
} from 'lucide-react';

interface MeetingToolbarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isSharingScreen: boolean;
  isHost: boolean;
  participantCount: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onCopyInvite: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
}

export function MeetingToolbar({
  isMuted,
  isCameraOff,
  isSharingScreen,
  isHost,
  participantCount,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onCopyInvite,
  onToggleParticipants,
  onLeave,
}: MeetingToolbarProps) {
  return (
    <footer className="zoom-toolbar" aria-label="Meeting controls">
      <div className="zoom-toolbar__group">
        <button
          className={isMuted ? 'zoom-tool zoom-tool--danger' : 'zoom-tool'}
          type="button"
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff /> : <Mic />}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button
          className={isCameraOff ? 'zoom-tool zoom-tool--danger' : 'zoom-tool'}
          type="button"
          onClick={onToggleCamera}
        >
          {isCameraOff ? <VideoOff /> : <Video />}
          <span>{isCameraOff ? 'Start Video' : 'Stop Video'}</span>
        </button>
      </div>

      <div className="zoom-toolbar__group zoom-toolbar__group--center">
        <button className="zoom-tool" type="button" onClick={onCopyInvite}>
          <Copy />
          <span>Invite</span>
        </button>
        <button
          className={isSharingScreen ? 'zoom-tool zoom-tool--share-active' : 'zoom-tool'}
          type="button"
          onClick={onToggleScreenShare}
        >
          <MonitorUp />
          <span>{isSharingScreen ? 'Stop Share' : 'Share Screen'}</span>
        </button>
        <button className="zoom-tool" type="button" onClick={onToggleParticipants}>
          <PanelRight />
          <span>Participants</span>
          <strong>{participantCount}</strong>
        </button>
        {isHost ? (
          <button className="zoom-tool zoom-tool--host" type="button">
            <ShieldCheck />
            <span>Host</span>
          </button>
        ) : null}
      </div>

      <button className="zoom-leave" type="button" onClick={onLeave}>
        <PhoneOff />
        <span>Leave</span>
      </button>
    </footer>
  );
}

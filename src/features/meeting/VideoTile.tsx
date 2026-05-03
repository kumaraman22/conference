import { useEffect, useRef, type RefObject } from 'react';
import { Crown, MicOff, MonitorUp } from 'lucide-react';

interface VideoTileProps {
  videoRef?: RefObject<HTMLVideoElement>;
  stream?: MediaStream;
  displayName: string;
  initials: string;
  isHost?: boolean;
  isLocal?: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenShare: boolean;
}

export function VideoTile({
  videoRef,
  stream,
  displayName,
  initials,
  isHost = false,
  isLocal = false,
  isMuted,
  isCameraOff,
  isScreenShare,
}: VideoTileProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const resolvedVideoRef = videoRef ?? remoteVideoRef;

  useEffect(() => {
    if (!videoRef && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream ?? null;
      void remoteVideoRef.current.play().catch(() => {
        // Browser autoplay can be strict; the video still has the stream attached.
      });
    }
  }, [stream, videoRef]);

  return (
    <article className={isScreenShare ? 'video-tile video-tile--sharing' : 'video-tile'}>
      {videoRef || stream ? (
        <video
          ref={resolvedVideoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={
            isScreenShare
              ? 'video-tile__video video-tile__video--remote'
              : 'video-tile__video'
          }
        />
      ) : null}

      {isCameraOff || (!videoRef && !stream) ? (
        <div className="video-tile__camera-off">
          <div className="video-tile__avatar">{initials}</div>
          <p>{isCameraOff ? 'Camera Off' : 'Waiting to join'}</p>
        </div>
      ) : null}

      {isScreenShare ? (
        <div className="video-tile__share-pill">
          <MonitorUp size={15} />
          Sharing screen
        </div>
      ) : null}

      <div className="video-tile__badge">
        <span
          className={
            isMuted
              ? 'video-tile__status video-tile__status--muted'
              : 'video-tile__status'
          }
        />
        <strong>
          {displayName}
          {isLocal ? ' (You)' : ''}
        </strong>
        {isMuted ? <MicOff size={14} /> : null}
        {isHost ? (
          <span className="video-tile__host">
            <Crown size={12} />
            Host
          </span>
        ) : null}
      </div>
    </article>
  );
}

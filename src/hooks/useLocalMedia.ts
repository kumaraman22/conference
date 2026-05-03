import { useCallback, useEffect, useRef, useState } from 'react';

interface UseLocalMediaOptions {
  onError: (message: string) => void;
}

export function useLocalMedia({ onError }: UseLocalMediaOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const isCameraOffRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<
    'idle' | 'requesting' | 'ready' | 'denied'
  >('idle');

  const attachStream = useCallback((stream: MediaStream | null) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    setActiveStream(stream);
  }, []);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = useCallback(
    async (replace = false, forceCameraOn = false) => {
      try {
        setPermissionState('requesting');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: true,
        });

        if (replace) {
          stopStream(localStreamRef.current);
        }

        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isMutedRef.current;
        });
        if (forceCameraOn) {
          isCameraOffRef.current = false;
          setIsCameraOff(false);
        }
        stream.getVideoTracks().forEach((track) => {
          track.enabled = forceCameraOn ? true : !isCameraOffRef.current;
        });
        attachStream(stream);
        setPermissionState('ready');
        return stream;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown media permission error';
        setPermissionState('denied');
        onError(`Cannot access camera/microphone: ${message}`);
        return null;
      }
    },
    [attachStream, onError, stopStream],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      isMutedRef.current = next;
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setIsCameraOff((current) => {
      const next = !current;
      isCameraOffRef.current = next;
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const stopScreenShare = useCallback(async () => {
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setIsSharingScreen(false);
    await startCamera(true, true);
  }, [startCamera, stopStream]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
      await stopScreenShare();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      screenStreamRef.current = stream;
      attachStream(stream);
      setIsSharingScreen(true);
      isCameraOffRef.current = false;
      setIsCameraOff(false);

      stream.getVideoTracks()[0].onended = () => {
        void stopScreenShare();
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown screen sharing error';
      onError(`Screen sharing failed: ${message}`);
    }
  }, [attachStream, isSharingScreen, onError, stopScreenShare]);

  const stopAllMedia = useCallback(() => {
    stopStream(localStreamRef.current);
    stopStream(screenStreamRef.current);
    localStreamRef.current = null;
    screenStreamRef.current = null;
    attachStream(null);
    setIsSharingScreen(false);
    setPermissionState('idle');
  }, [attachStream, stopStream]);

  useEffect(() => stopAllMedia, [stopAllMedia]);

  return {
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
  };
}

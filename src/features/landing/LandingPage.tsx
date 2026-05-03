import { FormEvent, useState } from 'react';
import { Plus, Video } from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';
import { joinMeeting } from '../../services/meetingService';
import type { MeetingSession } from '../../types/meeting';
import { generateRoomId } from '../../utils/room';
import { isOwnedRoom, markRoomAsOwned } from '../../utils/roomOwnership';

interface LandingPageProps {
  initialRoom: string;
  initialHostPeerId: string;
  onJoin: (session: MeetingSession) => void;
}

export function LandingPage({
  initialHostPeerId,
  initialRoom,
  onJoin,
}: LandingPageProps) {
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState(initialRoom);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const cleanName = displayName.trim();
    const cleanRoom = roomId.trim();

    if (!cleanName || !cleanRoom) {
      setError('Please enter your name and meeting code.');
      return;
    }

    try {
      setIsJoining(true);
      const session = await joinMeeting({
        displayName: cleanName,
        hostPeerId: initialHostPeerId || undefined,
        roomId: cleanRoom,
        isHost: !initialHostPeerId && isOwnedRoom(cleanRoom),
      });
      onJoin(session);
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : 'Unable to join meeting.';
      setError(message);
    } finally {
      setIsJoining(false);
    }
  }

  function handleNewMeeting() {
    setError('');
    const newRoomId = generateRoomId();
    markRoomAsOwned(newRoomId);
    setRoomId(newRoomId);
  }

  function handleClear() {
    setDisplayName('');
    setRoomId('');
    setError('');
  }

  return (
    <main className="landing">
      <div className="landing__brand">
        <BrandMark />
      </div>

      <section className="landing__content" aria-labelledby="landing-title">
        <div className="landing__copy">
          <h1 id="landing-title">
            Secure video calls
            <span>for everyone.</span>
          </h1>
          <p>Premium video meetings. Now free and available for all.</p>

          <form className="join-form" onSubmit={handleSubmit}>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              type="text"
              placeholder="Your Name"
              required
            />

            <div className="join-form__row">
              <input
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                type="text"
                placeholder="Enter meeting code (or create new)"
              />
              <button className="join-form__join" type="submit" disabled={isJoining}>
                {isJoining ? 'Joining' : 'Join'}
              </button>
            </div>

            <div className="join-form__actions">
              <button type="button" onClick={handleNewMeeting}>
                <Plus size={20} />
                New Meeting
              </button>
              <button type="button" onClick={handleClear}>
                Clear
              </button>
            </div>

            {error ? <p className="join-form__error">{error}</p> : null}
          </form>
        </div>

        <div className="landing__preview" aria-hidden="true">
          <div className="landing__preview-shell">
            <div className="landing__preview-screen">
              <Video size={64} />
              <span>Ready to meet?</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

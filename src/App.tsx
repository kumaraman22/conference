import { useMemo, useState } from 'react';
import { AppFooter } from './components/layout/AppFooter';
import { LandingPage } from './features/landing/LandingPage';
import { MeetingRoom } from './features/meeting/MeetingRoom';
import type { MeetingSession } from './types/meeting';
import { getHostPeerFromUrl, getRoomFromUrl } from './utils/url';

export function App() {
  const initialRoom = useMemo(() => getRoomFromUrl(), []);
  const hostPeerId = useMemo(() => getHostPeerFromUrl(), []);
  const [session, setSession] = useState<MeetingSession | null>(null);

  return (
    <>
      {session ? (
        <MeetingRoom session={session} onLeave={() => setSession(null)} />
      ) : (
        <>
          <LandingPage
            initialHostPeerId={hostPeerId}
            initialRoom={initialRoom}
            onJoin={setSession}
          />
          <AppFooter />
        </>
      )}
    </>
  );
}

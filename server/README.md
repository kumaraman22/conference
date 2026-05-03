# Aao Milo Signaling Server

This server keeps meeting rooms, waiting-room state, host admission decisions,
participant presence, and LiveKit token generation.

## Local

```bash
npm run dev:signal
```

The server listens on `ws://localhost:4000`.

For scalable media, configure LiveKit:

```powershell
$env:LIVEKIT_URL='wss://your-livekit-host'
$env:LIVEKIT_API_KEY='your-livekit-api-key'
$env:LIVEKIT_API_SECRET='your-livekit-api-secret'
npm run dev:signal
```

Without these variables, waiting-room signaling still works, but SFU media will
not connect.

Run the React app with:

```bash
VITE_SIGNALING_URL=ws://localhost:4000 npm run dev
```

On Windows PowerShell:

```powershell
$env:VITE_SIGNALING_URL='ws://localhost:4000'; npm run dev
```

## Production

Deploy this Node server to a host that supports long-running WebSocket
connections, such as Render, Railway, Fly.io, a VPS, or another Node runtime.
Vercel serverless functions are not suitable for this WebSocket server.

After deployment, set the frontend environment variable:

```bash
VITE_SIGNALING_URL=wss://your-signaling-domain.example
```

Then redeploy the frontend.

Also set these on the signaling backend host:

```bash
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

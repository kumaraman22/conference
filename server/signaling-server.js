import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { AccessToken } from 'livekit-server-sdk';

const port = Number(process.env.PORT ?? 4000);
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleLiveKitToken(request, response) {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    response.writeHead(501, { ...corsHeaders, 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        message:
          'LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.',
      }),
    );
    return;
  }

  const body = await readJsonBody(request);
  const roomId = String(body.roomId ?? '');
  const participantId = String(body.participantId ?? '');
  const displayName = String(body.displayName ?? 'Participant');

  if (!roomId || !participantId) {
    response.writeHead(400, { ...corsHeaders, 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'roomId and participantId are required.' }));
    return;
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: displayName,
    ttl: '2h',
  });
  token.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  response.writeHead(200, { ...corsHeaders, 'content-type': 'application/json' });
  response.end(JSON.stringify({ token: await token.toJwt(), url: livekitUrl }));
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.url === '/health') {
    response.writeHead(200, { ...corsHeaders, 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.url === '/config') {
    response.writeHead(200, { ...corsHeaders, 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        ok: true,
        livekitConfigured: Boolean(
          process.env.LIVEKIT_URL &&
            process.env.LIVEKIT_API_KEY &&
            process.env.LIVEKIT_API_SECRET,
        ),
      }),
    );
    return;
  }

  if (request.url === '/api/livekit-token' && request.method === 'POST') {
    try {
      await handleLiveKitToken(request, response);
    } catch {
      response.writeHead(400, { ...corsHeaders, 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Invalid request body.' }));
    }
    return;
  }

  response.writeHead(200, { ...corsHeaders, 'content-type': 'application/json' });
  response.end(
    JSON.stringify({
      ok: true,
      service: 'Aao Milo signaling server',
      frontend: 'https://aao-milo.vercel.app',
      endpoints: {
        health: '/health',
        config: '/config',
        livekitToken: '/api/livekit-token',
        websocket: 'wss://conference-app-tu4u.onrender.com',
      },
    }),
  );
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      hostId: '',
      clients: new Map(),
      waiting: new Map(),
      admitted: new Set(),
    });
  }
  return rooms.get(roomId);
}

function send(client, message) {
  if (client?.socket?.readyState === 1) {
    client.socket.send(JSON.stringify(message));
  }
}

function publicParticipant(client) {
  return {
    id: client.id,
    displayName: client.displayName,
    isHost: client.isHost,
  };
}

function admittedParticipants(room) {
  return [...room.clients.values()]
    .filter((client) => client.isHost || room.admitted.has(client.id))
    .map(publicParticipant);
}

function waitingParticipants(room) {
  return [...room.waiting.values()].map((client) => ({
    id: client.id,
    displayName: client.displayName,
  }));
}

function hostClient(room) {
  return room.clients.get(room.hostId);
}

function notifyHostWaiting(room) {
  send(hostClient(room), {
    type: 'waiting-list',
    participants: waitingParticipants(room),
  });
}

function broadcastToAdmitted(room, message, exceptId = '') {
  room.clients.forEach((client) => {
    const canReceive = client.isHost || room.admitted.has(client.id);
    if (canReceive && client.id !== exceptId) {
      send(client, message);
    }
  });
}

function cleanupClient(client) {
  if (!client?.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) return;

  room.clients.delete(client.id);
  room.waiting.delete(client.id);
  room.admitted.delete(client.id);

  if (room.hostId === client.id) {
    broadcastToAdmitted(room, { type: 'host-left' });
    room.hostId = '';
    rooms.delete(client.roomId);
    return;
  }

  broadcastToAdmitted(room, {
    type: 'participant-left',
    participantId: client.id,
  });
  notifyHostWaiting(room);

  if (room.clients.size === 0) {
    rooms.delete(client.roomId);
  }
}

function handleJoin(socket, message) {
  const room = getRoom(message.roomId);
  const client = {
    id: message.participantId,
    displayName: message.displayName,
    isHost: Boolean(message.isHost),
    roomId: message.roomId,
    socket,
  };

  socket.client = client;
  room.clients.set(client.id, client);

  if (client.isHost) {
    room.hostId = client.id;
    room.admitted.add(client.id);
    send(client, {
      type: 'host-ready',
      participants: admittedParticipants(room),
      waiting: waitingParticipants(room),
    });
    notifyHostWaiting(room);
    return;
  }

  if (!room.hostId || !hostClient(room)) {
    send(client, {
      type: 'join-error',
      message: 'Host is not in the meeting yet. Ask for a fresh invite when host is online.',
    });
    return;
  }

  room.waiting.set(client.id, client);
  send(client, { type: 'waiting' });
  notifyHostWaiting(room);
}

function handleAdmit(client, message) {
  const room = rooms.get(client.roomId);
  if (!room || room.hostId !== client.id) return;

  const admitted = room.waiting.get(message.participantId);
  if (!admitted) return;

  room.waiting.delete(admitted.id);
  room.admitted.add(admitted.id);

  send(admitted, {
    type: 'admitted',
    participants: admittedParticipants(room),
  });

  broadcastToAdmitted(
    room,
    {
      type: 'participant-joined',
      participant: publicParticipant(admitted),
    },
    admitted.id,
  );
  notifyHostWaiting(room);
}

function handleReject(client, message) {
  const room = rooms.get(client.roomId);
  if (!room || room.hostId !== client.id) return;

  const rejected = room.waiting.get(message.participantId);
  if (!rejected) return;

  send(rejected, { type: 'rejected' });
  room.waiting.delete(rejected.id);
  room.clients.delete(rejected.id);
  notifyHostWaiting(room);
}

function handleSignal(client, message) {
  const room = rooms.get(client.roomId);
  if (!room) return;

  const target = room.clients.get(message.to);
  if (!target) return;

  const senderAllowed = client.isHost || room.admitted.has(client.id);
  const targetAllowed = target.isHost || room.admitted.has(target.id);
  if (!senderAllowed || !targetAllowed) return;

  send(target, {
    type: 'signal',
    from: client.id,
    signalType: message.signalType,
    payload: message.payload,
    displayName: client.displayName,
  });
}

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === 'join-room') {
      handleJoin(socket, message);
      return;
    }

    const client = socket.client;
    if (!client) return;

    if (message.type === 'admit-participant') {
      handleAdmit(client, message);
    }
    if (message.type === 'reject-participant') {
      handleReject(client, message);
    }
    if (message.type === 'signal') {
      handleSignal(client, message);
    }
  });

  socket.on('close', () => cleanupClient(socket.client));
});

server.listen(port, () => {
  console.log(`Aao Milo signaling server listening on :${port}`);
});

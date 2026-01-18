# WebRTC Signaling Server

Production-ready WebRTC signaling server for SkillSwap Hub video calling.

## Features

- ✅ WebRTC offer/answer/ICE candidate exchange
- ✅ Socket.IO for real-time communication
- ✅ Cloudflare TURN credential generation
- ✅ Google STUN servers (primary)
- ✅ Rate limiting (10 requests/second per user)
- ✅ Session-based room management
- ✅ Comprehensive logging
- ✅ Graceful shutdown handling

## Setup

### 1. Install Dependencies

```bash
cd packages/services/signaling
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Cloudflare credentials:

```bash
cp .env.example .env
```

Required variables:
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - API token with TURN access
- `CLOUDFLARE_TURN_KEY_ID` - TURN key ID

Optional variables:
- `SIGNALING_SERVER_PORT` - Server port (default: 3001)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### 3. Run Development Server

```bash
pnpm dev
```

### 4. Build for Production

```bash
pnpm build
pnpm start
```

## API Endpoints

### HTTP Endpoints

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-16T18:00:00.000Z"
}
```

#### `POST /turn/credentials`

Get ICE server configuration including TURN credentials.

**Response:**
```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    {
      "urls": [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      "username": "...",
      "credential": "..."
    }
  ],
  "timestamp": 1705428000000
}
```

### Socket.IO Events

#### Client → Server

**`join-session`**
```typescript
socket.emit('join-session', {
  sessionId: 'session_123'
});
```

**`signal:offer`**
```typescript
socket.emit('signal:offer', {
  type: 'offer',
  from: 'user_1',
  to: 'user_2',
  sessionId: 'session_123',
  data: {
    sdp: RTCSessionDescriptionInit
  }
});
```

**`signal:answer`**
```typescript
socket.emit('signal:answer', {
  type: 'answer',
  from: 'user_2',
  to: 'user_1',
  sessionId: 'session_123',
  data: {
    sdp: RTCSessionDescriptionInit
  }
});
```

**`signal:ice-candidate`**
```typescript
socket.emit('signal:ice-candidate', {
  type: 'ice-candidate',
  from: 'user_1',
  to: 'user_2',
  sessionId: 'session_123',
  data: {
    candidate: RTCIceCandidateInit
  }
});
```

#### Server → Client

**`user-joined`**
```typescript
socket.on('user-joined', (data) => {
  console.log(`User ${data.userId} joined`);
});
```

**`user-left`**
```typescript
socket.on('user-left', (data) => {
  console.log(`User ${data.userId} left`);
});
```

**`signal:offer`**
**`signal:answer`**
**`signal:ice-candidate`**

Forwarded signaling messages from other participants.

## Connection Flow

1. Client connects to Socket.IO with authentication:
```typescript
const socket = io('http://localhost:3001', {
  auth: {
    userId: 'user_123',
    sessionId: 'session_456',
    // token: 'firebase_id_token' // TODO: Add in production
  }
});
```

2. Client joins session room:
```typescript
socket.emit('join-session', { sessionId: 'session_456' });
```

3. Caller creates offer and sends via signaling:
```typescript
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

socket.emit('signal:offer', {
  type: 'offer',
  to: receiverId,
  sessionId: sessionId,
  data: { sdp: offer }
});
```

4. Receiver gets offer, creates answer:
```typescript
socket.on('signal:offer', async (message) => {
  await peerConnection.setRemoteDescription(message.data.sdp);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  socket.emit('signal:answer', {
    type: 'answer',
    to: message.from,
    sessionId: sessionId,
    data: { sdp: answer }
  });
});
```

5. ICE candidates exchanged automatically:
```typescript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('signal:ice-candidate', {
      type: 'ice-candidate',
      to: otherUserId,
      sessionId: sessionId,
      data: { candidate: event.candidate }
    });
  }
};
```

## Security

### Current Implementation

- ✅ Rate limiting (10 requests/second)
- ✅ CORS protection
- ✅ Session-based isolation
- ⚠️ Basic authentication (userId in handshake)

### TODO for Production

- [ ] Firebase ID token validation
- [ ] Verify user is session participant (query Convex)
- [ ] Encrypt signaling messages
- [ ] Add request signing
- [ ] Implement connection timeouts

## Monitoring

All signaling events are logged with Winston:

```
[INFO] User connected: user_123 (socket: abc123)
[INFO] User user_123 joined session session_456
[INFO] [Offer] From user_123 to user_456 in session session_456
[INFO] [ICE] From user_123 in session session_456 { candidateType: 'host', protocol: 'udp' }
[INFO] [Connection State] User user_123: connected
[INFO] User disconnected: user_123 (socket: abc123)
```

## Troubleshooting

### TURN credentials not working

1. Verify Cloudflare account has TURN enabled
2. Check API token has correct permissions
3. Ensure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
4. Check server logs for Cloudflare API errors

### Connection fails

1. Check CORS configuration (`ALLOWED_ORIGINS`)
2. Verify client is sending correct `userId` and `sessionId` in auth
3. Check rate limiting (10 req/sec per user)
4. Review server logs for errors

### ICE connection fails

1. Verify STUN servers are accessible
2. Check if TURN credentials are being generated
3. Test with `chrome://webrtc-internals` to see ICE candidates
4. Ensure firewall allows WebRTC traffic

## License

MIT

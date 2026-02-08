import http from 'http';
import { WebSocketServer } from 'ws';
import { createRoomManager } from './matchmaking.js';
import { createGame } from './world.js';
import { serveStatic } from './static.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  serveStatic(req, res, new URL('../public/', import.meta.url));
});

const wss = new WebSocketServer({ server });
const roomManager = createRoomManager({
  maxPlayersPerRoom: 24,
  createGame
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  let session = null;

  ws.on('message', (raw) => {
    let msg = null;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join') {
      if (session) return;
      session = roomManager.join(ws, msg.payload || {});
      return;
    }

    if (!session) return;

    if (msg.type === 'input') {
      session.handleInput(msg.payload || {});
    } else if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  });

  ws.on('close', () => {
    if (session) {
      session.leave();
      session = null;
    }
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, () => {
  console.log(`Slither clone server listening on http://localhost:${PORT}`);
});

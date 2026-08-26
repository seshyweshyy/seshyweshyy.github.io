// server.js
import http from 'http';
import { WebSocketServer } from 'ws';
import { serveStatic } from './static.js';

const PORT = process.env.PORT || 8080;
const WIDTH = 800;
const HEIGHT = 600;
const FOOD_COUNT = 30;

const snakes = {};
let food = Array.from({ length: FOOD_COUNT }, () => createFood());

function createFood(color = 'red') {
  return { x: Math.random() * WIDTH, y: Math.random() * HEIGHT, r: 5, color };
}

function spawnSnake(id) {
  return {
    id,
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    tail: [],
    color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 55%)`,
    score: 0,
    length: 30,
    alive: true
  };
}

const server = http.createServer((req, res) => {
  serveStatic(req, res, new URL('./', import.meta.url));
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  let id = null;

  ws.on('message', data => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (!msg || typeof msg.id !== 'string') return;
    id = msg.id;

    if (msg.type === 'move') {
      if (typeof msg.x !== 'number' || typeof msg.y !== 'number') return;
      let snake = snakes[id];
      if (!snake) {
        snake = snakes[id] = spawnSnake(id);
      }
      if (!snake.alive) return;

      snake.tail.unshift({ x: snake.x, y: snake.y });
      if (snake.tail.length > snake.length) snake.tail.pop();
      snake.x = Math.max(0, Math.min(WIDTH, msg.x));
      snake.y = Math.max(0, Math.min(HEIGHT, msg.y));

      checkFoodCollision(snake);
      checkSnakeCollision(snake);
    } else if (msg.type === 'respawn') {
      snakes[id] = spawnSnake(id);
    } else {
      return;
    }

    broadcast({ type: 'state', snakes, food });
  });

  ws.on('close', () => {
    if (id && snakes[id]) {
      delete snakes[id];
      broadcast({ type: 'state', snakes, food });
    }
  });
});

function checkFoodCollision(snake) {
  for (let i = 0; i < food.length; i++) {
    const f = food[i];
    const dx = snake.x - f.x;
    const dy = snake.y - f.y;
    if (Math.sqrt(dx * dx + dy * dy) < 12) {
      snake.length += 5;
      snake.score += 1;
      food.splice(i, 1);
      food.push(createFood());
      break;
    }
  }
}

function checkSnakeCollision(snake) {
  for (const [id, other] of Object.entries(snakes)) {
    if (id === snake.id || !other.alive) continue;
    for (const seg of other.tail) {
      const dx = snake.x - seg.x;
      const dy = snake.y - seg.y;
      if (Math.sqrt(dx * dx + dy * dy) < 8) {
        snake.alive = false;
        for (let i = 0; i < snake.tail.length; i += 5) {
          food.push({ x: snake.tail[i].x, y: snake.tail[i].y, r: 5, color: 'gold' });
        }
        return;
      }
    }
  }
}

function broadcast(obj) {
  const str = JSON.stringify(obj);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(str);
  });
}

server.listen(PORT, () => {
  console.log(`Snake online server listening on http://localhost:${PORT}`);
});

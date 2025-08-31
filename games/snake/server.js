// server.js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const snakes = {};
let food = Array.from({ length: 30 }, () => createFood(800, 600));

function createFood(width, height) {
  return { x: Math.random() * width, y: Math.random() * height, r: 5, color: 'red' };
}

wss.on('connection', ws => {
  let id = null;

  ws.on('message', data => {
    const msg = JSON.parse(data);
    if (!id) id = msg.id;

    if (msg.type === 'move') {
      if (!snakes[msg.id]) {
        snakes[msg.id] = { id: msg.id, x: msg.x, y: msg.y, tail: [], color: 'orange', score: 0, length: 30, alive: true };
      } else {
        let snake = snakes[msg.id];
        if (!snake.alive) return;

        // Update snake
        snake.tail.unshift({ x: snake.x, y: snake.y });
        if (snake.tail.length > snake.length) snake.tail.pop();
        snake.x = msg.x;
        snake.y = msg.y;

        checkFoodCollision(snake);
        checkSnakeCollision(snake);
      }
    }

    broadcast({ type: 'state', snakes, food });
  });

  ws.on('close', () => {
    if (id) delete snakes[id];
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
      food.push(createFood(800, 600));
      break;
    }
  }
}

function checkSnakeCollision(snake) {
  for (let [id, other] of Object.entries(snakes)) {
    if (id === snake.id || !other.alive) continue;
    for (let seg of other.tail) {
      const dx = snake.x - seg.x;
      const dy = snake.y - seg.y;
      if (Math.sqrt(dx * dx + dy * dy) < 8) {
        snake.alive = false;
        // Drop food on death
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

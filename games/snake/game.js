// game.js

function createSnake(x, y, color = 'lime') {
  return { x, y, vx: 0, vy: 0, angle: 0, tail: [], color, alive: true, score: 0 };
}

function drawSnake(ctx, snake) {
  ctx.fillStyle = snake.color;
  ctx.beginPath();
  ctx.arc(snake.x, snake.y, 8, 0, Math.PI * 2);
  ctx.fill();
  for (let t of snake.tail) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateSnake(snake, targetX, targetY) {
  const dx = targetX - snake.x;
  const dy = targetY - snake.y;
  const ang = Math.atan2(dy, dx);
  snake.angle = ang;
  const speed = 2.5;
  snake.vx = Math.cos(ang) * speed;
  snake.vy = Math.sin(ang) * speed;
  snake.tail.unshift({ x: snake.x, y: snake.y });
  if (snake.tail.length > 30) snake.tail.pop();
  snake.x += snake.vx;
  snake.y += snake.vy;
}

export function startSoloGame(canvas) {
  const ctx = canvas.getContext('2d');
  const snake = createSnake(canvas.width / 2, canvas.height / 2);

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  let mouseX = canvas.width / 2;
  let mouseY = canvas.height / 2;

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateSnake(snake, mouseX, mouseY);
    drawSnake(ctx, snake);
    requestAnimationFrame(loop);
  }
  loop();
}

export function startOnlineGame(canvas, net) {
  const ctx = canvas.getContext('2d');
  const myId = net.id;
  let snakes = {};
  let dead = false;
  let status = 'connecting';

  function toCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  canvas.addEventListener('mousemove', e => {
    if (dead) return;
    const { x, y } = toCanvasCoords(e);
    net.send({ type: 'move', x, y });
  });

  canvas.addEventListener('click', () => {
    if (dead) net.send({ type: 'respawn' });
  });

  net.onStatus(s => { status = s; });

  net.onMessage(msg => {
    if (msg.type === 'state') {
      snakes = msg.snakes;
      dead = snakes[myId] ? !snakes[myId].alive : false;
    }
  });

  function drawOverlay(text) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of Object.values(snakes)) {
      drawSnake(ctx, s);
      if (s.id === myId) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (status !== 'open') {
      drawOverlay('Connecting to server…');
    } else if (dead) {
      drawOverlay('You died — click to respawn');
    }

    requestAnimationFrame(loop);
  }
  loop();
}

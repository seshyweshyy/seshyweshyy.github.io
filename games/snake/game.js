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
  const snakes = {};
  const myId = net.id;

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    net.send({ type: 'move', x: mx, y: my });
  });

  net.onMessage(msg => {
    if (msg.type === 'state') {
      for (let [id, s] of Object.entries(msg.snakes)) {
        snakes[id] = s;
      }
    }
  });

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let s of Object.values(snakes)) {
      drawSnake(ctx, s);
    }
    requestAnimationFrame(loop);
  }
  loop();
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const statusEl = document.getElementById('status');
const leaderboardEl = document.getElementById('leaderboard');
const leaveBtn = document.getElementById('leaveBtn');
const deathScreen = document.getElementById('deathScreen');
const returnBtn = document.getElementById('returnBtn');

const nameInput = document.getElementById('nameInput');
const skinInput = document.getElementById('skinInput');
const playOnline = document.getElementById('playOnline');
const playOffline = document.getElementById('playOffline');

const WORLD_SIZE = 5000;
const SEGMENT_SPACING = 8;
const SNAKE_RADIUS = 10;
const PELLET_RADIUS = 6;
const PICKUP_RANGE = 18;
const SUCK_RANGE = 60;
const SUCK_STRENGTH = 0.75;

const PELLET_COLORS = [
  '#ff4d4d', '#ffd166', '#4cc9f0', '#a0c4ff', '#c77dff',
  '#80ff72', '#fca311', '#b8f2e6', '#f72585', '#90e0ef'
];

let state = {
  mode: null,
  ws: null,
  world: { worldSize: WORLD_SIZE },
  playerId: null,
  snakes: [],
  pellets: [],
  leaderboard: [],
  angle: 0,
  boost: false,
  deathAt: null
};

const skins = {
  classic: ['#6ef3ff', '#3bd1ff'],
  ember: ['#ff7b2c', '#ffb55c'],
  mint: ['#2de2b3', '#88f5d6'],
  neon: ['#b26bff', '#ff6bf1'],
  forest: ['#61d836', '#a4f47a']
};

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

window.addEventListener('resize', () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  resize();
});

resize();

function setUIPlaying(playing) {
  menu.hidden = playing;
  hud.hidden = !playing;
  deathScreen.hidden = true;
}

function connectOnline() {
  state.mode = 'online';
  setUIPlaying(true);
  statusEl.textContent = 'Connecting...';

  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  state.ws = ws;

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({
      type: 'join',
      payload: { name: nameInput.value || 'Player', skin: skinInput.value }
    }));
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'init') {
      state.playerId = msg.payload.id;
      state.world = msg.payload.world;
      statusEl.textContent = 'Online';
    }
    if (msg.type === 'state') {
      state.snakes = msg.payload.snakes;
      state.pellets = msg.payload.pellets;
      state.leaderboard = msg.payload.leaderboard;
    }
  });

  ws.addEventListener('close', () => {
    statusEl.textContent = 'Disconnected';
  });
}

function startOffline() {
  state.mode = 'offline';
  setUIPlaying(true);
  statusEl.textContent = 'Offline';
  state.playerId = 'offline-you';
  state.world = { worldSize: WORLD_SIZE };

  const local = createLocalGame();
  local.start();
  state.local = local;
}

function leaveGame() {
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  if (state.local) {
    state.local.stop();
    state.local = null;
  }
  state = {
    ...state,
    mode: null,
    playerId: null,
    snakes: [],
    pellets: [],
    leaderboard: [],
    deathAt: null
  };
  setUIPlaying(false);
}

playOnline.addEventListener('click', connectOnline);
playOffline.addEventListener('click', startOffline);
leaveBtn.addEventListener('click', leaveGame);
returnBtn.addEventListener('click', leaveGame);

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  state.angle = Math.atan2(my - cy, mx - cx);
});

window.addEventListener('mousedown', () => state.boost = true);
window.addEventListener('mouseup', () => state.boost = false);
window.addEventListener('keydown', (e) => { if (e.code === 'Space') state.boost = true; });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') state.boost = false; });

function sendInput() {
  if (state.mode === 'online' && state.ws && state.ws.readyState === 1) {
    state.ws.send(JSON.stringify({
      type: 'input',
      payload: { angle: state.angle, boost: state.boost }
    }));
  }
  if (state.mode === 'offline' && state.local) {
    state.local.setInput({ angle: state.angle, boost: state.boost });
  }
}

setInterval(sendInput, 50);

function getPlayer() {
  return state.snakes.find((s) => s.id === state.playerId);
}

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const player = getPlayer();
  if (!player) return;
  if (!player.alive) {
    if (!state.deathAt) state.deathAt = performance.now();
    if (performance.now() - state.deathAt > 1800) {
      deathScreen.hidden = false;
      return;
    }
  } else {
    state.deathAt = null;
    deathScreen.hidden = true;
  }

  const viewWidth = canvas.getBoundingClientRect().width;
  const viewHeight = canvas.getBoundingClientRect().height;

  const offsetX = player.points[0].x - viewWidth / 2;
  const offsetY = player.points[0].y - viewHeight / 2;

  drawGrid(offsetX, offsetY, viewWidth, viewHeight);

  for (const pellet of state.pellets) {
    drawPellet(pellet, offsetX, offsetY);
  }

  for (const snake of state.snakes) {
    drawSnake(snake, offsetX, offsetY);
  }

  renderLeaderboard();
  drawMinimap(viewWidth, viewHeight);
}

function drawGrid(offsetX, offsetY, width, height) {
  ctx.save();
  ctx.fillStyle = '#0b111a';
  ctx.fillRect(0, 0, width, height);

  const size = 36;
  const w = size * 2;
  const h = Math.sqrt(3) * size;
  const horiz = w * 0.75;

  const startX = Math.floor(offsetX / horiz) * horiz - horiz;
  const startY = Math.floor(offsetY / h) * h - h;

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(18, 26, 40, 0.9)';

  for (let x = startX; x < offsetX + width + w; x += horiz) {
    const col = Math.round(x / horiz);
    for (let y = startY; y < offsetY + height + h; y += h) {
      const cx = x - offsetX;
      const cy = y - offsetY + (col % 2 === 0 ? 0 : h / 2);
      drawHex(cx, cy, size);
    }
  }

  ctx.restore();
}

function drawPellet(pellet, ox, oy) {
  const color = pellet.color || PELLET_COLORS[0];
  const t = performance.now() / 1000;
  const seed = hashString(pellet.id || '') * 0.0001;
  const drift = 3.0;
  const speed = 1.5;
  const wobbleX = Math.sin(t * speed + seed) * drift;
  const wobbleY = Math.cos(t * speed + seed * 1.7) * drift;
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.4 + seed);

  const baseX = pellet.x + wobbleX;
  const baseY = pellet.y + wobbleY;
  const attraction = getPelletAttraction(baseX, baseY);
  const x = baseX + attraction.x - ox;
  const y = baseY + attraction.y - oy;

  ctx.save();
  ctx.shadowBlur = 10 + 8 * pulse;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, PELLET_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnake(snake, ox, oy) {
  const colors = snake.colors || skins[snake.skin] || skins.classic;
  const head = snake.points[0];
  const hx = head.x - ox;
  const hy = head.y - oy;

  if (snake.boost) {
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
    ctx.save();
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = SNAKE_RADIUS * 2.8;
    ctx.globalAlpha = 0.35 * pulse;
    ctx.shadowBlur = 25;
    ctx.shadowColor = colors[1];
    ctx.beginPath();
    snake.points.forEach((p, i) => {
      const x = p.x - ox;
      const y = p.y - oy;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = SNAKE_RADIUS * 2;

  ctx.beginPath();
  snake.points.forEach((p, i) => {
    const x = p.x - ox;
    const y = p.y - oy;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = colors[1];
  ctx.arc(hx, hy, SNAKE_RADIUS * 0.9, 0, Math.PI * 2);
  ctx.fill();

  drawEyes(hx, hy, snake);

  if (snake.id === getLeaderId()) {
    drawCrown(hx, hy);
  }
}

function renderLeaderboard() {
  const rankColors = ['#ff6b6b', '#ffd166', '#ff9f1c', '#f4a261', '#c77dff'];
  const lines = state.leaderboard
    .map((entry, i) => {
      const color = rankColors[i] || '#9fb3c8';
      return `<div class="lb-entry"><span class="lb-rank" style="color:${color}">#${i + 1}</span><span class="lb-name" style="color:${color}">${entry.name}</span><span class="lb-score" style="color:${color}">${entry.score}</span></div>`;
    })
    .join('');
  leaderboardEl.innerHTML = `<div class="lb-title">Leaderboard</div>${lines || '<div class="lb-empty">No players yet</div>'}`;
}

function drawMinimap(viewWidth, viewHeight) {
  const size = 160;
  const padding = 20;
  const x = viewWidth - size - padding;
  const y = viewHeight - size - padding;
  const scale = size / WORLD_SIZE;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(10, 14, 24, 0.85)';
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 10);
  ctx.fill();
  ctx.stroke();

  for (const snake of state.snakes) {
    if (!snake.points || snake.points.length === 0) continue;
    const head = snake.points[0];
    const mx = x + head.x * scale;
    const my = y + head.y * scale;
    ctx.fillStyle = snake.id === state.playerId ? '#4ff2c8' : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function getLeaderId() {
  return state.leaderboard.length ? state.leaderboard[0].id : null;
}

function drawCrown(x, y) {
  ctx.save();
  ctx.translate(x, y - SNAKE_RADIUS - 8);
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#d89f2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.lineTo(-6, -2);
  ctx.lineTo(-2, 4);
  ctx.lineTo(0, -6);
  ctx.lineTo(2, 4);
  ctx.lineTo(6, -2);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEyes(x, y, snake) {
  const headRadius = SNAKE_RADIUS * 0.9;
  const eyeRadius = headRadius * 0.35 * 1.3;
  const pupilRadius = eyeRadius * 0.45;
  const look = getLookVector(snake);
  const dirX = look.x;
  const dirY = look.y;
  const perpX = -dirY;
  const perpY = dirX;

  const eyeOffsetForward = headRadius * 0.35;
  const eyeOffsetSide = headRadius * 0.35;

  const leftEye = {
    x: x + dirX * eyeOffsetForward + perpX * eyeOffsetSide,
    y: y + dirY * eyeOffsetForward + perpY * eyeOffsetSide
  };
  const rightEye = {
    x: x + dirX * eyeOffsetForward - perpX * eyeOffsetSide,
    y: y + dirY * eyeOffsetForward - perpY * eyeOffsetSide
  };

  const maxPupilOffset = eyeRadius * 0.5;
  const pupilOffsetX = dirX * maxPupilOffset;
  const pupilOffsetY = dirY * maxPupilOffset;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
  ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b0f1a';
  ctx.beginPath();
  ctx.arc(leftEye.x + pupilOffsetX, leftEye.y + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
  ctx.arc(rightEye.x + pupilOffsetX, rightEye.y + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
}

function getLookVector(snake) {
  let angle = 0;
  if (snake.id === state.playerId) {
    angle = state.angle;
  } else if (snake.points && snake.points.length > 1) {
    const head = snake.points[0];
    const neck = snake.points[1];
    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    if (dx !== 0 || dy !== 0) {
      angle = Math.atan2(dy, dx);
    }
  }
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function createLocalGame() {
  const snakes = [];
  const pellets = [];
  let handle = null;
  const you = createSnake('offline-you', nameInput.value || 'Player', skinInput.value);
  snakes.push(you);

  const bots = Array.from({ length: 6 }, (_, i) => createSnake(`bot-${i}`, `Bot ${i + 1}`, 'forest'));
  snakes.push(...bots);

  function start() {
    handle = setInterval(tick, 50);
    ensurePellets();
  }

  function stop() {
    if (handle) clearInterval(handle);
  }

  function setInput(input) {
    if (typeof input.angle === 'number') you.targetAngle = input.angle;
    if (typeof input.boost === 'boolean') you.boost = input.boost;
  }

  function tick() {
    for (const snake of snakes) moveSnake(snake);
    for (const snake of snakes) {
      checkPellets(snake);
      checkSnakeCollision(snake);
    }
    ensurePellets();

    state.snakes = snakes.map(serializeSnake);
    state.pellets = pellets;
    state.leaderboard = buildLeaderboard();
  }

  function moveSnake(snake) {
    if (!snake.alive) return;
    if (snake.isBot) {
      if (Math.random() < 0.03) {
        snake.targetAngle = snake.angle + (Math.random() - 0.5) * 1.2;
      }
    }
    if (typeof snake.targetAngle === 'number') {
      snake.angle = turnTowards(snake.angle, snake.targetAngle, 0.2);
    }
    const speed = snake.boost ? 6.5 : 4;
    const head = snake.points[0];
    const nx = clamp(head.x + Math.cos(snake.angle) * speed, 0, WORLD_SIZE);
    const ny = clamp(head.y + Math.sin(snake.angle) * speed, 0, WORLD_SIZE);
    snake.points.unshift({ x: nx, y: ny });
    while (snake.points.length > snake.segments) snake.points.pop();

    if (snake.boost && snake.segments > 5) {
      snake.boostDrain = (snake.boostDrain || 0) + 1;
      if (snake.boostDrain >= 6) {
        snake.boostDrain = 0;
        const tail = snake.points[snake.points.length - 1];
        if (tail) pellets.push({ id: Math.random().toString(36).slice(2, 10), x: tail.x, y: tail.y });
        snake.segments -= 1;
      }
    } else {
      snake.boostDrain = 0;
    }
  }

  function checkPellets(snake) {
    const head = snake.points[0];
    for (let i = pellets.length - 1; i >= 0; i--) {
      if (dist(head, pellets[i]) < SNAKE_RADIUS + PELLET_RADIUS + PICKUP_RANGE) {
        pellets.splice(i, 1);
        snake.segments += 1;
        snake.score += 1;
        break;
      }
    }
  }

  function checkSnakeCollision(snake) {
    if (!snake.alive) return;
    const head = snake.points[0];
    for (const other of snakes) {
      if (!other.alive) continue;
      for (let i = 0; i < other.points.length; i++) {
        if (other.id === snake.id && i < 5) continue;
        if (dist(head, other.points[i]) < SNAKE_RADIUS) {
          snake.alive = false;
          dropPellets(snake);
          snake.points = snake.points.slice(0, 3);
          snake.segments = 3;
          return;
        }
      }
    }
  }

  function ensurePellets() {
    while (pellets.length < 500) {
      pellets.push({
        id: Math.random().toString(36).slice(2, 10),
        ...randomPoint(),
        color: PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)]
      });
    }
  }

  function dropPellets(snake) {
    for (let i = 0; i < snake.points.length; i += 2) {
      pellets.push({
        id: Math.random().toString(36).slice(2, 10),
        x: snake.points[i].x,
        y: snake.points[i].y,
        color: PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)]
      });
    }
  }

  function buildLeaderboard() {
    return snakes
      .filter((s) => s.alive)
      .sort((a, b) => b.segments - a.segments)
      .slice(0, 10)
      .map((s) => ({ id: s.id, name: s.name, score: s.segments }));
  }

  return { start, stop, setInput };
}

function createSnake(id, name, skin) {
  const point = randomPoint();
  return {
    id,
    name,
    skin,
    colors: skins[skin] || skins.classic,
    points: [point],
    angle: Math.random() * Math.PI * 2,
    targetAngle: Math.random() * Math.PI * 2,
    boost: false,
    boostDrain: 0,
    segments: 15,
    score: 0,
    alive: true,
    isBot: id.startsWith('bot-')
  };
}

function serializeSnake(s) {
  return {
    id: s.id,
    name: s.name,
    skin: s.skin,
    colors: s.colors,
    points: s.points,
    alive: s.alive,
    boost: s.boost,
    score: s.segments
  };
}

function randomPoint() {
  return { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
}

function drawHex(cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function turnTowards(current, target, maxDelta) {
  let delta = normalizeAngle(target - current);
  if (Math.abs(delta) > maxDelta) {
    delta = Math.sign(delta) * maxDelta;
  }
  return normalizeAngle(current + delta);
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getPelletAttraction(px, py) {
  let closest = null;
  let closestDist = Infinity;
  for (const snake of state.snakes) {
    if (!snake.alive || !snake.points || snake.points.length === 0) continue;
    const head = snake.points[0];
    const dx = head.x - px;
    const dy = head.y - py;
    const dist = Math.hypot(dx, dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = { dx, dy };
    }
  }

  if (!closest || closestDist > SUCK_RANGE) return { x: 0, y: 0 };
  const t = 1 - closestDist / SUCK_RANGE;
  const pull = Math.min(1, t * t * SUCK_STRENGTH);
  return { x: closest.dx * pull, y: closest.dy * pull };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

draw();

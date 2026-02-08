const TICK_MS = 50; // 20 fps
const WORLD_SIZE = 5000;
const BASE_SEGMENTS = 15;
const SEGMENT_SPACING = 8;
const SNAKE_RADIUS = 10;
const PELLET_RADIUS = 6;
const MAX_PELLETS = 700;
const NORMAL_SPEED = 4;
const BOOST_SPEED = 6.5;
const MIN_SEGMENTS = 5;
const BOOST_DRAIN_TICKS = 6;
const MAX_TURN_RATE = 0.2;
const PICKUP_RANGE = 18;

const SKINS = {
  classic: ['#6ef3ff', '#3bd1ff'],
  ember: ['#ff7b2c', '#ffb55c'],
  mint: ['#2de2b3', '#88f5d6'],
  neon: ['#b26bff', '#ff6bf1'],
  forest: ['#61d836', '#a4f47a']
};

const PELLET_COLORS = [
  '#ff4d4d', '#ffd166', '#4cc9f0', '#a0c4ff', '#c77dff',
  '#80ff72', '#fca311', '#b8f2e6', '#f72585', '#90e0ef'
];

export function createGame({ roomId }) {
  const players = new Map();
  const pellets = new Map();
  let tickHandle = null;
  let onTick = null;

  function startIfNeeded(cb) {
    if (!tickHandle) {
      onTick = cb;
      tickHandle = setInterval(tick, TICK_MS);
    }
  }

  function stop() {
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = null;
  }

  function addPlayer(id, name, skin) {
    const spawn = randomPoint();
    const colors = SKINS[skin] || SKINS.classic;
    const snake = {
      id,
      name,
      skin,
      colors,
      points: [{ x: spawn.x, y: spawn.y }],
      angle: Math.random() * Math.PI * 2,
      targetAngle: Math.random() * Math.PI * 2,
      boost: false,
      boostDrain: 0,
      segments: BASE_SEGMENTS,
      alive: true,
      score: 0
    };
    players.set(id, snake);
    return snake;
  }

  function removePlayer(id) {
    const snake = players.get(id);
    if (!snake) return;
    dropPelletsFromSnake(snake);
    players.delete(id);
  }

  function setInput(id, input) {
    const snake = players.get(id);
    if (!snake || !snake.alive) return;
    if (typeof input.angle === 'number') snake.targetAngle = input.angle;
    if (typeof input.boost === 'boolean') snake.boost = input.boost;
  }

  function getWorldSnapshot() {
    return {
      roomId,
      worldSize: WORLD_SIZE
    };
  }

  function getPlayerSnapshot(id) {
    const snake = players.get(id);
    if (!snake) return null;
    return serializeSnake(snake);
  }

  function tick() {
    ensurePellets();

    for (const snake of players.values()) {
      if (!snake.alive) continue;
      moveSnake(snake);
    }

    for (const snake of players.values()) {
      if (!snake.alive) continue;
      checkPelletCollisions(snake);
      checkSnakeCollisions(snake);
    }

    const snapshot = {
      snakes: Array.from(players.values()).map(serializeSnake),
      pellets: Array.from(pellets.values()),
      leaderboard: buildLeaderboard()
    };

    if (onTick) onTick(snapshot);
  }

  function moveSnake(snake) {
    if (typeof snake.targetAngle === 'number') {
      snake.angle = turnTowards(snake.angle, snake.targetAngle, MAX_TURN_RATE);
    }
    const speed = snake.boost ? BOOST_SPEED : NORMAL_SPEED;
    const head = snake.points[0];
    const nx = clamp(head.x + Math.cos(snake.angle) * speed, 0, WORLD_SIZE);
    const ny = clamp(head.y + Math.sin(snake.angle) * speed, 0, WORLD_SIZE);

    snake.points.unshift({ x: nx, y: ny });

    const maxPoints = snake.segments;
    while (snake.points.length > maxPoints) snake.points.pop();

    if (snake.boost && snake.segments > MIN_SEGMENTS) {
      snake.boostDrain += 1;
      if (snake.boostDrain >= BOOST_DRAIN_TICKS) {
        snake.boostDrain = 0;
        const tail = snake.points[snake.points.length - 1];
        if (tail) spawnPellet(tail.x, tail.y);
        snake.segments -= 1;
      }
    } else {
      snake.boostDrain = 0;
    }
  }

  function checkPelletCollisions(snake) {
    const head = snake.points[0];
    for (const pellet of pellets.values()) {
      if (dist(head, pellet) < SNAKE_RADIUS + PELLET_RADIUS + PICKUP_RANGE) {
        pellets.delete(pellet.id);
        snake.segments += 1;
        snake.score += 1;
        break;
      }
    }
  }

  function checkSnakeCollisions(snake) {
    const head = snake.points[0];
    for (const other of players.values()) {
      if (!other.alive) continue;
      const points = other.points;
      for (let i = 0; i < points.length; i++) {
        if (other.id === snake.id && i < 5) continue;
        if (dist(head, points[i]) < SNAKE_RADIUS) {
          killSnake(snake);
          return;
        }
      }
    }
  }

  function killSnake(snake) {
    if (!snake.alive) return;
    snake.alive = false;
    dropPelletsFromSnake(snake);
    snake.points = snake.points.slice(0, 3);
    snake.segments = 3;
  }

  function dropPelletsFromSnake(snake) {
    for (let i = 0; i < snake.points.length; i += 2) {
      const p = snake.points[i];
      spawnPellet(p.x, p.y);
    }
  }

  function ensurePellets() {
    while (pellets.size < MAX_PELLETS) {
      spawnPellet();
    }
  }

  function spawnPellet(x, y) {
    const point = x == null ? randomPoint() : { x, y };
    const color = PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)];
    const pellet = { id: cryptoRandomId(), x: point.x, y: point.y, color };
    pellets.set(pellet.id, pellet);
  }

  function buildLeaderboard() {
    return Array.from(players.values())
      .filter((s) => s.alive)
      .sort((a, b) => b.segments - a.segments)
      .slice(0, 10)
      .map((s) => ({ id: s.id, name: s.name, score: s.segments }));
  }

  return {
    startIfNeeded,
    stop,
    addPlayer,
    removePlayer,
    setInput,
    getWorldSnapshot,
    getPlayerSnapshot
  };
}

function serializeSnake(snake) {
  return {
    id: snake.id,
    name: snake.name,
    skin: snake.skin,
    colors: snake.colors,
    points: snake.points,
    alive: snake.alive,
    boost: snake.boost,
    score: snake.segments
  };
}

function randomPoint() {
  return {
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE
  };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
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

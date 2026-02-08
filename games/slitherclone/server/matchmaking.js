export function createRoomManager({ maxPlayersPerRoom, createGame }) {
  const rooms = new Map();

  function getOpenRoom() {
    for (const room of rooms.values()) {
      if (room.players.size < maxPlayersPerRoom) return room;
    }
    return null;
  }

  function createRoom() {
    const id = cryptoRandomId();
    const game = createGame({ roomId: id });
    const room = {
      id,
      game,
      players: new Map(),
    };
    rooms.set(id, room);
    return room;
  }

  function join(ws, { name = 'Player', skin = 'classic' } = {}) {
    let room = getOpenRoom();
    if (!room) room = createRoom();

    const playerId = cryptoRandomId();
    const player = room.game.addPlayer(playerId, name, skin);
    room.players.set(playerId, { ws, player });

    ws.send(JSON.stringify({
      type: 'init',
      payload: {
        id: playerId,
        roomId: room.id,
        world: room.game.getWorldSnapshot(),
        you: room.game.getPlayerSnapshot(playerId)
      }
    }));

    const session = {
      handleInput: (input) => {
        room.game.setInput(playerId, input);
      },
      leave: () => {
        room.game.removePlayer(playerId);
        room.players.delete(playerId);
        if (room.players.size === 0) {
          room.game.stop();
          rooms.delete(room.id);
        }
      }
    };

    room.game.startIfNeeded((snapshot) => {
      for (const [pid, client] of room.players.entries()) {
        if (client.ws.readyState === 1) {
          client.ws.send(JSON.stringify({ type: 'state', payload: snapshot }));
        }
      }
    });

    return session;
  }

  return { join };
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

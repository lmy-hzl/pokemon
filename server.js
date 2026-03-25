'use strict';

const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const path = require('path');
const { POKEMON_LIST, calculateDamage, deepClonePokemon } = require('./src/pokemon-data');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// rooms: { roomId: { players: [socket1, socket2], state: BattleState } }
const rooms = new Map();

// Probability that a move's secondary effect triggers on hit
const EFFECT_CHANCE = 0.3;

function generateRoomId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
}

function getEffectMessage(effect, targetName) {
  const messages = {
    poison: `${targetName} 中毒了！`,
    paralyze: `${targetName} 麻痹了！`,
    sleep: `${targetName} 睡着了！`,
    freeze: `${targetName} 被冻住了！`,
    nightmare: `${targetName} 陷入噩梦！`,
    attack_up: '攻击力提升了！',
    defense_up: '防御力提升了！',
    accuracy_down: `${targetName} 命中率下降了！`,
    speed_down: `${targetName} 速度下降了！`,
    sp_def_down: `${targetName} 特防下降了！`
  };
  return messages[effect] || '';
}

function applyEffect(effect, target) {
  if (!effect) return;
  const statusEffects = ['poison', 'paralyze', 'sleep', 'freeze'];
  if (statusEffects.includes(effect) && !target.status) {
    target.status = effect;
  } else if (effect === 'attack_up') {
    target.attack = Math.floor(target.attack * 1.5);
  } else if (effect === 'defense_up') {
    target.defense = Math.floor(target.defense * 1.5);
  } else if (effect === 'accuracy_down') {
    target.accuracyMod = (target.accuracyMod || 1) * 0.7;
  } else if (effect === 'speed_down') {
    target.speed = Math.floor(target.speed * 0.7);
  } else if (effect === 'sp_def_down') {
    target.spDef = Math.floor((target.spDef || target.defense) * 0.7);
  } else if (effect === 'nightmare' && target.status === 'sleep') {
    target.nightmare = true;
  }
}

function processStatusEffects(pokemon) {
  const logs = [];
  if (!pokemon.status) return logs;

  if (pokemon.status === 'sleep') {
    pokemon.sleepTurns = (pokemon.sleepTurns || 0) + 1;
    if (pokemon.sleepTurns >= 3) {
      pokemon.status = null;
      pokemon.sleepTurns = 0;
      logs.push(`${pokemon.name} 从睡眠中醒来了！`);
    } else {
      logs.push(`${pokemon.name} 正在睡觉...`);
    }
  } else if (pokemon.status === 'poison') {
    const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
    pokemon.hp = Math.max(0, pokemon.hp - dmg);
    logs.push(`${pokemon.name} 因中毒受到了 ${dmg} 点伤害！`);
  } else if (pokemon.status === 'freeze') {
    if (Math.random() < 0.2) {
      pokemon.status = null;
      logs.push(`${pokemon.name} 解冻了！`);
    } else {
      logs.push(`${pokemon.name} 被冰冻住了，无法行动！`);
    }
  } else if (pokemon.status === 'paralyze') {
    logs.push(`${pokemon.name} 因麻痹行动迟缓。`);
  }

  if (pokemon.nightmare && pokemon.status === 'sleep') {
    const dmg = Math.max(1, Math.floor(pokemon.maxHp / 4));
    pokemon.hp = Math.max(0, pokemon.hp - dmg);
    logs.push(`${pokemon.name} 在噩梦中受到了 ${dmg} 点伤害！`);
  }
  return logs;
}

function createBattleState(p1Pokemon, p2Pokemon) {
  return {
    turn: 1,
    currentTurn: null,
    phase: 'waiting',
    players: [
      { pokemon: deepClonePokemon(p1Pokemon), moveUsed: null, ready: false },
      { pokemon: deepClonePokemon(p2Pokemon), moveUsed: null, ready: false }
    ],
    winner: null,
    logs: []
  };
}

function processTurn(state) {
  const logs = [];
  const [p0, p1] = state.players;

  // Determine order based on speed
  let first = 0;
  let second = 1;
  const spd0 = p0.pokemon.speed * (p0.pokemon.status === 'paralyze' ? 0.5 : 1);
  const spd1 = p1.pokemon.speed * (p1.pokemon.status === 'paralyze' ? 0.5 : 1);
  if (spd1 > spd0 || (spd1 === spd0 && Math.random() < 0.5)) {
    first = 1;
    second = 0;
  }

  function executeMove(attackerIdx, defenderIdx) {
    const attacker = state.players[attackerIdx];
    const defender = state.players[defenderIdx];
    const move = attacker.moveUsed;

    if (!move) return;
    if (attacker.pokemon.hp <= 0) return;

    // Status check
    if (attacker.pokemon.status === 'sleep') {
      const statusLogs = processStatusEffects(attacker.pokemon);
      logs.push(...statusLogs);
      if (attacker.pokemon.status === 'sleep') return; // still asleep
    } else if (attacker.pokemon.status === 'freeze') {
      const statusLogs = processStatusEffects(attacker.pokemon);
      logs.push(...statusLogs);
      if (attacker.pokemon.status === 'freeze') return;
    } else if (attacker.pokemon.status === 'paralyze') {
      if (Math.random() < 0.25) {
        logs.push(`${attacker.pokemon.name} 因麻痹无法行动！`);
        return;
      }
    }

    if (move.power > 0) {
      const damage = calculateDamage(attacker.pokemon, move, defender.pokemon);
      defender.pokemon.hp = Math.max(0, defender.pokemon.hp - damage);
      logs.push(`${attacker.pokemon.name} 使用了 ${move.name}！造成了 ${damage} 点伤害！`);

      // Apply move effect (chance-based for status effects)
      if (move.effect && Math.random() < EFFECT_CHANCE) {
        applyEffect(move.effect, defender.pokemon);
        const effMsg = getEffectMessage(move.effect, defender.pokemon.name);
        if (effMsg) logs.push(effMsg);
      }
    } else {
      logs.push(`${attacker.pokemon.name} 使用了 ${move.name}！`);
      // Self-buff or guaranteed status
      const selfBuffs = ['attack_up', 'defense_up'];
      if (selfBuffs.includes(move.effect)) {
        applyEffect(move.effect, attacker.pokemon);
        logs.push(getEffectMessage(move.effect, attacker.pokemon.name));
      } else if (move.effect) {
        if (!defender.pokemon.status) {
          applyEffect(move.effect, defender.pokemon);
          const effMsg = getEffectMessage(move.effect, defender.pokemon.name);
          if (effMsg) logs.push(effMsg);
        } else {
          logs.push(`${defender.pokemon.name} 已经有异常状态了！`);
        }
      }
    }
  }

  executeMove(first, second);
  if (state.players[second].pokemon.hp > 0) {
    executeMove(second, first);
  }

  // End-of-turn status effects for those still standing
  for (const player of state.players) {
    if (player.pokemon.hp > 0 && player.pokemon.status === 'poison') {
      const statusLogs = processStatusEffects(player.pokemon);
      logs.push(...statusLogs);
    }
  }

  // Check win condition
  if (state.players[0].pokemon.hp <= 0 && state.players[1].pokemon.hp <= 0) {
    state.winner = 'draw';
    logs.push('双方宝可梦同时倒下！平局！');
  } else if (state.players[0].pokemon.hp <= 0) {
    state.winner = 1;
    logs.push(`${state.players[0].pokemon.name} 倒下了！玩家2 获胜！`);
  } else if (state.players[1].pokemon.hp <= 0) {
    state.winner = 0;
    logs.push(`${state.players[1].pokemon.name} 倒下了！玩家1 获胜！`);
  }

  state.turn++;
  state.players[0].moveUsed = null;
  state.players[1].moveUsed = null;
  state.players[0].ready = false;
  state.players[1].ready = false;

  return logs;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', () => {
    let roomId;
    do { roomId = generateRoomId(); } while (rooms.has(roomId));

    rooms.set(roomId, {
      players: [socket],
      playerIndices: { [socket.id]: 0 },
      selections: [null, null],
      state: null
    });
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerIndex = 0;

    socket.emit('room_created', { roomId, playerIndex: 0 });
    console.log(`Room ${roomId} created by ${socket.id}`);
  });

  socket.on('join_room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: '房间不存在！请检查房间号。' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('error', { message: '房间已满！' });
      return;
    }

    room.players.push(socket);
    room.playerIndices[socket.id] = 1;
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerIndex = 1;

    socket.emit('room_joined', { roomId, playerIndex: 1 });

    // Notify both players that the room is full
    io.to(roomId).emit('room_ready', {
      message: '对手已加入！请选择你的宝可梦。',
      pokemonList: POKEMON_LIST.map(p => ({
        id: p.id, name: p.name, nameEn: p.nameEn, type: p.type,
        hp: p.maxHp, attack: p.attack, defense: p.defense, speed: p.speed,
        sprite: p.sprite, color: p.color, moves: p.moves
      }))
    });
    console.log(`Player joined room ${roomId}`);
  });

  socket.on('select_pokemon', ({ pokemonId }) => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const idx = socket.playerIndex;
    const pokemon = POKEMON_LIST.find(p => p.id === pokemonId);
    if (!pokemon) return;

    room.selections[idx] = pokemonId;
    socket.emit('pokemon_selected', { pokemonId, playerIndex: idx });

    // Notify other player
    const other = room.players.find(p => p.id !== socket.id);
    if (other) {
      other.emit('opponent_selected', { playerIndex: idx });
    }

    // Both players selected
    if (room.selections[0] !== null && room.selections[1] !== null) {
      const p1 = POKEMON_LIST.find(p => p.id === room.selections[0]);
      const p2 = POKEMON_LIST.find(p => p.id === room.selections[1]);
      room.state = createBattleState(p1, p2);
      room.state.phase = 'battle';

      io.to(roomId).emit('battle_start', {
        state: sanitizeState(room.state),
        players: room.players.map((p, i) => ({
          socketId: p.id,
          playerIndex: i,
          pokemonId: room.selections[i]
        }))
      });
      console.log(`Battle started in room ${roomId}`);
    }
  });

  socket.on('use_move', ({ moveIndex }) => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room || !room.state) return;

    const state = room.state;
    if (state.winner !== null) return;

    const idx = socket.playerIndex;
    const player = state.players[idx];

    if (player.ready) return; // already submitted

    const move = player.pokemon.moves[moveIndex];
    if (!move || move.pp <= 0) {
      socket.emit('error', { message: '技能PP耗尽！' });
      return;
    }

    move.pp--;
    player.moveUsed = move;
    player.ready = true;

    socket.emit('move_submitted', { moveIndex });

    // Notify opponent
    const other = room.players.find(p => p.id !== socket.id);
    if (other) other.emit('opponent_move_submitted');

    // Both players ready
    if (state.players[0].ready && state.players[1].ready) {
      const turnLogs = processTurn(state);
      state.logs.push(...turnLogs);

      io.to(roomId).emit('turn_result', {
        logs: turnLogs,
        state: sanitizeState(state)
      });

      if (state.winner !== null) {
        io.to(roomId).emit('battle_over', {
          winner: state.winner,
          state: sanitizeState(state)
        });
        console.log(`Battle ended in room ${roomId}, winner: ${state.winner}`);
      }
    }
  });

  socket.on('rematch', () => {
    const roomId = socket.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    if (!room.rematchVoters) room.rematchVoters = new Set();
    if (room.rematchVoters.has(socket.id)) return; // already voted
    room.rematchVoters.add(socket.id);

    const other = room.players.find(p => p.id !== socket.id);
    if (other) other.emit('opponent_wants_rematch');

    if (room.rematchVoters.size >= 2) {
      room.rematchVoters = new Set();
      room.selections = [null, null];
      room.state = null;
      io.to(roomId).emit('rematch_start', {
        pokemonList: POKEMON_LIST.map(p => ({
          id: p.id, name: p.name, nameEn: p.nameEn, type: p.type,
          hp: p.maxHp, attack: p.attack, defense: p.defense, speed: p.speed,
          sprite: p.sprite, color: p.color, moves: p.moves
        }))
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const other = room.players.find(p => p.id !== socket.id);
    if (other) {
      other.emit('opponent_disconnected', { message: '对手已断线，游戏结束。' });
    }
    rooms.delete(roomId);
  });
});

function sanitizeState(state) {
  return {
    turn: state.turn,
    phase: state.phase,
    winner: state.winner,
    players: state.players.map(p => ({
      pokemon: {
        id: p.pokemon.id,
        name: p.pokemon.name,
        nameEn: p.pokemon.nameEn,
        type: p.pokemon.type,
        hp: p.pokemon.hp,
        maxHp: p.pokemon.maxHp,
        attack: p.pokemon.attack,
        defense: p.pokemon.defense,
        speed: p.pokemon.speed,
        sprite: p.pokemon.sprite,
        color: p.pokemon.color,
        status: p.pokemon.status || null,
        moves: p.pokemon.moves.map(m => ({ ...m }))
      },
      ready: p.ready
    }))
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 宝可梦对战服务器运行在 http://localhost:${PORT}`);
});

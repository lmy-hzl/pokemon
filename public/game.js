'use strict';

/* ============================================================
   宝可梦对战 - Client Game Logic
   Keyboard controls:
     Lobby:    1=Create Room, 2=Join Room, Enter=Confirm
     Select:   ← → navigate, Enter=confirm
     Battle:   1-4 select move, ← → navigate moves, Enter=use move
               R=rematch (after battle), Q=back to lobby
   ============================================================ */

const socket = io();

// ---- State ----
const state = {
  screen: 'lobby',           // lobby | waiting | select | battle
  roomId: null,
  playerIndex: -1,           // 0 or 1
  pokemonList: [],
  selectedCardIndex: 0,      // cursor in select screen
  confirmedPokemonId: null,
  battleState: null,
  selectedMoveIndex: 0,      // cursor in move panel
  myTurnDone: false,
  battleOver: false
};

// ---- DOM helpers ----
const $ = id => document.getElementById(id);
const screens = {
  lobby: $('screen-lobby'),
  waiting: $('screen-waiting'),
  select: $('screen-select'),
  battle: $('screen-battle')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  state.screen = name;
}

// ---- Type color lookup ----
function typeClass(type) { return `type-${type}`; }
function typeTagHtml(type) {
  return `<span class="type-tag ${typeClass(type)}">${type}</span>`;
}

// ============================================================
// LOBBY SCREEN
// ============================================================
const btnCreate = $('btn-create');
const btnJoin = $('btn-join');
const joinForm = $('join-form');
const roomInput = $('room-input');
const btnJoinConfirm = $('btn-join-confirm');
const lobbyStatus = $('lobby-status');

btnCreate.addEventListener('click', () => createRoom());
btnJoin.addEventListener('click', () => toggleJoinForm());
btnJoinConfirm.addEventListener('click', () => joinRoom());

function createRoom() {
  lobbyStatus.textContent = '正在创建房间...';
  socket.emit('create_room');
}

function toggleJoinForm() {
  const hidden = joinForm.classList.toggle('hidden');
  if (!hidden) {
    setTimeout(() => roomInput.focus(), 50);
  }
}

function joinRoom() {
  const code = roomInput.value.trim().toUpperCase();
  if (code.length !== 5) {
    lobbyStatus.textContent = '请输入5位房间号！';
    return;
  }
  lobbyStatus.textContent = '正在加入房间...';
  socket.emit('join_room', { roomId: code });
}

// ============================================================
// POKEMON SELECT SCREEN
// ============================================================
function renderPokemonGrid(list) {
  const grid = $('pokemon-grid');
  grid.innerHTML = '';
  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.index = i;
    card.dataset.id = p.id;
    card.innerHTML = `
      <span class="card-num">#${p.id}</span>
      <span class="card-sprite">${p.sprite}</span>
      <span class="card-name">${p.name}</span>
    `;
    card.addEventListener('click', () => {
      state.selectedCardIndex = i;
      updateCardFocus();
      confirmPokemonSelection();
    });
    card.addEventListener('mouseenter', () => {
      state.selectedCardIndex = i;
      updateCardFocus();
      showPokemonDetail(list[i]);
    });
    grid.appendChild(card);
  });

  updateCardFocus();
  if (list[0]) showPokemonDetail(list[0]);
}

function updateCardFocus() {
  document.querySelectorAll('.pokemon-card').forEach((c, i) => {
    c.classList.toggle('focused', i === state.selectedCardIndex);
    c.classList.toggle('selected', state.pokemonList[i]?.id === state.confirmedPokemonId);
  });
}

function showPokemonDetail(p) {
  const detail = $('pokemon-detail');
  detail.classList.remove('hidden');
  $('detail-sprite').textContent = p.sprite;
  $('detail-name').textContent = `${p.name} (${p.nameEn})`;
  $('detail-types').innerHTML = p.type.map(typeTagHtml).join('');

  // Stats bars (max reference: HP=160, others=134)
  function bar(id, val, max) {
    $(id).style.width = `${Math.min(100, (val / max) * 100)}%`;
  }
  $('stat-hp-val').textContent = p.hp;
  $('stat-atk-val').textContent = p.attack;
  $('stat-def-val').textContent = p.defense;
  $('stat-spd-val').textContent = p.speed;
  bar('stat-hp', p.hp, 160);
  bar('stat-atk', p.attack, 134);
  bar('stat-def', p.defense, 134);
  bar('stat-spd', p.speed, 134);

  $('detail-moves').innerHTML = p.moves.map(m => `
    <div class="move-item">
      <div class="pokemon-name-row">
        <span class="move-name">${m.name}</span>
        ${typeTagHtml(m.type)}
      </div>
      <div class="move-info">${m.power > 0 ? `威力 ${m.power}` : '变化技能'} &nbsp; PP ${m.maxPp}</div>
    </div>
  `).join('');
}

function confirmPokemonSelection() {
  if (state.confirmedPokemonId !== null) {
    $('select-status').textContent = '已选择宝可梦，等待对手...';
    return;
  }
  const p = state.pokemonList[state.selectedCardIndex];
  if (!p) return;
  state.confirmedPokemonId = p.id;
  updateCardFocus();
  $('select-status').textContent = `已选择 ${p.name}！等待对手选择...`;
  socket.emit('select_pokemon', { pokemonId: p.id });
}

// ============================================================
// BATTLE SCREEN
// ============================================================
function renderBattle(bs) {
  state.battleState = bs;
  const me = bs.players[state.playerIndex];
  const opp = bs.players[1 - state.playerIndex];

  // Opponent
  $('opp-sprite').textContent = opp.pokemon.sprite;
  $('opp-name').textContent = opp.pokemon.name;
  $('opp-type').innerHTML = opp.pokemon.type.map(typeTagHtml).join('');
  updateHpBar('opp', opp.pokemon.hp, opp.pokemon.maxHp);
  updateStatusBadge('opp-status', opp.pokemon.status);

  // Player
  $('player-sprite').textContent = me.pokemon.sprite;
  $('player-name').textContent = me.pokemon.name;
  $('player-type').innerHTML = me.pokemon.type.map(typeTagHtml).join('');
  updateHpBar('player', me.pokemon.hp, me.pokemon.maxHp);
  updateStatusBadge('player-status', me.pokemon.status);

  // Moves
  renderMoveButtons(me.pokemon.moves);
}

function updateHpBar(prefix, hp, maxHp) {
  const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const fill = $(`${prefix}-hp-fill`);
  fill.style.width = `${pct}%`;
  fill.className = 'hp-fill';
  if (pct <= 20) fill.classList.add('red');
  else if (pct <= 50) fill.classList.add('yellow');
  $(`${prefix}-hp-text`).textContent = `${hp} / ${maxHp}`;
}

function updateStatusBadge(id, status) {
  const badge = $(id);
  if (!status) { badge.classList.add('hidden'); return; }
  badge.classList.remove('hidden');
  const labels = { poison: '中毒', paralyze: '麻痹', sleep: '睡眠', freeze: '冰冻' };
  const classes = { poison: 'status-poison', paralyze: 'status-paralyze', sleep: 'status-sleep', freeze: 'status-freeze' };
  badge.textContent = labels[status] || status;
  badge.className = `status-badge ${classes[status] || ''}`;
}

function renderMoveButtons(moves) {
  const container = $('move-buttons');
  container.innerHTML = '';
  moves.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = `btn-move${i === state.selectedMoveIndex ? ' selected' : ''}`;
    btn.disabled = state.myTurnDone || m.pp <= 0;
    btn.innerHTML = `
      <span class="key-hint">${i + 1}</span>
      <strong>${m.name}</strong>
      <span class="move-pp">PP ${m.pp}/${m.maxPp}</span>
      <br>
      <span class="move-type">${typeTagHtml(m.type)} ${m.power > 0 ? `威力 ${m.power}` : '变化'}</span>
    `;
    btn.addEventListener('click', () => {
      if (!state.myTurnDone) {
        state.selectedMoveIndex = i;
        useMove(i);
      }
    });
    container.appendChild(btn);
  });
}

function updateMoveFocus() {
  document.querySelectorAll('.btn-move').forEach((b, i) => {
    b.classList.toggle('selected', i === state.selectedMoveIndex);
  });
}

function useMove(moveIndex) {
  if (state.myTurnDone || state.battleOver) return;
  state.myTurnDone = true;
  socket.emit('use_move', { moveIndex });
  $('move-wait-msg').classList.remove('hidden');
  $('move-buttons').querySelectorAll('.btn-move').forEach(b => b.disabled = true);
}

function addLog(text, cls = '') {
  const log = $('log-entries');
  const entry = document.createElement('div');
  entry.className = `log-entry${cls ? ' ' + cls : ''}`;
  entry.textContent = text;
  log.appendChild(entry);
  $('battle-log').scrollTop = $('battle-log').scrollHeight;
}

function animateDamage(sprite, isOpponent) {
  sprite.classList.add('flash');
  setTimeout(() => sprite.classList.remove('flash'), 1200);
}

// ============================================================
// SOCKET EVENTS
// ============================================================
socket.on('room_created', ({ roomId, playerIndex }) => {
  state.roomId = roomId;
  state.playerIndex = playerIndex;
  $('room-code').textContent = roomId;
  $('waiting-title').textContent = '等待对手加入';
  $('room-display').style.display = '';
  $('waiting-message').textContent = '将房间号分享给你的朋友';
  showScreen('waiting');
});

socket.on('room_joined', ({ roomId, playerIndex }) => {
  state.roomId = roomId;
  state.playerIndex = playerIndex;
  $('waiting-title').textContent = '已加入房间';
  $('room-display').style.display = '';
  $('room-code').textContent = roomId;
  $('waiting-message').textContent = '等待游戏开始...';
  showScreen('waiting');
});

socket.on('room_ready', ({ pokemonList }) => {
  state.pokemonList = pokemonList;
  state.confirmedPokemonId = null;
  state.selectedCardIndex = 0;
  $('select-status').textContent = '';
  renderPokemonGrid(pokemonList);
  showScreen('select');
});

socket.on('pokemon_selected', ({ pokemonId }) => {
  // already handled locally
});

socket.on('opponent_selected', ({ playerIndex }) => {
  $('select-status').textContent = (state.confirmedPokemonId !== null)
    ? '双方已选择，准备开战！'
    : '对手已选择宝可梦，请选择你的宝可梦！';
});

socket.on('battle_start', ({ state: bs }) => {
  state.battleOver = false;
  state.myTurnDone = false;
  state.selectedMoveIndex = 0;
  $('battle-over-panel').classList.add('hidden');
  $('move-wait-msg').classList.add('hidden');
  $('log-entries').innerHTML = '';
  renderBattle(bs);
  addLog('⚔️ 对战开始！', 'highlight');
  addLog(`${bs.players[0].pokemon.name} VS ${bs.players[1].pokemon.name}`, 'highlight');
  showScreen('battle');
});

socket.on('move_submitted', () => {
  // already handled
});

socket.on('opponent_move_submitted', () => {
  addLog('对手已出招，等待结算...', '');
});

socket.on('turn_result', ({ logs, state: bs }) => {
  state.myTurnDone = false;
  state.selectedMoveIndex = 0;
  $('move-wait-msg').classList.add('hidden');

  // Animate
  const meSprite = $('player-sprite');
  const oppSprite = $('opp-sprite');
  logs.forEach(log => {
    let cls = '';
    if (log.includes('造成了') || log.includes('伤害')) { cls = 'damage'; }
    else if (log.includes('中毒') || log.includes('麻痹') || log.includes('睡') || log.includes('冻')) { cls = 'effect'; }
    else if (log.includes('获胜') || log.includes('倒下')) { cls = 'highlight'; }
    addLog(log, cls);
  });

  // Animate sprites
  animateDamage(oppSprite, true);
  setTimeout(() => animateDamage(meSprite, false), 300);

  renderBattle(bs);
});

socket.on('battle_over', ({ winner, state: bs }) => {
  state.battleOver = true;
  renderBattle(bs);

  const panel = $('battle-over-panel');
  const resultText = $('battle-result-text');
  panel.classList.remove('hidden');

  if (winner === 'draw') {
    resultText.textContent = '🤝 平局！';
    resultText.style.color = '#ecc94b';
  } else if (winner === state.playerIndex) {
    resultText.textContent = '🎉 你赢了！';
    resultText.style.color = '#48bb78';
  } else {
    resultText.textContent = '💀 你输了...';
    resultText.style.color = '#fc8181';
  }
});

socket.on('opponent_wants_rematch', () => {
  addLog('对手想再来一局！按 R 同意。', 'highlight');
});

socket.on('rematch_start', ({ pokemonList }) => {
  state.pokemonList = pokemonList;
  state.confirmedPokemonId = null;
  state.selectedCardIndex = 0;
  $('select-status').textContent = '';
  renderPokemonGrid(pokemonList);
  showScreen('select');
});

socket.on('opponent_disconnected', ({ message }) => {
  if (state.screen === 'battle') {
    const panel = $('battle-over-panel');
    const resultText = $('battle-result-text');
    panel.classList.remove('hidden');
    resultText.textContent = `⚠️ ${message}`;
    resultText.style.color = '#ecc94b';
    state.battleOver = true;
  } else if (state.screen === 'select') {
    $('select-status').textContent = message;
  } else {
    lobbyStatus.textContent = message;
  }
  setTimeout(() => resetToLobby(), 3000);
});

socket.on('error', ({ message }) => {
  lobbyStatus.textContent = message;
});

// ============================================================
// BUTTON HANDLERS (Battle Over)
// ============================================================
$('btn-rematch').addEventListener('click', () => {
  socket.emit('rematch');
});
$('btn-lobby').addEventListener('click', () => {
  resetToLobby();
});

function resetToLobby() {
  state.roomId = null;
  state.playerIndex = -1;
  state.pokemonList = [];
  state.confirmedPokemonId = null;
  state.battleState = null;
  state.battleOver = false;
  state.myTurnDone = false;
  joinForm.classList.add('hidden');
  roomInput.value = '';
  lobbyStatus.textContent = '';
  showScreen('lobby');
}

// ============================================================
// KEYBOARD CONTROLS
// ============================================================
document.addEventListener('keydown', e => {
  const key = e.key;

  // ---- Lobby ----
  if (state.screen === 'lobby') {
    if (key === '1') { e.preventDefault(); createRoom(); }
    else if (key === '2') { e.preventDefault(); toggleJoinForm(); }
    else if (key === 'Enter' && !joinForm.classList.contains('hidden')) {
      e.preventDefault(); joinRoom();
    }
    return;
  }

  // ---- Select Screen ----
  if (state.screen === 'select') {
    const len = state.pokemonList.length;
    if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      e.preventDefault();
      state.selectedCardIndex = (state.selectedCardIndex + 1) % len;
      updateCardFocus();
      showPokemonDetail(state.pokemonList[state.selectedCardIndex]);
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      e.preventDefault();
      state.selectedCardIndex = (state.selectedCardIndex - 1 + len) % len;
      updateCardFocus();
      showPokemonDetail(state.pokemonList[state.selectedCardIndex]);
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      e.preventDefault();
      const cols = window.innerWidth <= 600 ? 3 : 5;
      state.selectedCardIndex = Math.min(len - 1, state.selectedCardIndex + cols);
      updateCardFocus();
      showPokemonDetail(state.pokemonList[state.selectedCardIndex]);
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      e.preventDefault();
      const cols = window.innerWidth <= 600 ? 3 : 5;
      state.selectedCardIndex = Math.max(0, state.selectedCardIndex - cols);
      updateCardFocus();
      showPokemonDetail(state.pokemonList[state.selectedCardIndex]);
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      confirmPokemonSelection();
    }
    return;
  }

  // ---- Battle Screen ----
  if (state.screen === 'battle') {
    if (state.battleOver) {
      if (key === 'r' || key === 'R') { socket.emit('rematch'); }
      else if (key === 'q' || key === 'Q') { resetToLobby(); }
      return;
    }

    if (state.myTurnDone) return;

    const moves = state.battleState?.players[state.playerIndex]?.pokemon?.moves || [];
    if (key === '1' && moves[0]) { e.preventDefault(); useMove(0); }
    else if (key === '2' && moves[1]) { e.preventDefault(); useMove(1); }
    else if (key === '3' && moves[2]) { e.preventDefault(); useMove(2); }
    else if (key === '4' && moves[3]) { e.preventDefault(); useMove(3); }
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      e.preventDefault();
      state.selectedMoveIndex = (state.selectedMoveIndex + 1) % moves.length;
      updateMoveFocus();
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      e.preventDefault();
      state.selectedMoveIndex = (state.selectedMoveIndex - 1 + moves.length) % moves.length;
      updateMoveFocus();
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      e.preventDefault();
      state.selectedMoveIndex = Math.min(moves.length - 1, state.selectedMoveIndex + 2);
      updateMoveFocus();
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      e.preventDefault();
      state.selectedMoveIndex = Math.max(0, state.selectedMoveIndex - 2);
      updateMoveFocus();
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (moves[state.selectedMoveIndex] && moves[state.selectedMoveIndex].pp > 0) {
        useMove(state.selectedMoveIndex);
      }
    }
    return;
  }
});

// Allow typing in room input without triggering lobby shortcuts
roomInput.addEventListener('keydown', e => e.stopPropagation());

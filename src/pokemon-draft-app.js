import {BattleStreams, Dex, Teams} from '@pkmn/sim';
import {
  POKEMON_POOL,
  drawPack,
  draftSynergy,
  generateSet,
  pickOpponentDraft,
  previewMoves,
  chooseBattleAction,
  chooseTeamOrder,
  estimateRole,
  totalStats,
  shuffle,
} from './pokemon-draft-core.js';

const app = document.getElementById('app');
const BEST_RUN_KEY = 'pokemon-draft-best-run-v2';
const ENEMY_NAMES = ['Brock', 'Misty', 'Lt. Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Lance'];

const state = {
  phase: 'draft',
  draftedIds: new Set(),
  playerDraft: [],
  opponentDraft: [],
  playerLoadout: [],
  opponentLoadout: [],
  playerPreview: [],
  opponentPreview: [],
  round: 1,
  pack: [],
  battle: null,
  playerRequest: null,
  playerTeamState: [],
  opponentTeamState: [],
  active: {p1: null, p2: null},
  logs: [],
  message: 'Waehle dein erstes Draft-Pokemon.',
  lastMove: {p1: '', p2: ''},
  flash: {p1: '', p2: ''},
  fxText: '',
  attackFx: null,
  actionLocked: false,
  runWins: 0,
  bestRun: loadBestRun(),
  enemyNumber: 1,
  enemyName: '',
  battleFinished: false,
};

function loadBestRun() {
  try {
    return Number(window.localStorage.getItem(BEST_RUN_KEY) || 0);
  } catch {
    return 0;
  }
}

function saveBestRun(value) {
  state.bestRun = Math.max(state.bestRun, value);
  try {
    window.localStorage.setItem(BEST_RUN_KEY, String(state.bestRun));
  } catch {
    // localStorage can fail in private contexts; the game still runs.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typeGradient(types) {
  const palette = {
    Normal: ['#d8d2be', '#f2efe2'], Fire: ['#ff9b6d', '#ffd3a8'], Water: ['#79b8ff', '#c7e3ff'],
    Electric: ['#ffd85e', '#fff1b8'], Grass: ['#77d391', '#d9f7df'], Ice: ['#90f0ff', '#d8fbff'],
    Fighting: ['#ff8577', '#ffd0c8'], Poison: ['#c887ff', '#ead2ff'], Ground: ['#d2b171', '#f7e3b3'],
    Flying: ['#9fc3ff', '#e0ecff'], Psychic: ['#ff87c8', '#ffd8ef'], Bug: ['#b7d863', '#e7f5b7'],
    Rock: ['#cbb37b', '#ecdfc1'], Ghost: ['#9d95ff', '#ddd9ff'], Dragon: ['#7ea4ff', '#d8e4ff'],
    Dark: ['#8b7f79', '#d1c8c3'], Steel: ['#b8c8d6', '#ebf1f6'], Fairy: ['#ffb6e2', '#ffe6f5'],
  };
  const first = palette[types[0]] || ['#7ad7ff', '#dff8ff'];
  const second = palette[types[1]] || first;
  return `linear-gradient(135deg, ${first[0]}, ${second[1]})`;
}

function toPercent(condition) {
  if (!condition || condition.endsWith(' fnt')) return 0;
  const match = condition.match(/(\d+)\/(\d+)/);
  if (!match) return 100;
  const value = Number(match[1]);
  const max = Number(match[2]);
  if (!max) return 100;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function compactMeta(parts) {
  return parts.filter(Boolean).join(' - ');
}

function logLine(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 120);
}

function createLoadout(species, set = generateSet(species, Dex)) {
  return {
    ...species,
    set,
    item: set.item,
    ability: set.ability,
    archetype: set.archetype,
    moveNames: set.moves.map((moveId) => Dex.moves.get(moveId).name),
  };
}

function lookupLoadoutByName(name, team) {
  return team.find((member) => member.name === name);
}

function currentEnemyLabel() {
  return `${state.enemyName || 'Challenger'} #${state.enemyNumber}`;
}

function nextEnemyName() {
  return ENEMY_NAMES[(state.enemyNumber - 1) % ENEMY_NAMES.length];
}

function buildOpponentLoadout() {
  const excluded = new Set(state.playerDraft.map((species) => species.id));
  const pool = shuffle(POKEMON_POOL.filter((species) => !excluded.has(species.id)));
  const team = [];
  const packSize = Math.min(6, 3 + state.runWins);
  let index = 0;
  while (team.length < 3 && index < pool.length) {
    const pack = pool.slice(index, index + packSize);
    index += packSize;
    const choice = pickOpponentDraft(pack, team, state.playerLoadout, Dex);
    if (choice && !team.some((member) => member.id === choice.id)) team.push(choice);
  }
  return team.slice(0, 3).map((species) => createLoadout(species));
}

function resetBattleState() {
  state.battle = null;
  state.playerRequest = null;
  state.playerTeamState = [];
  state.opponentTeamState = [];
  state.active = {p1: null, p2: null};
  state.lastMove = {p1: '', p2: ''};
  state.flash = {p1: '', p2: ''};
  state.fxText = '';
  state.attackFx = null;
  state.actionLocked = false;
  state.battleFinished = false;
}

function prepareNextEnemy(message = '') {
  resetBattleState();
  state.phase = 'preview';
  state.enemyName = nextEnemyName();
  state.opponentLoadout = buildOpponentLoadout();
  state.playerPreview = chooseTeamOrder(state.playerLoadout);
  state.opponentPreview = chooseTeamOrder(state.opponentLoadout);
  state.opponentDraft = state.opponentLoadout.slice();
  state.message = message || `${currentEnemyLabel()} betritt die Arena. Waehle deinen Lead neu.`;
  logLine(`${currentEnemyLabel()} ist bereit.`);
  render();
}

function render() {
  app.innerHTML = `
    <div class="draft-shell">
      <aside class="column left">
        <a class="back-link" href="../index.html#games">Zurueck zur Startseite</a>
        <div class="title-block">
          <div class="eyebrow">Pokemon Team Draft Battler</div>
          <h1>Kanto Circuit</h1>
          <p>${state.phase === 'draft'
            ? 'Drafte ein 3er-Team aus den ersten 150 Pokemon. Danach laeuft dein Team als Serie gegen immer neue Gegner.'
            : state.phase === 'preview'
              ? 'Vor jedem Gegner waehlst du die Reihenfolge neu. Initiative und Kampfreihenfolge kommen aus der Battle-Engine.'
              : 'Die Battle-Engine loest Prioritaet, Speed, Abilities, Status und Effekte auf. Du kannst jederzeit fuer einen Zug wechseln.'}</p>
        </div>
        <div class="panel">
          <div class="panel-title">Run Status</div>
          <div class="metric-grid">
            <div class="metric"><span>Pool</span><strong>150</strong></div>
            <div class="metric"><span>Draft</span><strong>${state.playerDraft.length}/3</strong></div>
            <div class="metric"><span>Serie</span><strong>${state.runWins}</strong></div>
            <div class="metric"><span>Best</span><strong>${state.bestRun}</strong></div>
            <div class="metric"><span>Naechster Gegner</span><strong>${state.phase === 'draft' ? '-' : state.enemyNumber}</strong></div>
            <div class="metric"><span>Format</span><strong>3v3 Singles</strong></div>
          </div>
        </div>
        <div class="panel team-panel">
          <div class="panel-title">Dein Teamkern</div>
          ${renderRoster(state.phase === 'draft' ? state.playerDraft : state.playerLoadout, true)}
          ${(state.phase === 'draft' ? state.playerDraft : state.playerLoadout).length ? renderSynergy(state.phase === 'draft' ? state.playerDraft : state.playerLoadout) : ''}
        </div>
        <div class="panel team-panel">
          <div class="panel-title">${state.phase === 'draft' ? 'Gegnerischer Draft' : currentEnemyLabel()}</div>
          ${renderRoster(state.phase === 'draft' ? state.opponentDraft : state.opponentLoadout, state.phase !== 'draft')}
          ${(state.phase === 'draft' ? state.opponentDraft : state.opponentLoadout).length ? renderSynergy(state.phase === 'draft' ? state.opponentDraft : state.opponentLoadout) : ''}
        </div>
      </aside>
      <main class="column center">
        ${state.phase === 'draft' ? renderDraftStage() : state.phase === 'preview' ? renderPreviewStage() : renderBattleStage()}
      </main>
      <aside class="column right">
        <div class="panel">
          <div class="panel-title">Mechanics</div>
          <ul class="notes">
            <li>Initiative kommt aus der Showdown-kompatiblen Engine: Prioritaet, Speed und Status werden dort entschieden.</li>
            <li>Sets werden nur aus legalen Learnsets erzeugt und vor jedem Gegner voll geheilt zurueckgesetzt.</li>
            <li>Freiwilliges Wechseln ist moeglich und verbraucht wie im Spiel deinen Zug.</li>
          </ul>
        </div>
        <div class="panel">
          <div class="panel-title">Battle Log</div>
          <div class="log-list">${state.logs.map((line) => `<div class="log-line">${line}</div>`).join('')}</div>
        </div>
      </aside>
    </div>
  `;

  if (state.phase === 'draft') {
    document.querySelectorAll('[data-draft-id]').forEach((button) => {
      button.addEventListener('click', () => draftSpecies(button.dataset.draftId));
    });
  } else if (state.phase === 'preview') {
    document.querySelectorAll('[data-move-index]').forEach((button) => {
      button.addEventListener('click', () => movePreviewMon(Number(button.dataset.moveIndex), Number(button.dataset.moveDir)));
    });
    document.getElementById('startBattleBtn')?.addEventListener('click', startBattle);
  } else {
    document.querySelectorAll('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => submitChoice(button.dataset.choice));
    });
    document.getElementById('newDraftBtn')?.addEventListener('click', resetDraft);
  }
}

function renderRoster(team, revealDetails) {
  if (!team.length) return '<div class="empty-card">Noch keine Picks.</div>';
  return team.map((member) => `
    <div class="roster-card" style="background:${typeGradient(member.types)}">
      <div class="roster-head">
        <strong>${member.name}</strong>
        <span>#${member.num}</span>
      </div>
      <div class="types">${member.types.map((type) => `<span>${type}</span>`).join('')}</div>
      ${revealDetails ? `<div class="tiny">BST ${totalStats(member.baseStats)}</div>` : '<div class="tiny">Challenger gesichtet</div>'}
      <div class="tiny">${compactMeta([`Rolle ${estimateRole(member)}`, member.archetype])}</div>
    </div>
  `).join('');
}

function renderSynergy(team) {
  const synergy = draftSynergy(team);
  return `
    <div class="synergy-box">
      <div><span class="tiny">Type</span><strong>${synergy.typeCoverage}</strong></div>
      <div><span class="tiny">Roles</span><strong>${synergy.roleCoverage}</strong></div>
      <div><span class="tiny">Score</span><strong>${synergy.score}</strong></div>
    </div>
  `;
}

function renderDraftStage() {
  return `
    <section class="hero-panel">
      <div>
        <div class="eyebrow">Draft Phase</div>
        <h2>Waehle eines von drei Pokemon</h2>
      </div>
      <div class="draft-message">${state.message}</div>
    </section>
    <section class="draft-grid">
      ${state.pack.map((species) => `
        <button class="draft-card" data-draft-id="${species.id}" style="background:${typeGradient(species.types)}">
          <div class="draft-num">#${species.num}</div>
          <h3>${species.name}</h3>
          <div class="types">${species.types.map((type) => `<span>${type}</span>`).join('')}</div>
          <div class="stat-strip">
            <span>HP ${species.baseStats.hp}</span>
            <span>ATK ${species.baseStats.atk}</span>
            <span>SPA ${species.baseStats.spa}</span>
            <span>SPE ${species.baseStats.spe}</span>
          </div>
          <div class="tiny">Abilities: ${species.abilities.join(', ')}</div>
          <div class="tiny">Archetyp: ${estimateRole(species)}</div>
          <div class="move-preview">${previewMoves(species, Dex).map((move) => `<span>${move}</span>`).join('')}</div>
        </button>
      `).join('')}
    </section>
  `;
}

function renderPreviewCard(member, index, showControls) {
  return `
    <div class="preview-card" style="background:${typeGradient(member.types)}">
      <div class="preview-body">
        <strong>${index + 1}. ${member.name}</strong>
        <div class="tiny">${compactMeta([member.types.join(' / '), estimateRole(member), member.item])}</div>
        <div class="tiny">${member.moveNames.join(', ')}</div>
      </div>
      ${showControls ? `
        <div class="preview-controls">
          <button class="mini-btn" data-move-index="${index}" data-move-dir="-1" ${index === 0 ? 'disabled' : ''}>hoch</button>
          <button class="mini-btn" data-move-index="${index}" data-move-dir="1" ${index === state.playerPreview.length - 1 ? 'disabled' : ''}>runter</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderPreviewStage() {
  return `
    <section class="hero-panel">
      <div>
        <div class="eyebrow">Series Preview</div>
        <h2>${currentEnemyLabel()}</h2>
      </div>
      <div class="draft-message">${state.message}</div>
    </section>
    <section class="preview-grid">
      <div class="preview-panel">
        <div class="panel-title">Deine Reihenfolge</div>
        <div class="preview-list">${state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join('')}</div>
      </div>
      <div class="preview-panel">
        <div class="panel-title">Gegnerische Reihenfolge</div>
        <div class="preview-list">${state.opponentPreview.map((member, index) => renderPreviewCard(member, index, false)).join('')}</div>
      </div>
    </section>
    <section class="action-panel">
      <div class="summary-grid">
        <div class="summary-card">
          <span class="tiny">Aktuelle Serie</span>
          <strong>${state.runWins}</strong>
        </div>
        <div class="summary-card">
          <span class="tiny">Best Run</span>
          <strong>${state.bestRun}</strong>
        </div>
      </div>
      <button class="secondary-btn" id="startBattleBtn">Kampf gegen ${currentEnemyLabel()} starten</button>
    </section>
  `;
}

function renderCombatant(mon, label) {
  if (!mon) {
    return `<div class="combat-card waiting"><div class="tiny">${label}</div><strong>Wartet auf Aktivierung</strong></div>`;
  }
  return `
    <div class="combat-card ${state.flash[label === 'Du' ? 'p1' : 'p2']}" style="background:${typeGradient(mon.types || ['Normal'])}">
      <div class="tiny">${label}</div>
      <strong>${mon.name}</strong>
      <div>${mon.condition || 'unbekannt'}</div>
      <div class="hp-bar"><div class="hp-fill" style="width:${toPercent(mon.condition)}%"></div></div>
      <div class="status-row">
        <span class="tiny">${compactMeta([mon.item, mon.archetype])}</span>
        <span class="status-pill">${mon.status || 'OK'}</span>
      </div>
    </div>
  `;
}

function renderBench(team, ownSide) {
  const bench = team.filter((mon) => !mon.active);
  if (!bench.length) return '<div class="empty-card">Keine Reserven sichtbar.</div>';
  return `<div class="bench-list">${bench.map((mon) => `
    <div class="bench-card ${ownSide && !state.actionLocked ? 'can-switch' : ''}" style="background:${typeGradient(mon.types || ['Normal'])}">
      <strong>${mon.name}</strong>
      <div class="hp-bar slim"><div class="hp-fill" style="width:${toPercent(mon.condition)}%"></div></div>
      <div class="tiny">${compactMeta([mon.condition, mon.status || 'bereit'])}</div>
      ${ownSide && state.playerRequest && !state.playerRequest.forceSwitch ? '<div class="tiny">Wechsel kostet einen Zug</div>' : ''}
    </div>
  `).join('')}</div>`;
}

function renderChoiceButtons() {
  const request = state.playerRequest;
  if (!request) return '<div class="empty-card">Warte auf den naechsten Request der Engine.</div>';
  const disabled = state.actionLocked ? 'disabled' : '';

  if (request.forceSwitch) {
    const switches = request.side.pokemon
      .map((mon, index) => ({mon, index}))
      .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'))
      .map(({mon, index}) => `<button class="choice-btn switch" ${disabled} data-choice="switch ${index + 1}">${mon.details.split(',')[0]}<span>Pflichtwechsel</span></button>`)
      .join('');
    return `<div class="choice-stack"><div class="choice-section-title">Wechsel</div><div class="choice-grid">${switches}</div></div>`;
  }

  const moveButtons = request.active?.[0]
    ? request.active[0].moves
      .map((move, index) => `<button class="choice-btn" ${disabled} data-choice="move ${index + 1}">${move.move}<span>${move.pp}/${move.maxpp} PP</span></button>`)
      .join('')
    : '<div class="empty-card">Kein Zug verfuegbar.</div>';

  const switchButtons = !request.active?.[0]?.trapped
    ? request.side.pokemon
      .map((mon, index) => ({mon, index}))
      .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'))
      .map(({mon, index}) => `<button class="choice-btn switch" ${disabled} data-choice="switch ${index + 1}">${mon.details.split(',')[0]}<span>Zug opfern</span></button>`)
      .join('')
    : '';

  return `
    <div class="choice-stack">
      <div class="choice-section-title">Moves</div>
      <div class="choice-grid">${moveButtons}</div>
    </div>
    ${switchButtons ? `
      <div class="choice-stack">
        <div class="choice-section-title">Wechsel</div>
        <div class="choice-grid switch-grid">${switchButtons}</div>
      </div>
    ` : ''}
  `;
}

function renderBattleStage() {
  const playerActive = state.active.p1;
  const opponentActive = state.active.p2;
  return `
    <section class="hero-panel battle">
      <div>
        <div class="eyebrow">Battle Phase</div>
        <h2>${currentEnemyLabel()}</h2>
      </div>
      <div class="draft-message">${state.message}</div>
    </section>
    <section class="battle-field">
      <div class="combatant top">${renderCombatant(opponentActive, currentEnemyLabel())}</div>
      <div class="arena-center">
        <div class="arena-ring"></div>
        <div class="arena-lane lane-top"></div>
        <div class="arena-lane lane-bottom"></div>
        <div class="turn-banner">
          <div><span class="tiny">Letzter Zug Gegner</span><strong>${state.lastMove.p2 || 'noch keiner'}</strong></div>
          <div><span class="tiny">Letzter Zug Du</span><strong>${state.lastMove.p1 || 'noch keiner'}</strong></div>
        </div>
        <div class="fx-text ${state.fxText ? 'show' : ''}">${state.fxText}</div>
        ${state.attackFx ? `<div class="attack-fx ${state.attackFx.side} ${state.attackFx.type} ${state.attackFx.category} show"><span>${state.attackFx.label}</span></div>` : ''}
        <div class="arena-log">${state.logs.slice(0, 5).map((line) => `<div>${line}</div>`).join('')}</div>
      </div>
      <div class="combatant bottom">${renderCombatant(playerActive, 'Du')}</div>
    </section>
    <section class="bench-grid">
      <div class="bench-panel">
        <div class="panel-title">Deine Bank</div>
        ${renderBench(state.playerTeamState, true)}
      </div>
      <div class="bench-panel">
        <div class="panel-title">Gegnerische Bank</div>
        ${renderBench(state.opponentTeamState, false)}
      </div>
    </section>
    <section class="action-panel">
      <div class="action-header">
        <div>
          <div class="panel-title">Aktionen</div>
          <div class="tiny">${state.actionLocked ? 'Zug wird aufgeloest...' : 'Du kannst angreifen oder fuer einen Zug wechseln.'}</div>
        </div>
        <div class="summary-pill">Serie ${state.runWins}</div>
      </div>
      ${renderChoiceButtons()}
      <button class="secondary-btn" id="newDraftBtn">Neuer Draft</button>
    </section>
  `;
}

function nextPack() {
  state.pack = drawPack(state.draftedIds, 3);
  render();
}

function draftSpecies(id) {
  const picked = state.pack.find((species) => species.id === id);
  if (!picked) return;
  state.playerDraft.push(picked);
  state.draftedIds.add(picked.id);

  const opponentPick = pickOpponentDraft(state.pack.filter((species) => species.id !== id), state.opponentDraft, state.playerDraft, Dex);
  state.opponentDraft.push(opponentPick);
  state.draftedIds.add(opponentPick.id);

  logLine(`Du draftest ${picked.name}. Gegner nimmt ${opponentPick.name}.`);

  if (state.playerDraft.length >= 3) {
    state.playerLoadout = state.playerDraft.map((species) => createLoadout(species));
    state.runWins = 0;
    state.enemyNumber = 1;
    prepareNextEnemy('Dein Team ist gesetzt. Jetzt beginnt die Serie.');
    return;
  }

  state.round += 1;
  state.message = `Runde ${state.round}: Suche Coverage und Tempo.`;
  nextPack();
}

function updatePlayerStateFromRequest(request) {
  state.playerTeamState = request.side.pokemon.map((mon) => {
    const name = mon.details.split(',')[0];
    const drafted = lookupLoadoutByName(name, state.playerPreview) || lookupLoadoutByName(name, state.playerLoadout);
    return {
      name,
      types: drafted?.types || ['Normal'],
      condition: mon.condition,
      active: mon.active,
      item: drafted?.item || mon.item || '',
      status: mon.status || (mon.condition.endsWith(' fnt') ? 'fainted' : ''),
      archetype: drafted?.archetype || estimateRole(drafted || {baseStats: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}}),
    };
  });
  state.active.p1 = state.playerTeamState.find((mon) => mon.active) || state.playerTeamState[0];
}

function ensureOpponentTeamState() {
  if (!state.opponentTeamState.length) {
    state.opponentTeamState = state.opponentPreview.map((member) => ({
      name: member.name,
      types: member.types,
      condition: '100/100',
      active: false,
      status: '',
      item: member.item || '',
      archetype: member.archetype,
    }));
  }
}

function moveAnimationMeta(moveName, actorSlot) {
  const move = Dex.moves.get(moveName);
  if (!move?.exists) return null;
  return {
    side: actorSlot.startsWith('p1') ? 'p1' : 'p2',
    type: move.type.toLowerCase(),
    category: move.category.toLowerCase(),
    label: move.name,
  };
}

function triggerAttackFx(moveName, actorSlot) {
  state.attackFx = moveAnimationMeta(moveName, actorSlot);
  render();
  setTimeout(() => {
    state.attackFx = null;
    render();
  }, 620);
}

function updateRosterState(targetSlot, updater) {
  const roster = targetSlot.startsWith('p2') ? state.opponentTeamState : state.playerTeamState;
  const targetName = targetSlot.split(': ').pop();
  const target = roster.find((mon) => mon.name === targetName);
  if (target) updater(target, roster);
  if (targetSlot.startsWith('p2') && target) state.active.p2 = target;
  if (targetSlot.startsWith('p1') && target) state.active.p1 = target;
}

function handleBattleLine(line) {
  if (!line.startsWith('|')) return 0;
  const parts = line.split('|');
  const type = parts[1];

  if (type === 'move') {
    const actorSlot = parts[2] || '';
    const actor = actorSlot.split(': ').pop();
    const move = parts[3];
    if (actorSlot.startsWith('p1')) state.lastMove.p1 = move;
    if (actorSlot.startsWith('p2')) state.lastMove.p2 = move;
    triggerAttackFx(move, actorSlot);
    showFx(move);
    logLine(`${actor} nutzt ${move}.`);
    return 520;
  }

  if (type === 'switch') {
    const slot = parts[2];
    const name = slot.split(': ').pop();
    const condition = parts[4];
    updateRosterState(slot, (target, roster) => {
      roster.forEach((mon) => { mon.active = mon.name === name; });
      target.condition = condition;
      target.active = true;
    });
    flashSide(slot.startsWith('p2') ? 'p2' : 'p1', 'flash-switch');
    return 360;
  }

  if (type === '-damage' || type === '-heal') {
    const targetSlot = parts[2];
    const condition = parts[3];
    updateRosterState(targetSlot, (target) => {
      target.condition = condition;
    });
    flashSide(targetSlot.startsWith('p2') ? 'p2' : 'p1', type === '-damage' ? 'flash-hit' : 'flash-heal');
    return 280;
  }

  if (type === 'faint') {
    const targetSlot = parts[2];
    const targetName = targetSlot.split(': ').pop();
    updateRosterState(targetSlot, (target) => {
      target.condition = '0 fnt';
      target.status = 'fainted';
      target.active = false;
    });
    flashSide(targetSlot.startsWith('p2') ? 'p2' : 'p1', 'flash-faint');
    logLine(`${targetName} faellt aus.`);
    return 520;
  }

  if (type === '-status') {
    const targetSlot = parts[2] || '';
    const targetName = targetSlot.split(': ').pop();
    updateRosterState(targetSlot, (target) => {
      target.status = parts[3] || 'status';
    });
    showFx(parts[3] || 'Status');
    logLine(`${targetName} erhaelt ${parts[3]}.`);
    return 220;
  }

  if (type === '-curestatus') {
    const targetSlot = parts[2] || '';
    const targetName = targetSlot.split(': ').pop();
    updateRosterState(targetSlot, (target) => {
      target.status = '';
    });
    logLine(`${targetName} ist nicht mehr betroffen.`);
    return 180;
  }

  if (type === 'turn') {
    state.message = `Zug ${parts[2]}.`;
    return 120;
  }

  if (type === 'win') {
    void finishBattle(parts[2]);
    return 900;
  }

  return 0;
}

async function animateBattleChunk(chunk) {
  for (const line of chunk.split('\n').filter(Boolean)) {
    const delay = handleBattleLine(line);
    render();
    if (delay) await sleep(delay);
  }
}

async function finishBattle(winner) {
  if (state.battleFinished) return;
  state.battleFinished = true;
  state.playerRequest = null;
  state.actionLocked = true;

  if (winner === 'Du') {
    state.runWins += 1;
    saveBestRun(state.runWins);
    state.message = `Sieg gegen ${currentEnemyLabel()}. Serie: ${state.runWins}.`;
    logLine(state.message);
    state.enemyNumber += 1;
    render();
    await sleep(1100);
    prepareNextEnemy('Naechster Gegner wartet. Team ist wieder voll geheilt.');
    return;
  }

  state.message = `${winner} stoppt deine Serie bei ${state.runWins}. Bestwert: ${state.bestRun}.`;
  logLine(state.message);
  render();
}

async function startBattle() {
  state.phase = 'battle';
  state.round = 4;
  state.message = `${currentEnemyLabel()} nimmt die Herausforderung an.`;
  resetBattleState();
  state.phase = 'battle';
  ensureOpponentTeamState();
  render();

  const playerTeam = state.playerPreview.map((member) => member.set);
  const opponentTeam = state.opponentPreview.map((member) => member.set);
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  state.battle = {streams};

  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const request = JSON.parse(line.slice(9));
          state.playerRequest = request;
          state.actionLocked = false;
          if (request.teamPreview) {
            streams.p1.write('team 1, 2, 3');
          } else {
            updatePlayerStateFromRequest(request);
            render();
          }
        } else if (line.startsWith('|error|')) {
          logLine(line.replace('|error|', ''));
          state.actionLocked = false;
          render();
        }
      }
    }
  })();

  void (async () => {
    for await (const chunk of streams.p2) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('|request|')) continue;
        const request = JSON.parse(line.slice(9));
        if (request.teamPreview) {
          streams.p2.write('team 1, 2, 3');
        } else {
          const choice = chooseBattleAction(request, Dex, state.opponentPreview, state.active.p1);
          streams.p2.write(choice);
        }
      }
    }
  })();

  void (async () => {
    for await (const chunk of streams.omniscient) {
      await animateBattleChunk(chunk);
    }
  })();

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen9customgame'})}
>player p1 ${JSON.stringify({name: 'Du', team: Teams.pack(playerTeam)})}
>player p2 ${JSON.stringify({name: currentEnemyLabel(), team: Teams.pack(opponentTeam)})}`);
}

function submitChoice(choice) {
  if (!state.battle || !state.playerRequest || state.actionLocked) return;
  state.actionLocked = true;
  render();
  state.battle.streams.p1.write(choice);
}

function flashSide(side, cls) {
  state.flash[side] = cls;
  render();
  setTimeout(() => {
    state.flash[side] = '';
    render();
  }, 320);
}

function showFx(text) {
  state.fxText = text;
  render();
  setTimeout(() => {
    state.fxText = '';
    render();
  }, 760);
}

function movePreviewMon(index, direction) {
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= state.playerPreview.length) return;
  [state.playerPreview[index], state.playerPreview[swapIndex]] = [state.playerPreview[swapIndex], state.playerPreview[index]];
  render();
}

function resetDraft() {
  state.phase = 'draft';
  state.draftedIds = new Set();
  state.playerDraft = [];
  state.opponentDraft = [];
  state.playerLoadout = [];
  state.opponentLoadout = [];
  state.playerPreview = [];
  state.opponentPreview = [];
  state.round = 1;
  state.pack = [];
  state.logs = [];
  state.runWins = 0;
  state.enemyNumber = 1;
  state.enemyName = '';
  state.message = 'Waehle dein erstes Draft-Pokemon.';
  resetBattleState();
  nextPack();
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#12070e;--bg2:#25111f;--cream:#fff5e7;--ink:#211218;--muted:#bda8a6;--line:rgba(255,255,255,.12);--accent:#ff875e;--accent2:#ffcc67}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:"Segoe UI",sans-serif;background:radial-gradient(circle at top left,rgba(255,135,94,.18),transparent 25%),radial-gradient(circle at bottom right,rgba(255,204,103,.18),transparent 24%),linear-gradient(180deg,#14070d,#24111d 52%,#0f111f);color:var(--cream);padding:24px}
    .draft-shell{width:min(1380px,100%);margin:0 auto;display:grid;grid-template-columns:300px minmax(0,1fr) 300px;gap:20px;align-items:start}.column{background:rgba(18,11,20,.82);border:1px solid var(--line);border-radius:30px;box-shadow:0 28px 60px rgba(0,0,0,.32);backdrop-filter:blur(18px);padding:20px}.left,.right{display:grid;align-content:start;gap:16px;position:sticky;top:24px;height:fit-content}.center{display:grid;gap:18px;min-width:0}
    .back-link{text-decoration:none;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.06)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:#ffb184;font-size:.8rem}.title-block h1{margin:8px 0 10px;font-size:clamp(2.1rem,4.4vw,4rem);line-height:.92}.title-block p{color:var(--muted)}
    .panel,.hero-panel,.draft-card,.roster-card,.metric,.combat-card,.choice-btn,.empty-card,.draft-message,.summary-card,.log-line,.summary-pill{border:1px solid var(--line);border-radius:22px;background:rgba(255,255,255,.04)}
    .panel{padding:16px}.panel-title{font-size:.84rem;text-transform:uppercase;letter-spacing:.16em;color:#ffbe9c;margin-bottom:12px}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:12px}.metric span{display:block;color:var(--muted);font-size:.78rem}.metric strong{font-size:1.05rem}
    .team-panel{display:grid;gap:10px}.roster-card{padding:12px;color:#1a1012}.roster-head{display:flex;justify-content:space-between;gap:10px}.types,.move-preview{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.types span,.move-preview span{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.38);font-size:.8rem}.tiny{font-size:.82rem;opacity:.9}.synergy-box{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 0 0}.synergy-box div{padding:10px;border-radius:16px;background:rgba(255,255,255,.04)}
    .hero-panel{padding:18px;display:flex;justify-content:space-between;gap:16px;align-items:end}.draft-message{padding:14px 16px;min-height:64px;max-width:420px}
    .draft-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.preview-panel{padding:18px;border-radius:24px;background:rgba(255,255,255,.03);border:1px solid var(--line)}.preview-list{display:grid;gap:12px}.preview-card{padding:14px;color:#1a1012;border-radius:20px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.preview-body{display:grid;gap:6px}.preview-controls{display:flex;gap:8px}.mini-btn{padding:8px 10px;border:none;border-radius:12px;background:rgba(255,255,255,.55);font:inherit;cursor:pointer}
    .summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.summary-card{padding:14px;display:grid;gap:4px}.summary-card strong{font-size:1.35rem}
    .draft-card{padding:18px;text-align:left;color:#1a1012;cursor:pointer;transition:transform .16s ease, box-shadow .16s ease;min-height:320px}.draft-card:hover{transform:translateY(-3px);box-shadow:0 16px 30px rgba(0,0,0,.16)}.draft-num{font-size:.82rem;opacity:.7}.draft-card h3{margin:8px 0 10px;font-size:1.6rem}.stat-strip{display:flex;flex-wrap:wrap;gap:10px;font-size:.84rem;margin-top:10px}
    .battle-field{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr) minmax(0,280px);gap:14px;padding:18px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.06))}.combatant{display:grid;align-items:center}.combat-card{min-width:0;padding:18px;color:#1a1012;transition:transform .18s ease, filter .18s ease, opacity .18s ease}.combat-card.waiting{background:rgba(255,255,255,.05);color:var(--cream)}.combat-card.flash-hit{transform:translateX(8px);filter:brightness(.92)}.combat-card.flash-heal{transform:scale(1.03);filter:saturate(1.2)}.combat-card.flash-switch{transform:translateY(-6px)}.combat-card.flash-faint{opacity:.45;filter:grayscale(1)}.hp-bar{height:12px;background:rgba(0,0,0,.14);border-radius:999px;overflow:hidden;margin-top:10px}.hp-bar.slim{height:9px}.hp-fill{height:100%;background:linear-gradient(90deg,#5be18c,#d6ffb8)}.status-row{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px}.status-pill{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.45);font-size:.8rem}
    .arena-center{min-height:260px;border-radius:26px;background:radial-gradient(circle at center,rgba(255,204,103,.18),transparent 36%),rgba(255,255,255,.03);display:grid;place-items:center;position:relative;overflow:hidden}.arena-ring{width:220px;height:220px;border-radius:50%;border:2px solid rgba(255,255,255,.12)}.arena-lane{position:absolute;width:52%;height:1px;border-top:1px dashed rgba(255,255,255,.1)}.lane-top{top:30%}.lane-bottom{bottom:30%}.turn-banner{position:absolute;top:18px;left:18px;right:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.turn-banner div{padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.06)}.fx-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.85);padding:12px 18px;border-radius:999px;background:rgba(255,255,255,.14);opacity:0;font-weight:800;letter-spacing:.08em;transition:all .18s ease;pointer-events:none}.fx-text.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.arena-log{position:absolute;inset:auto 18px 18px 18px;display:grid;gap:6px;font-size:.88rem;color:#ffe6da}
    .attack-fx{position:absolute;display:grid;place-items:center;min-width:110px;height:40px;padding:0 16px;border-radius:999px;opacity:0;color:#190f13;font-weight:800;text-transform:uppercase;letter-spacing:.08em;pointer-events:none}.attack-fx span{position:relative;z-index:1;font-size:.72rem}.attack-fx.show{opacity:1}.attack-fx.physical,.attack-fx.special{background:linear-gradient(135deg,#ffe6bf,#ffc27f)}.attack-fx.status{background:linear-gradient(135deg,#d8d6ff,#ffcce0)}.attack-fx.p1{left:22%;bottom:28%;animation:attackFromPlayer .62s ease}.attack-fx.p2{right:22%;top:28%;animation:attackFromEnemy .62s ease}.attack-fx.fire{background:linear-gradient(135deg,#ffb172,#ff6f5e)}.attack-fx.water{background:linear-gradient(135deg,#9ed4ff,#6aa5ff)}.attack-fx.grass{background:linear-gradient(135deg,#bcf58f,#6dd58b)}.attack-fx.electric{background:linear-gradient(135deg,#fff2a5,#ffd448)}.attack-fx.psychic{background:linear-gradient(135deg,#ffc2ea,#ff8fd4)}.attack-fx.ice{background:linear-gradient(135deg,#d4ffff,#9ce3ff)}.attack-fx.fighting{background:linear-gradient(135deg,#ffc1a8,#ff7c64)}.attack-fx.ground,.attack-fx.rock{background:linear-gradient(135deg,#f1d091,#c89e57)}.attack-fx.poison,.attack-fx.ghost{background:linear-gradient(135deg,#d3b4ff,#8f7cff)}.attack-fx.dark{background:linear-gradient(135deg,#d0c5c1,#8a7b77);color:#fff5e7}.attack-fx.dragon{background:linear-gradient(135deg,#bfd0ff,#7f9bff)}.attack-fx.bug{background:linear-gradient(135deg,#e5f59f,#a9d85d)}.attack-fx.normal,.attack-fx.flying,.attack-fx.steel{background:linear-gradient(135deg,#ece5d7,#b9cad8)}
    .bench-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.bench-panel{padding:16px;border-radius:24px;background:rgba(255,255,255,.03);border:1px solid var(--line)}.bench-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.bench-card{padding:12px;color:#1a1012;border-radius:18px}.bench-card.can-switch{box-shadow:inset 0 0 0 2px rgba(255,255,255,.18)}
    .action-panel{display:grid;gap:14px;padding:18px;border-radius:26px;background:rgba(255,255,255,.03)}.action-header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.summary-pill{padding:12px 14px;border-radius:18px}.choice-stack{display:grid;gap:10px}.choice-section-title{font-size:.84rem;text-transform:uppercase;letter-spacing:.14em;color:#ffbe9c}.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.switch-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.choice-btn,.secondary-btn{padding:14px 16px;border:none;font:inherit;font-weight:700;cursor:pointer}.choice-btn{display:flex;justify-content:space-between;gap:10px;color:#190f13;background:linear-gradient(180deg,#ffe6bf,#ffc27f)}.choice-btn.switch{background:linear-gradient(180deg,#ffd0e9,#ff9bd4)}.choice-btn:disabled,.mini-btn:disabled,.secondary-btn:disabled{opacity:.45;cursor:default;transform:none}.secondary-btn{border-radius:18px;background:linear-gradient(180deg,#ffe8bc,#ffd064);color:#190f13}
    .notes{margin:0;padding-left:18px;color:var(--muted)}.log-list{display:grid;gap:10px;max-height:420px;overflow:auto}.log-line{padding:12px 14px;color:#ffe6da}.empty-card{padding:14px 16px;color:var(--muted)}
    @keyframes attackFromPlayer{0%{transform:translate(-30px,24px) scale(.8);opacity:0}15%{opacity:1}100%{transform:translate(180px,-120px) scale(1.05);opacity:0}}@keyframes attackFromEnemy{0%{transform:translate(30px,-24px) scale(.8);opacity:0}15%{opacity:1}100%{transform:translate(-180px,120px) scale(1.05);opacity:0}}
    @media (max-width:1240px){.battle-field{grid-template-columns:1fr}.combatant{justify-items:stretch}.turn-banner,.choice-grid,.switch-grid,.preview-grid,.bench-grid,.bench-list{grid-template-columns:1fr}}
    @media (max-width:1120px){.draft-shell{grid-template-columns:1fr}.left,.right{position:static}.center{order:1}.left{order:2}.right{order:3}.draft-grid,.choice-grid,.switch-grid,.preview-grid,.bench-grid,.bench-list,.turn-banner,.summary-grid{grid-template-columns:1fr}}
    @media (max-width:720px){body{padding:16px}.column{padding:16px;border-radius:24px}.hero-panel,.action-header{flex-direction:column;align-items:flex-start}.draft-message{max-width:none;width:100%}.draft-card,.preview-card,.combat-card,.bench-card{border-radius:18px}.choice-btn,.secondary-btn{padding:13px 14px}.preview-card{flex-direction:column}.attack-fx.p1{left:16%}.attack-fx.p2{right:16%}}
  `;
  document.head.appendChild(style);
}

injectStyles();
resetDraft();

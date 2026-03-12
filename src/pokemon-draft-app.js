import Peer from 'peerjs';
import {BattleStreams, Dex, Teams} from '@pkmn/sim';
import {
  POKEMON_POOL,
  chooseBattleAction,
  chooseTeamOrder,
  conditionToPercent,
  draftSynergy,
  drawPack,
  estimateRole,
  generateSet,
  pickOpponentDraft,
  previewMoves,
  setArchetype,
  shuffle,
  totalBattleStats,
} from './pokemon-draft-core.js';

const dex = Dex.forGen(1);
const app = document.getElementById('app');
const BEST_RUN_KEY = 'pokemon-battler-rby-best-run-v3';
const ENEMY_NAMES = ['Brock', 'Misty', 'Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Lance'];

const state = {
  phase: 'menu',
  playMode: 'bot',
  draftedIds: new Set(),
  pack: [],
  playerDraft: [],
  opponentDraft: [],
  playerLoadout: [],
  opponentLoadout: [],
  playerPreview: [],
  opponentPreview: [],
  teamBuilderSelection: [],
  search: '',
  runWins: 0,
  bestRun: loadBestRun(),
  enemyNumber: 1,
  enemyName: '',
  battle: null,
  playerRequest: null,
  logs: [],
  message: 'Wähle Bot-Serie oder Link Battle.',
  lastMove: {p1: '', p2: ''},
  flash: {p1: '', p2: ''},
  fxText: '',
  attackFx: null,
  actionLocked: false,
  battleFinished: false,
  teamStates: {p1: [], p2: []},
  active: {p1: null, p2: null},
  hostJoinCode: '',
  link: freshLinkState(),
};

function freshLinkState() {
  return {
    peer: null,
    conn: null,
    peerId: '',
    remotePeerId: '',
    role: 'host',
    connected: false,
    localName: 'Trainer',
    remoteName: 'Gegner',
    localLocked: false,
    remoteLocked: false,
    remoteTeamCount: 0,
    localReady: false,
    remoteReady: false,
    remoteBattleReady: null,
    localSide: 'p1',
    status: 'Noch keine Verbindung.',
  };
}

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
  } catch {}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function currentLocalSide() {
  return state.playMode === 'link' ? state.link.localSide : 'p1';
}

function currentRemoteSide() {
  return currentLocalSide() === 'p1' ? 'p2' : 'p1';
}

function ownTeamState() {
  return state.teamStates[currentLocalSide()];
}

function opposingTeamState() {
  return state.teamStates[currentRemoteSide()];
}

function ownActive() {
  return state.active[currentLocalSide()];
}

function opposingActive() {
  return state.active[currentRemoteSide()];
}

function typeGradient(types) {
  const palette = {
    Normal: ['#c8c3ad', '#efe6c7'], Fire: ['#f59a52', '#f8d66f'], Water: ['#4d95d9', '#a9d9f8'],
    Electric: ['#c7aa2e', '#f6e58d'], Grass: ['#4d7d47', '#b5d39c'], Ice: ['#74b7c9', '#dff7fb'],
    Fighting: ['#8f4539', '#e7a896'], Poison: ['#7a5199', '#d9b7ee'], Ground: ['#8f6a42', '#d8bf8c'],
    Flying: ['#7998c8', '#dbe5f4'], Psychic: ['#b45579', '#f6bcd0'], Bug: ['#718b2f', '#d8e79d'],
    Rock: ['#8a7757', '#d8c6a0'], Ghost: ['#5d567a', '#c5c0df'], Dragon: ['#5067b8', '#c8d4ff'],
  };
  const first = palette[types[0]] || ['#7a8a75', '#d5deca'];
  const second = palette[types[1]] || first;
  return `linear-gradient(145deg, ${first[0]}, ${second[1]})`;
}

function compactMeta(parts) {
  return parts.filter(Boolean).join(' • ');
}

function spriteTag(member, facing = 'front', size = 'md') {
  if (!member?.sprites?.[facing]) return '';
  return `<img class="sprite ${size} ${facing}" src="${member.sprites[facing]}" alt="${member.name}">`;
}

function logLine(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 160);
}

function nextEnemyName() {
  return ENEMY_NAMES[(state.enemyNumber - 1) % ENEMY_NAMES.length];
}

function currentEnemyLabel() {
  return state.playMode === 'bot' ? `${state.enemyName || 'Gegner'} #${state.enemyNumber}` : state.link.remoteName;
}

function createLoadout(species) {
  const set = generateSet(species, dex);
  return {...species, set, archetype: setArchetype(species, set), moveNames: set.moves.map((moveId) => dex.moves.get(moveId).name)};
}

function filteredPool() {
  const query = state.search.trim().toLowerCase();
  if (!query) return POKEMON_POOL;
  return POKEMON_POOL.filter((species) => species.name.toLowerCase().includes(query) || String(species.num).includes(query));
}

function renderRosterCard(member, reveal) {
  return `<div class="roster-card" style="background:${typeGradient(member.types)}">
    <div class="roster-top">${spriteTag(member, 'front', 'sm')}<div><strong>${member.name}</strong><div class="tiny">#${member.num} • ${member.types.join(' / ')}</div></div></div>
    <div class="tiny">${compactMeta([estimateRole(member), member.archetype])}</div>
    <div class="tiny">${reveal ? `L100 ${member.battleStats.hp}/${member.battleStats.atk}/${member.battleStats.def}/${member.battleStats.spc}/${member.battleStats.spe}` : 'Daten verborgen'}</div>
  </div>`;
}

function renderSidePanel(title, team, reveal) {
  const synergy = team.length ? draftSynergy(team) : null;
  return `<div class="info-card"><div class="card-title">${title}</div>
    <div class="team-stack">${team.length ? team.map((member) => renderRosterCard(member, reveal)).join('') : '<div class="empty-card">Noch keine Auswahl.</div>'}</div>
    ${synergy ? `<div class="synergy-grid"><div><span>Typen</span><strong>${synergy.typeCoverage}</strong></div><div><span>Rollen</span><strong>${synergy.roleCoverage}</strong></div><div><span>Control</span><strong>${synergy.control}</strong></div></div>` : ''}
  </div>`;
}

function renderOpponentPanel() {
  const hidden = state.playMode === 'link' && state.phase !== 'battle';
  const team = state.playMode === 'bot' ? (state.phase === 'draft' ? state.opponentDraft : state.opponentLoadout) : [];
  return `<div class="info-card"><div class="card-title">${state.playMode === 'bot' ? currentEnemyLabel() : 'Gegner'}</div>
    ${hidden ? `<div class="hidden-panel"><strong>${state.link.connected ? state.link.remoteName : 'Kein Gegner verbunden'}</strong><span>${state.link.remoteLocked ? `${state.link.remoteTeamCount}/3 Pokémon gelockt` : 'Team noch nicht gelockt'}</span><span>${state.link.remoteReady ? 'Bereit für den Kampf' : 'Ordnet noch das Team'}</span></div>` : `<div class="team-stack">${team.length ? team.map((member) => renderRosterCard(member, state.playMode === 'bot')).join('') : '<div class="empty-card">Noch keine Sichtung.</div>'}</div>`}
  </div>`;
}

function renderMenuStage() {
  return `<section class="hero-card"><div><div class="eyebrow">Moduswahl</div><h2>Kanto Link Arena</h2></div><p>${state.message}</p></section>
    <section class="mode-grid">
      <button class="mode-card" data-action="start-bot"><span class="eyebrow">Solo</span><h3>Bot-Serie</h3><p>Drafte drei Kanto-Pokémon und spiele eine fortlaufende Arena-Serie.</p></button>
      <button class="mode-card" data-action="start-link"><span class="eyebrow">Online</span><h3>Link Battle</h3><p>Verbinde dich direkt mit einem zweiten Spieler und halte Team und Reihenfolge bis zum Start verdeckt.</p></button>
    </section>
    <section class="source-strip"><div class="source-card"><strong>Sprites</strong><span>Aus generation-1.tar.gz</span></div><div class="source-card"><strong>Stats</strong><span>Level-100-Maxwerte aus Psypokes</span></div><div class="source-card"><strong>Movesets</strong><span>RBY-Presets plus Gen-1-Fallback</span></div></section>`;
}

function renderDraftCard(species) {
  return `<button class="draft-card" style="background:${typeGradient(species.types)}" data-draft-id="${species.id}">
    <div class="draft-head">${spriteTag(species, 'front', 'md')}<div><div class="tiny">#${species.num}</div><h3>${species.name}</h3></div></div>
    <div class="types">${species.types.map((type) => `<span>${type}</span>`).join('')}</div>
    <div class="stat-line">Base ${species.baseStats.hp}/${species.baseStats.atk}/${species.baseStats.def}/${species.baseStats.spc}/${species.baseStats.spe}</div>
    <div class="stat-line">L100 ${species.battleStats.hp}/${species.battleStats.atk}/${species.battleStats.def}/${species.battleStats.spc}/${species.battleStats.spe}</div>
    <div class="move-chips">${previewMoves(species, dex).map((move) => `<span>${move}</span>`).join('')}</div>
  </button>`;
}

function renderCompactMon(member) {
  return `<div class="compact-mon">${spriteTag(member, 'front', 'xs')}<div><strong>${member.name}</strong><span>${member.moveNames?.join(', ') || ''}</span></div></div>`;
}

function renderLoadoutSummary(team, title) {
  return `<div class="summary-card wide"><div class="card-title">${title}</div><div class="summary-team">${team.map((member) => renderCompactMon(member)).join('')}</div></div>`;
}

function renderPreviewCard(member, index, controls) {
  return `<div class="preview-card" style="background:${typeGradient(member.types)}">
    ${spriteTag(member, 'front', 'sm')}
    <div class="preview-copy"><strong>${index + 1}. ${member.name}</strong><div class="tiny">${compactMeta([member.types.join(' / '), member.archetype])}</div><div class="tiny">${member.moveNames.join(', ')}</div></div>
    ${controls ? `<div class="preview-controls"><button class="mini-btn" data-move-index="${index}" data-move-dir="-1" ${index === 0 ? 'disabled' : ''}>hoch</button><button class="mini-btn" data-move-index="${index}" data-move-dir="1" ${index === state.playerPreview.length - 1 ? 'disabled' : ''}>runter</button></div>` : ''}
  </div>`;
}

function renderDraftStage() {
  return `<section class="hero-card"><div><div class="eyebrow">Bot-Serie</div><h2>Draft Phase</h2></div><p>${state.message}</p></section>
    <section class="draft-grid">${state.playerDraft.length ? renderLoadoutSummary(state.playerDraft.map((species) => createLoadout(species)), 'Bisheriger Kern') : ''}${state.pack.map((species) => renderDraftCard(species)).join('')}</section>`;
}

function renderBotPreviewStage() {
  return `<section class="hero-card"><div><div class="eyebrow">Arena Preview</div><h2>${currentEnemyLabel()}</h2></div><p>${state.message}</p></section>
    <section class="preview-grid"><div class="preview-panel"><div class="card-title">Deine Reihenfolge</div>${state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join('')}</div><div class="preview-panel"><div class="card-title">Gegnerteam</div>${state.opponentPreview.map((member, index) => renderPreviewCard(member, index, false)).join('')}</div></section>
    <section class="cta-row"><button class="primary-btn" data-action="start-battle">Kampf starten</button><button class="secondary-btn" data-action="go-menu">Zur Moduswahl</button></section>`;
}

function renderLinkSetupStage() {
  return `<section class="hero-card"><div><div class="eyebrow">Link Battle</div><h2>Verbindung aufbauen</h2></div><p>${state.link.status}</p></section>
    <section class="link-grid"><div class="preview-panel"><div class="card-title">Host</div><p>Erzeuge einen Raumcode und teile ihn.</p><button class="primary-btn" data-action="host-link">Raum öffnen</button><div class="code-box">${state.link.peerId || 'Noch kein Code'}</div></div><div class="preview-panel"><div class="card-title">Gast</div><p>Verbinde dich mit dem Raumcode des Hosts.</p><input id="joinCodeInput" class="text-input" placeholder="Raumcode eingeben" value="${state.hostJoinCode}"><button class="primary-btn" data-action="join-link">Verbinden</button></div></section>
    <section class="cta-row"><button class="secondary-btn" data-action="go-menu">Zurück</button></section>`;
}

function renderTeamBuilderStage() {
  const selected = state.teamBuilderSelection.map((species) => createLoadout(species));
  return `<section class="hero-card"><div><div class="eyebrow">Link Battle</div><h2>Baue dein 3er-Team</h2></div><p>${state.link.connected ? `Verbunden mit ${state.link.remoteName}. Gegnerteam bleibt verborgen.` : 'Warte auf Verbindung.'}</p></section>
    <section class="builder-toolbar"><input id="searchInput" class="text-input" placeholder="Pokémon oder Nummer suchen" value="${state.search}"><div class="selection-pill">${state.teamBuilderSelection.length}/3 gewählt</div><button class="primary-btn" data-action="lock-link-team" ${state.teamBuilderSelection.length !== 3 || !state.link.connected ? 'disabled' : ''}>Team sperren</button></section>
    ${selected.length ? renderLoadoutSummary(selected, 'Ausgewählte Pokémon') : ''}
    <section class="builder-grid">${filteredPool().map((species) => {
      const chosen = state.teamBuilderSelection.some((entry) => entry.id === species.id);
      return `<button class="builder-card ${chosen ? 'selected' : ''}" data-pick-id="${species.id}" style="background:${typeGradient(species.types)}">${spriteTag(species, 'front', 'sm')}<strong>${species.name}</strong><span>#${species.num}</span><span>${species.types.join(' / ')}</span><span>L100 ${totalBattleStats(species.battleStats)}</span></button>`;
    }).join('')}</section>`;
}

function renderLinkPreviewStage() {
  return `<section class="hero-card"><div><div class="eyebrow">Verdeckte Reihenfolge</div><h2>Ordne dein Team</h2></div><p>Du siehst nicht, was der Gegner umstellt. Erst beim Kampfstart werden Teams offenbart.</p></section>
    <section class="preview-grid single"><div class="preview-panel"><div class="card-title">Deine Reihenfolge</div>${state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join('')}</div><div class="preview-panel"><div class="card-title">Gegnerstatus</div><div class="hidden-panel"><strong>${state.link.remoteName}</strong><span>${state.link.remoteLocked ? 'Team gelockt' : 'Team noch offen'}</span><span>${state.link.remoteReady ? 'Bereit' : 'Noch nicht bereit'}</span></div></div></section>
    <section class="cta-row"><button class="primary-btn" data-action="ready-link-battle" ${!state.link.connected || !state.link.localLocked ? 'disabled' : ''}>Bereit für den Kampf</button><button class="secondary-btn" data-action="reset-link-team">Team ändern</button></section>`;
}

function renderCombatant(mon, label, facing, sideKey) {
  if (!mon) return '<div class="combat-card empty-card">Warte auf Aktivierung.</div>';
  return `<div class="combat-card ${state.flash[sideKey]}" style="background:${typeGradient(mon.types || ['Normal'])}">
    <div class="combat-head"><div><span class="eyebrow">${label}</span><strong>${mon.name}</strong></div>${spriteTag(mon, facing, 'lg')}</div>
    <div class="stat-line">${mon.condition || '100/100'} • ${mon.status || 'OK'}</div>
    <div class="hp-bar"><div class="hp-fill" style="width:${conditionToPercent(mon.condition)}%"></div></div>
    <div class="tiny">${compactMeta([mon.types?.join(' / '), mon.archetype])}</div>
  </div>`;
}

function renderBench(team, ownSide) {
  const bench = team.filter((mon) => !mon.active);
  if (!bench.length) return '<div class="empty-card">Keine Reserve sichtbar.</div>';
  return `<div class="bench-grid">${bench.map((mon) => `<div class="bench-card" style="background:${typeGradient(mon.types || ['Normal'])}">${spriteTag(mon, ownSide ? 'back' : 'front', 'sm')}<strong>${mon.name}</strong><div class="hp-bar slim"><div class="hp-fill" style="width:${conditionToPercent(mon.condition)}%"></div></div><div class="tiny">${mon.condition}</div></div>`).join('')}</div>`;
}

function renderChoiceButtons() {
  const request = state.playerRequest;
  if (!request) return '<div class="empty-card">Warte auf den nächsten Request.</div>';
  const disabled = state.actionLocked ? 'disabled' : '';
  if (request.forceSwitch) {
    return `<div class="choice-grid">${request.side.pokemon.map((mon, index) => ({mon, index})).filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt')).map(({mon, index}) => `<button class="choice-btn switch" ${disabled} data-choice="switch ${index + 1}">${mon.details.split(',')[0]}<span>Pflichtwechsel</span></button>`).join('')}</div>`;
  }
  const moves = request.active?.[0]?.moves.map((move, index) => `<button class="choice-btn" ${disabled} data-choice="move ${index + 1}">${move.move}<span>${move.pp}/${move.maxpp} PP</span></button>`).join('') || '<div class="empty-card">Keine Moves verfügbar.</div>';
  const switches = !request.active?.[0]?.trapped
    ? request.side.pokemon.map((mon, index) => ({mon, index})).filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt')).map(({mon, index}) => `<button class="choice-btn switch" ${disabled} data-choice="switch ${index + 1}">${mon.details.split(',')[0]}<span>Zug opfern</span></button>`).join('')
    : '';
  return `<div class="choice-grid">${moves}</div>${switches ? `<div class="choice-grid">${switches}</div>` : ''}`;
}

function renderBattleStage() {
  return `<section class="hero-card"><div><div class="eyebrow">Battle Phase</div><h2>${currentEnemyLabel()}</h2></div><p>${state.message}</p></section>
    <section class="battle-layout"><div class="combat-lane enemy">${renderCombatant(opposingActive(), state.playMode === 'link' ? state.link.remoteName : currentEnemyLabel(), 'front', currentRemoteSide())}</div><div class="battle-center"><div class="turn-board"><div><span>Gegner</span><strong>${state.lastMove[currentRemoteSide()] || 'noch keiner'}</strong></div><div><span>Du</span><strong>${state.lastMove[currentLocalSide()] || 'noch keiner'}</strong></div></div><div class="battle-ring"></div><div class="fx-callout ${state.fxText ? 'show' : ''}">${state.fxText}</div>${state.attackFx ? `<div class="attack-tag ${state.attackFx.side} ${state.attackFx.type} ${state.attackFx.category}">${state.attackFx.label}</div>` : ''}</div><div class="combat-lane player">${renderCombatant(ownActive(), 'Du', 'back', currentLocalSide())}</div></section>
    <section class="bench-row"><div class="preview-panel"><div class="card-title">Deine Reserve</div>${renderBench(ownTeamState(), true)}</div><div class="preview-panel"><div class="card-title">Gegnerische Reserve</div>${renderBench(opposingTeamState(), false)}</div></section>
    <section class="action-panel"><div class="card-title">Aktionen</div>${renderChoiceButtons()}<div class="cta-row"><button class="secondary-btn" data-action="go-menu">Zur Moduswahl</button></div></section>`;
}

function renderStage() {
  if (state.phase === 'menu') return renderMenuStage();
  if (state.phase === 'draft') return renderDraftStage();
  if (state.phase === 'preview') return renderBotPreviewStage();
  if (state.phase === 'link-setup') return renderLinkSetupStage();
  if (state.phase === 'link-builder') return renderTeamBuilderStage();
  if (state.phase === 'link-preview') return renderLinkPreviewStage();
  return renderBattleStage();
}

function render() {
  const ownTeam = state.playMode === 'link'
    ? (state.playerPreview.length ? state.playerPreview : state.playerLoadout)
    : (state.phase === 'draft' ? state.playerDraft : (state.playerPreview.length ? state.playerPreview : state.playerLoadout));
  app.innerHTML = `<div class="arena-shell">
    <aside class="left-rail"><a class="back-link" href="../index.html#games">Zurück zur Startseite</a><div class="brand-card"><div class="brand-top"><span class="eyebrow">Pokemon Battler</span><span class="format-pill">RBY / L100</span></div><h1>Kanto Link Arena</h1><p>Originale Gen-1-Sprites, Level-100-Maxwerte und Gen-1-Kampfregeln über die Showdown-kompatible Engine.</p></div><div class="info-card"><div class="card-title">Status</div><div class="metric-grid"><div class="metric"><span>Modus</span><strong>${state.playMode === 'bot' ? 'Bot-Serie' : 'Link Battle'}</strong></div><div class="metric"><span>Pokémon</span><strong>151</strong></div><div class="metric"><span>Best Run</span><strong>${state.bestRun}</strong></div><div class="metric"><span>Format</span><strong>3v3 Singles</strong></div></div></div>${renderSidePanel('Dein Team', ownTeam, true)}${renderOpponentPanel()}</aside>
    <main class="main-stage">${renderStage()}</main>
    <aside class="right-rail"><div class="info-card"><div class="card-title">Mechanik</div><ul class="notes"><li>Die Kämpfe laufen in gen1customgame.</li><li>Link-Battle zeigt gegnerische Anpassungen vor Kampfbeginn nicht live.</li><li>Keine modernen Items, Abilities, EVs oder Natures.</li></ul></div><div class="info-card"><div class="card-title">Battle Log</div><div class="log-list">${state.logs.map((line) => `<div class="log-line">${line}</div>`).join('')}</div></div></aside>
  </div>`;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => handleAction(button.dataset.action)));
  document.querySelectorAll('[data-draft-id]').forEach((button) => button.addEventListener('click', () => draftSpecies(button.dataset.draftId)));
  document.querySelectorAll('[data-pick-id]').forEach((button) => button.addEventListener('click', () => toggleBuilderPick(button.dataset.pickId)));
  document.querySelectorAll('[data-move-index]').forEach((button) => button.addEventListener('click', () => movePreviewMon(Number(button.dataset.moveIndex), Number(button.dataset.moveDir))));
  document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => submitChoice(button.dataset.choice)));
  document.getElementById('joinCodeInput')?.addEventListener('input', (event) => { state.hostJoinCode = event.target.value.trim(); });
  document.getElementById('searchInput')?.addEventListener('input', (event) => { state.search = event.target.value; render(); });
}

function handleAction(action) {
  if (action === 'start-bot') {
    state.playMode = 'bot';
    resetDraft();
    return;
  }
  if (action === 'start-link') {
    state.playMode = 'link';
    state.phase = 'link-setup';
    state.message = 'Öffne einen Raum oder tritt einem Raum bei.';
    render();
    return;
  }
  if (action === 'go-menu') {
    teardownLink();
    resetBattleState();
    state.phase = 'menu';
    state.playMode = 'bot';
    state.message = 'Wähle Bot-Serie oder Link Battle.';
    render();
    return;
  }
  if (action === 'start-battle') startBotBattle();
  if (action === 'host-link') startHosting();
  if (action === 'join-link') joinHost();
  if (action === 'lock-link-team') lockLinkTeam();
  if (action === 'ready-link-battle') readyLinkBattle();
  if (action === 'reset-link-team') {
    state.phase = 'link-builder';
    state.link.localReady = false;
    sendLinkMessage({type: 'preview-reset'});
    render();
  }
}

function nextPack() {
  state.pack = drawPack(state.draftedIds, 3);
  render();
}

function resetDraft() {
  resetBattleState();
  state.phase = 'draft';
  state.draftedIds = new Set();
  state.pack = [];
  state.playerDraft = [];
  state.opponentDraft = [];
  state.playerLoadout = [];
  state.opponentLoadout = [];
  state.playerPreview = [];
  state.opponentPreview = [];
  state.runWins = 0;
  state.enemyNumber = 1;
  state.enemyName = '';
  state.logs = [];
  state.message = 'Wähle dein erstes Pokémon für die Bot-Serie.';
  nextPack();
}

function draftSpecies(id) {
  const picked = state.pack.find((species) => species.id === id);
  if (!picked) return;
  state.playerDraft.push(picked);
  state.draftedIds.add(picked.id);
  const opponentPick = pickOpponentDraft(state.pack.filter((species) => species.id !== id), state.opponentDraft, state.playerDraft, dex);
  if (opponentPick) {
    state.opponentDraft.push(opponentPick);
    state.draftedIds.add(opponentPick.id);
  }
  if (state.playerDraft.length === 3) {
    state.playerLoadout = state.playerDraft.map(createLoadout);
    prepareNextEnemy('Dein Team ist gesetzt. Ordne jetzt den Lead.');
    return;
  }
  state.message = `Draft-Runde ${state.playerDraft.length + 1}: suche Tempo, Coverage und Schlafkontrolle.`;
  nextPack();
}

function buildOpponentLoadout() {
  const excluded = new Set(state.playerDraft.map((species) => species.id));
  const pool = shuffle(POKEMON_POOL.filter((species) => !excluded.has(species.id)));
  const team = [];
  let index = 0;
  while (team.length < 3 && index < pool.length) {
    const slice = pool.slice(index, index + 6);
    const choice = pickOpponentDraft(slice, team, state.playerLoadout, dex);
    if (choice && !team.some((member) => member.id === choice.id)) team.push(choice);
    index += 6;
  }
  return team.map(createLoadout);
}

function prepareNextEnemy(message) {
  resetBattleState();
  state.phase = 'preview';
  state.enemyName = nextEnemyName();
  state.opponentLoadout = buildOpponentLoadout();
  state.playerPreview = chooseTeamOrder(state.playerLoadout);
  state.opponentPreview = chooseTeamOrder(state.opponentLoadout);
  state.message = message || `${currentEnemyLabel()} wartet in der Arena.`;
  logLine(`${currentEnemyLabel()} betritt die Arena.`);
  render();
}

function movePreviewMon(index, direction) {
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= state.playerPreview.length) return;
  [state.playerPreview[index], state.playerPreview[swapIndex]] = [state.playerPreview[swapIndex], state.playerPreview[index]];
  render();
}

function toggleBuilderPick(id) {
  const species = POKEMON_POOL.find((entry) => entry.id === id);
  if (!species) return;
  const existing = state.teamBuilderSelection.findIndex((entry) => entry.id === id);
  if (existing >= 0) {
    state.teamBuilderSelection.splice(existing, 1);
    render();
    return;
  }
  if (state.teamBuilderSelection.length >= 3) return;
  state.teamBuilderSelection.push(species);
  render();
}

function lockLinkTeam() {
  state.playerLoadout = state.teamBuilderSelection.map(createLoadout);
  state.playerPreview = chooseTeamOrder(state.playerLoadout);
  state.phase = 'link-preview';
  state.link.localLocked = true;
  state.link.localReady = false;
  sendLinkMessage({type: 'team-locked', count: state.playerLoadout.length});
  render();
}

function readyLinkBattle() {
  state.link.localReady = true;
  sendLinkMessage({type: 'battle-ready', roster: state.playerPreview});
  maybeStartHostedBattle();
  render();
}

function startHosting() {
  teardownLink();
  state.link = freshLinkState();
  state.link.role = 'host';
  const peer = new Peer();
  state.link.peer = peer;
  state.link.status = 'Erzeuge Raumcode...';
  peer.on('open', (id) => {
    state.link.peerId = id;
    state.link.status = 'Raum offen. Teile jetzt den Code.';
    render();
  });
  peer.on('connection', (conn) => attachConnection(conn, 'host'));
  peer.on('error', (error) => {
    state.link.status = `Peer-Fehler: ${error.message}`;
    render();
  });
  render();
}

function joinHost() {
  if (!state.hostJoinCode) return;
  teardownLink();
  state.link = freshLinkState();
  state.link.role = 'guest';
  const peer = new Peer();
  state.link.peer = peer;
  state.link.status = 'Verbinde zum Host...';
  peer.on('open', () => attachConnection(peer.connect(state.hostJoinCode, {reliable: true}), 'guest'));
  peer.on('error', (error) => {
    state.link.status = `Peer-Fehler: ${error.message}`;
    render();
  });
  render();
}

function attachConnection(conn, role) {
  state.link.conn = conn;
  state.link.role = role;
  conn.on('open', () => {
    state.link.connected = true;
    state.link.remotePeerId = conn.peer;
    state.link.status = 'Verbindung steht. Stelle jetzt dein Team zusammen.';
    state.phase = 'link-builder';
    sendLinkMessage({type: 'hello', name: state.link.localName});
    render();
  });
  conn.on('data', handleLinkMessage);
  conn.on('close', () => {
    state.link.connected = false;
    state.link.status = 'Verbindung getrennt.';
    render();
  });
}

function sendLinkMessage(message) {
  if (state.link.conn?.open) state.link.conn.send(message);
}

function handleLinkMessage(message) {
  if (message.type === 'hello') state.link.remoteName = message.name || 'Gegner';
  if (message.type === 'team-locked') {
    state.link.remoteLocked = true;
    state.link.remoteTeamCount = message.count || 3;
  }
  if (message.type === 'preview-reset') state.link.remoteReady = false;
  if (message.type === 'battle-ready') {
    state.link.remoteReady = true;
    state.link.remoteBattleReady = message;
    maybeStartHostedBattle();
  }
  if (message.type === 'battle-start') {
    state.phase = 'battle';
    state.link.localSide = message.localSide;
    initialiseTeamStates(message.p1Roster, message.p2Roster);
  }
  if (message.type === 'battle-request') {
    state.playerRequest = message.request;
    state.actionLocked = false;
    updateTeamStateFromRequest(currentLocalSide(), message.request);
  }
  if (message.type === 'battle-chunk') void animateBattleChunk(message.chunk);
  if (message.type === 'battle-choice' && state.link.role === 'host' && state.battle) state.battle.streams.p2.write(message.choice);
  render();
}

function maybeStartHostedBattle() {
  if (state.playMode !== 'link' || state.link.role !== 'host' || !state.link.localReady || !state.link.remoteReady || !state.link.remoteBattleReady) return;
  startBattleSimulation({p1Team: state.playerPreview, p2Team: state.link.remoteBattleReady.roster, p1Name: state.link.localName, p2Name: state.link.remoteName, localSide: 'p1', multiplayer: true});
  sendLinkMessage({type: 'battle-start', localSide: 'p2', p1Roster: state.playerPreview, p2Roster: state.link.remoteBattleReady.roster});
}

function teardownLink() {
  state.link.conn?.close?.();
  state.link.peer?.destroy?.();
  state.link = freshLinkState();
  state.teamBuilderSelection = [];
  state.search = '';
}

function startBotBattle() {
  startBattleSimulation({p1Team: state.playerPreview, p2Team: state.opponentPreview, p1Name: 'Du', p2Name: currentEnemyLabel(), localSide: 'p1', multiplayer: false});
}

function initialiseTeamStates(p1Roster, p2Roster) {
  state.teamStates = {
    p1: p1Roster.map((member) => ({...member, condition: '100/100', active: false, status: ''})),
    p2: p2Roster.map((member) => ({...member, condition: '100/100', active: false, status: ''})),
  };
  state.active = {p1: null, p2: null};
}

async function startBattleSimulation({p1Team, p2Team, p1Name, p2Name, localSide, multiplayer}) {
  resetBattleState();
  state.phase = 'battle';
  state.link.localSide = localSide;
  initialiseTeamStates(p1Team, p2Team);
  state.message = `${p2Name} nimmt die Herausforderung an.`;
  render();
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  state.battle = {streams, multiplayer};
  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('|request|')) continue;
        const request = JSON.parse(line.slice(9));
        if (currentLocalSide() === 'p1') {
          state.playerRequest = request;
          state.actionLocked = false;
          updateTeamStateFromRequest('p1', request);
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
        if (multiplayer) sendLinkMessage({type: 'battle-request', request});
        else streams.p2.write(chooseBattleAction(request, dex, p2Team, state.active.p1));
      }
    }
  })();
  void (async () => {
    for await (const chunk of streams.omniscient) {
      if (multiplayer && state.link.role === 'host') sendLinkMessage({type: 'battle-chunk', chunk});
      await animateBattleChunk(chunk);
    }
  })();
  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen1customgame'})}
>player p1 ${JSON.stringify({name: p1Name, team: Teams.pack(p1Team.map((member) => member.set))})}
>player p2 ${JSON.stringify({name: p2Name, team: Teams.pack(p2Team.map((member) => member.set))})}`);
}

function updateTeamStateFromRequest(sideKey, request) {
  state.teamStates[sideKey] = request.side.pokemon.map((mon) => {
    const name = mon.details.split(',')[0];
    const roster = [...state.teamStates[sideKey], ...state.playerPreview, ...state.opponentPreview, ...state.playerLoadout, ...state.opponentLoadout];
    const original = roster.find((entry) => entry.name === name);
    return {...(original || {name, types: ['Normal'], sprites: {}}), condition: mon.condition, active: mon.active, status: mon.status || (mon.condition.endsWith(' fnt') ? 'fainted' : '')};
  });
  state.active[sideKey] = state.teamStates[sideKey].find((mon) => mon.active) || null;
}

function updateRosterState(sideKey, name, updater) {
  const target = state.teamStates[sideKey].find((mon) => mon.name === name);
  if (target) updater(target, state.teamStates[sideKey]);
  state.active[sideKey] = state.teamStates[sideKey].find((mon) => mon.active) || null;
}

function moveAnimationMeta(moveName, sideKey) {
  const move = dex.moves.get(moveName);
  if (!move?.exists) return null;
  return {side: sideKey === currentLocalSide() ? 'local' : 'remote', type: move.type.toLowerCase(), category: move.category.toLowerCase(), label: move.name};
}

function flashSide(sideKey, cls) {
  state.flash[sideKey] = cls;
  render();
  setTimeout(() => { state.flash[sideKey] = ''; render(); }, 300);
}

function showFx(text) {
  state.fxText = text;
  render();
  setTimeout(() => { state.fxText = ''; render(); }, 700);
}

function handleBattleLine(line) {
  if (!line.startsWith('|')) return 0;
  const parts = line.split('|');
  const type = parts[1];
  if (type === 'move') {
    const slot = parts[2] || '';
    const sideKey = slot.startsWith('p1') ? 'p1' : 'p2';
    state.lastMove[sideKey] = parts[3];
    state.attackFx = moveAnimationMeta(parts[3], sideKey);
    showFx(parts[3]);
    logLine(`${slot.split(': ').pop()} nutzt ${parts[3]}.`);
    setTimeout(() => { state.attackFx = null; render(); }, 620);
    return 520;
  }
  if (type === 'switch') {
    const slot = parts[2];
    const sideKey = slot.startsWith('p1') ? 'p1' : 'p2';
    const name = slot.split(': ').pop();
    updateRosterState(sideKey, name, (target, team) => {
      team.forEach((entry) => { entry.active = entry.name === name; });
      target.condition = parts[4];
      target.active = true;
    });
    flashSide(sideKey, 'flash-switch');
    return 320;
  }
  if (type === '-damage' || type === '-heal') {
    const slot = parts[2];
    const sideKey = slot.startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, slot.split(': ').pop(), (target) => { target.condition = parts[3]; });
    flashSide(sideKey, type === '-damage' ? 'flash-hit' : 'flash-heal');
    return 220;
  }
  if (type === '-status' || type === '-curestatus') {
    const slot = parts[2] || '';
    const sideKey = slot.startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, slot.split(': ').pop(), (target) => { target.status = type === '-status' ? parts[3] : ''; });
    return 150;
  }
  if (type === 'faint') {
    const slot = parts[2];
    const sideKey = slot.startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, slot.split(': ').pop(), (target) => {
      target.condition = '0 fnt';
      target.status = 'fainted';
      target.active = false;
    });
    flashSide(sideKey, 'flash-faint');
    return 360;
  }
  if (type === 'turn') {
    state.message = `Zug ${parts[2]}.`;
    return 120;
  }
  if (type === 'win') {
    void finishBattle(parts[2]);
    return 700;
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
  const localWon = state.playMode === 'bot' ? winner === 'Du' : winner === state.link.localName;
  if (state.playMode === 'bot') {
    if (localWon) {
      state.runWins += 1;
      saveBestRun(state.runWins);
      state.enemyNumber += 1;
      state.message = `Sieg. Serie: ${state.runWins}.`;
      render();
      await sleep(1000);
      prepareNextEnemy('Nächster Gegner lädt bereits den Kampf.');
      return;
    }
    state.message = `Serie endet bei ${state.runWins}.`;
    render();
    return;
  }
  state.message = localWon ? 'Du gewinnst das Link Battle.' : 'Das Link Battle geht an den Gegner.';
  render();
}

function submitChoice(choice) {
  if (!state.playerRequest || state.actionLocked) return;
  state.actionLocked = true;
  render();
  if (state.playMode === 'link' && state.link.role === 'guest') {
    sendLinkMessage({type: 'battle-choice', choice});
    return;
  }
  state.battle?.streams?.p1.write(choice);
}

function resetBattleState() {
  state.battle = null;
  state.playerRequest = null;
  state.actionLocked = false;
  state.battleFinished = false;
  state.teamStates = {p1: [], p2: []};
  state.active = {p1: null, p2: null};
  state.lastMove = {p1: '', p2: ''};
  state.flash = {p1: '', p2: ''};
  state.fxText = '';
  state.attackFx = null;
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = ':root{--bg:#101914;--panel:#18241d;--line:rgba(233,236,214,.14);--text:#f2f0dc;--muted:#c8ccb4;--accent:#d4b04f;--shadow:0 22px 50px rgba(0,0,0,.28)}*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Georgia,\"Trebuchet MS\",serif;color:var(--text);background:radial-gradient(circle at top left,rgba(212,176,79,.18),transparent 20%),radial-gradient(circle at bottom right,rgba(140,168,91,.14),transparent 22%),linear-gradient(180deg,#111915,#0d1310 52%,#16211a);padding:20px}button,input{font:inherit}.arena-shell{width:min(1540px,100%);margin:0 auto;display:grid;grid-template-columns:300px minmax(0,1fr) 300px;gap:18px;align-items:start}.left-rail,.right-rail,.main-stage{background:linear-gradient(180deg,rgba(24,36,29,.98),rgba(18,28,22,.96));border:1px solid var(--line);border-radius:28px;box-shadow:var(--shadow)}.left-rail,.right-rail{padding:18px;display:grid;gap:16px;position:sticky;top:20px}.main-stage{padding:18px;display:grid;gap:18px;align-content:start}.back-link,.format-pill,.selection-pill,.code-box,.source-card,.metric,.summary-card,.roster-card,.compact-mon,.preview-card,.preview-panel,.hero-card,.battle-layout,.action-panel,.mode-card,.draft-card,.builder-card,.info-card,.combat-card,.bench-card,.choice-btn,.empty-card{border:1px solid var(--line);border-radius:22px}.back-link{text-decoration:none;color:var(--text);padding:12px 16px;background:rgba(255,255,255,.04);text-align:center}.brand-card,.info-card{padding:18px}.brand-top,.metric-grid,.source-strip,.cta-row,.builder-toolbar,.preview-controls,.combat-head,.turn-board,.draft-head,.roster-top{display:flex;gap:12px;align-items:center}.brand-top,.cta-row,.builder-toolbar,.combat-head,.turn-board,.draft-head,.roster-top{justify-content:space-between}.brand-card h1{margin:.4rem 0 .7rem;font-size:clamp(2rem,4.2vw,4.2rem);line-height:.95}.brand-card p,.notes,.tiny,.metric span,.source-card span,.hidden-panel span,.builder-card span,.text-input::placeholder{color:var(--muted)}.eyebrow,.card-title{text-transform:uppercase;letter-spacing:.14em;font-size:.78rem;color:#efe0a3}.format-pill,.selection-pill,.code-box{padding:8px 12px;background:rgba(255,255,255,.06)}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:12px;background:rgba(255,255,255,.04)}.metric span{display:block;font-size:.74rem}.metric strong{font-size:1rem}.team-stack,.summary-team,.builder-grid,.draft-grid,.preview-grid,.bench-grid,.choice-grid,.mode-grid,.link-grid,.synergy-grid{display:grid;gap:12px}.team-stack{grid-template-columns:1fr}.synergy-grid{grid-template-columns:repeat(3,1fr);margin-top:12px}.synergy-grid div{padding:10px;border-radius:16px;background:rgba(255,255,255,.04)}.synergy-grid span{display:block;color:var(--muted);font-size:.72rem}.hero-card{padding:20px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));align-self:start}.mode-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mode-card{padding:22px;text-align:left;cursor:pointer;background:linear-gradient(180deg,rgba(212,176,79,.12),rgba(140,168,91,.08));color:var(--text)}.source-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.source-card{padding:16px;background:rgba(255,255,255,.04);display:grid;gap:6px}.draft-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.draft-card,.builder-card{padding:16px;text-align:left;color:#121712;cursor:pointer}.builder-card.selected{box-shadow:inset 0 0 0 3px rgba(255,255,255,.32)}.summary-card.wide{padding:16px;background:rgba(255,255,255,.03)}.summary-team{grid-template-columns:repeat(3,minmax(0,1fr))}.compact-mon{padding:10px;background:rgba(255,255,255,.04);display:flex;gap:10px;align-items:center}.compact-mon span{display:block;color:var(--muted);font-size:.75rem}.types,.move-chips{display:flex;gap:8px;flex-wrap:wrap}.types span,.move-chips span{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.34);font-size:.78rem;color:#182016}.preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.preview-grid.single{grid-template-columns:1.2fr .8fr}.preview-panel{padding:16px;background:rgba(255,255,255,.03)}.preview-card{padding:14px;color:#172017;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center}.preview-copy{display:grid;gap:5px}.mini-btn,.primary-btn,.secondary-btn,.choice-btn{border:none;border-radius:16px;padding:12px 14px;cursor:pointer;font-weight:700}.primary-btn{background:linear-gradient(180deg,#f2d97b,#c6a548);color:#182016}.secondary-btn{background:rgba(255,255,255,.08);color:var(--text)}.mini-btn{background:rgba(255,255,255,.45);color:#142016}.text-input{width:100%;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--text)}.builder-toolbar .text-input{flex:1}.builder-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.builder-card{display:grid;gap:6px;justify-items:start}.battle-layout{padding:18px;display:grid;grid-template-columns:minmax(0,290px) minmax(0,1fr) minmax(0,290px);gap:16px;align-items:center;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))}.battle-center{min-height:320px;position:relative;display:grid;place-items:center;border-radius:26px;border:1px solid var(--line);overflow:hidden;background:radial-gradient(circle at center,rgba(212,176,79,.18),transparent 30%),linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.05))}.battle-ring{width:280px;height:280px;border-radius:50%;border:2px solid rgba(255,255,255,.12);box-shadow:inset 0 0 0 18px rgba(255,255,255,.03)}.turn-board{position:absolute;top:18px;left:18px;right:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.turn-board div{padding:12px;border-radius:18px;background:rgba(0,0,0,.22)}.turn-board span{display:block;color:var(--muted);font-size:.74rem}.combat-card{padding:18px;color:#182016;transition:transform .16s ease,opacity .16s ease}.combat-card.flash-hit{transform:translateX(10px)}.combat-card.flash-heal{transform:scale(1.03)}.combat-card.flash-faint{opacity:.45}.combat-card.flash-switch{transform:translateY(-8px)}.hp-bar{height:12px;border-radius:999px;background:rgba(0,0,0,.16);overflow:hidden;margin:10px 0}.hp-bar.slim{height:9px}.hp-fill{height:100%;background:linear-gradient(90deg,#5fa867,#f0e58d)}.action-panel{padding:18px;background:rgba(255,255,255,.03)}.choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.choice-btn{display:flex;justify-content:space-between;gap:12px;background:linear-gradient(180deg,#efe4b4,#d2bb66);color:#182016}.choice-btn.switch{background:linear-gradient(180deg,#c9d7a8,#8ca85b)}.bench-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}.bench-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.bench-card{padding:12px;color:#182016}.hidden-panel{display:grid;gap:8px;padding:16px;border-radius:18px;background:rgba(255,255,255,.04)}.code-box{min-height:44px;display:grid;place-items:center;font-weight:700}.fx-callout{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.86);padding:12px 16px;border-radius:999px;background:rgba(0,0,0,.34);opacity:0;transition:all .16s ease;pointer-events:none}.fx-callout.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.attack-tag{position:absolute;bottom:18%;padding:10px 14px;border-radius:999px;color:#182016;background:linear-gradient(180deg,#efe4b4,#d2bb66);font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.attack-tag.remote{top:18%;bottom:auto}.log-list{display:grid;gap:10px;max-height:450px;overflow:auto}.log-line{padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.04)}.notes{margin:0;padding-left:18px;display:grid;gap:8px}.sprite{image-rendering:pixelated;filter:drop-shadow(0 10px 12px rgba(0,0,0,.18))}.sprite.xs{width:38px;height:38px}.sprite.sm{width:56px;height:56px}.sprite.md{width:72px;height:72px}.sprite.lg{width:124px;height:124px}.empty-card{padding:16px;background:rgba(255,255,255,.04);color:var(--muted)}@media (max-width:1340px){.arena-shell{grid-template-columns:1fr}.left-rail,.right-rail{position:static}.draft-grid,.builder-grid,.bench-row,.preview-grid,.mode-grid,.source-strip,.link-grid,.battle-layout{grid-template-columns:1fr}.choice-grid,.metric-grid,.summary-team,.bench-grid{grid-template-columns:1fr}}@media (max-width:820px){body{padding:14px}.left-rail,.right-rail,.main-stage{border-radius:22px}.preview-card{grid-template-columns:1fr}.builder-toolbar,.cta-row,.brand-top,.roster-top,.draft-head{flex-direction:column;align-items:flex-start}.turn-board{grid-template-columns:1fr}}';
  document.head.appendChild(style);
}

injectStyles();
render();

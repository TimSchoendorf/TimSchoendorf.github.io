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
} from './pokemon-draft-core.js';

const dex = Dex.forGen(1);
const app = document.getElementById('app');
const BEST_RUN_KEY = 'pokemon-battler-rby-best-run-v4';
const ENEMY_NAMES = ['Brock', 'Misty', 'Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Lance'];
const GENERATION_CONFIG = {
  gen1: {
    id: 'gen1',
    label: 'Gen 1',
    kicker: 'Retro Arena',
    title: 'Pokémon Battle Arena',
    subtitle: 'Wähle zuerst eine Generation. Danach entscheidest du dich für Bot-Serie oder Link Battle und startest direkt in den Draft.',
    availability: 'Jetzt spielbar',
    status: 'Kanto-Pool aktiv',
    features: ['151 Kanto-Pokémon', 'Direkt spielbar', 'Retro-Arena im Gen-1-Stil'],
    steps: ['Generation wählen', 'Modus starten', 'Draft, Reihenfolge, Kampf'],
    modeCards: {
      bot: {
        eyebrow: 'Solo',
        title: 'Bot-Serie',
        points: ['Immer 3 Pokémon zur Auswahl', 'Reihenfolge selbst festlegen', 'Danach gegen die KI kämpfen'],
        enabled: true,
        action: 'start-bot',
        cta: 'Starten',
      },
      link: {
        eyebrow: 'Online',
        title: 'Link Battle',
        points: ['Raumcode teilen oder beitreten', 'Beide draften verdeckt in 3 Runden', 'Danach direkt gegeneinander kämpfen'],
        enabled: true,
        action: 'start-link',
        cta: 'Verbinden',
      },
    },
    note: 'Die genauen Kampfregeln hängen von der gewählten Generation ab.',
  },
  gen5: {
    id: 'gen5',
    label: 'Gen 5',
    kicker: 'Next Era Preview',
    title: 'Pokémon Battle Arena',
    subtitle: 'Hier siehst du bereits den eigenen Stil für die spätere Gen-5-Erweiterung. Der spielbare Modus folgt danach.',
    availability: 'Stilvorschau',
    status: 'Nächste Erweiterung',
    features: ['Eigenes Theme', 'Moderneres Arena-Gefühl', 'Bereit für den Ausbau'],
    steps: ['Generation ansehen', 'Stile vergleichen', 'Später als Modus erweitern'],
    modeCards: {
      bot: {
        eyebrow: 'Solo',
        title: 'Bot-Serie',
        points: ['Theme-Vorschau ist schon aktiv', 'Spielbarer Gen-5-Modus folgt', 'Struktur für späteren Ausbau steht'],
        enabled: false,
        action: 'start-bot',
        cta: 'Bald verfügbar',
      },
      link: {
        eyebrow: 'Online',
        title: 'Link Battle',
        points: ['Designsystem schon getrennt', 'Wechsel zwischen den Stilen sofort sichtbar', 'Online-Modus folgt später'],
        enabled: false,
        action: 'start-link',
        cta: 'Bald verfügbar',
      },
    },
    note: 'Regeltexte bleiben absichtlich generationsoffen, damit künftige Systeme sauber passen.',
  },
};
const MENU_SHOWCASE = {
  foe: POKEMON_POOL.find((species) => species.name === 'Mewtwo') || POKEMON_POOL[0],
  player: POKEMON_POOL.find((species) => species.name === 'Charizard') || POKEMON_POOL[1] || POKEMON_POOL[0],
};

const state = {
  phase: 'menu',
  generation: 'gen1',
  playMode: 'bot',
  draftedIds: new Set(),
  pack: [],
  playerDraft: [],
  opponentDraft: [],
  playerLoadout: [],
  opponentLoadout: [],
  playerPreview: [],
  opponentPreview: [],
  runWins: 0,
  bestRun: loadBestRun(),
  enemyNumber: 1,
  enemyName: '',
  battle: null,
  playerRequest: null,
  logs: [],
  battleFeed: [],
  message: 'Wähle Bot-Serie oder Link Battle.',
  actionLocked: false,
  battleFinished: false,
  teamStates: {p1: [], p2: []},
  active: {p1: null, p2: null},
  lastMove: {p1: '', p2: ''},
  flash: {p1: '', p2: ''},
  inspecting: null,
  hostJoinCode: '',
  link: freshLinkState(),
};

function currentGenerationConfig() {
  return GENERATION_CONFIG[state.generation] || GENERATION_CONFIG.gen1;
}

function freshLinkState() {
  return {
    peer: null,
    conn: null,
    role: 'host',
    connected: false,
    peerId: '',
    remoteName: 'Gegner',
    status: 'Noch keine Verbindung.',
    localSide: 'p1',
    draftRound: 0,
    localPack: [],
    remotePack: [],
    localPickLocked: false,
    remotePickLocked: false,
    remoteDraftCount: 0,
    localReady: false,
    remoteReady: false,
    remoteRoster: null,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ownSide = () => (state.playMode === 'link' ? state.link.localSide : 'p1');
const foeSide = () => (ownSide() === 'p1' ? 'p2' : 'p1');
const ownActive = () => state.active[ownSide()];
const foeActive = () => state.active[foeSide()];
const ownTeamState = () => state.teamStates[ownSide()];
const foeTeamState = () => state.teamStates[foeSide()];

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
  return parts.filter(Boolean).join(' | ');
}

function spriteTag(member, facing = 'front', size = 'md') {
  if (!member?.sprites?.[facing]) return '';
  return `<img class="sprite ${size} ${facing}" src="${member.sprites[facing]}" alt="${member.name}">`;
}

function menuSpriteTag(member, facing = 'front', slot = 'foe') {
  if (!member?.sprites?.[facing]) return `<div class="menu-mon-placeholder menu-mon-placeholder-${slot}">${slot === 'foe' ? 'G' : 'D'}</div>`;
  return `<img class="menu-sprite menu-sprite-${slot} ${facing}" src="${member.sprites[facing]}" alt="${member.name}">`;
}

function createLoadout(species) {
  const set = generateSet(species, dex);
  return {...species, set, archetype: setArchetype(species, set), moveNames: set.moves.map((moveId) => dex.moves.get(moveId).name)};
}

function currentEnemyLabel() {
  return state.playMode === 'bot' ? `${state.enemyName || 'Gegner'} #${state.enemyNumber}` : state.link.remoteName;
}

function nextEnemyName() {
  return ENEMY_NAMES[(state.enemyNumber - 1) % ENEMY_NAMES.length];
}

function allKnownMembers() {
  return [
    ...state.pack,
    ...state.playerDraft,
    ...state.opponentDraft,
    ...state.playerLoadout,
    ...state.opponentLoadout,
    ...state.playerPreview,
    ...state.opponentPreview,
    ...state.link.localPack,
    ...state.link.remotePack,
    ...ownTeamState(),
    ...foeTeamState(),
  ];
}

function resolveMember(idOrName) {
  return allKnownMembers().find((member) => member.id === idOrName || member.name === idOrName);
}

function openInspect(idOrName) {
  const member = resolveMember(idOrName);
  if (!member) return;
  state.inspecting = member.set ? member : createLoadout(member);
  render();
}

function closeInspect() {
  state.inspecting = null;
  render();
}

function logLine(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 100);
}

function pushBattleFeed(text) {
  state.battleFeed = [text];
}

function renderRosterCard(member, reveal) {
  return `<div class="roster-card" style="background:${typeGradient(member.types)}">
    <div class="roster-head">${spriteTag(member, 'front', 'sm')}<div><strong>${member.name}</strong><div class="tiny">#${member.num} | ${member.types.join(' / ')}</div></div><button class="info-chip" data-inspect="${member.name}">Infos</button></div>
    <div class="tiny">${compactMeta([estimateRole(member), member.archetype])}</div>
    <div class="tiny">${reveal ? `L100 ${member.battleStats.hp}/${member.battleStats.atk}/${member.battleStats.def}/${member.battleStats.spc}/${member.battleStats.spe}` : 'Daten verborgen'}</div>
  </div>`;
}

function renderSidePanel(title, team, reveal) {
  const synergy = team.length ? draftSynergy(team) : null;
  return `<div class="panel"><div class="label">${title}</div>
    ${team.length ? team.map((member) => renderRosterCard(member, reveal)).join('') : '<div class="empty">Noch keine Auswahl.</div>'}
    ${synergy ? `<div class="synergy"><span>Typen ${synergy.typeCoverage}</span><span>Rollen ${synergy.roleCoverage}</span><span>Control ${synergy.control}</span></div>` : ''}
  </div>`;
}

function renderOpponentPanel() {
  if (state.playMode === 'link' && state.phase !== 'battle') {
    return `<div class="panel"><div class="label">Gegner</div><div class="empty"><strong>${state.link.connected ? state.link.remoteName : 'Kein Gegner'}</strong><div>${state.link.remoteDraftCount}/3 Picks bestätigt</div><div>${state.link.remoteReady ? 'Bereit für den Kampf' : 'Noch nicht bereit'}</div></div></div>`;
  }
  const team = state.playMode === 'bot' ? (state.phase === 'draft' ? state.opponentDraft : state.opponentLoadout) : state.opponentLoadout;
  return renderSidePanel(state.playMode === 'bot' ? currentEnemyLabel() : 'Gegner', team, state.playMode === 'bot');
}

function renderDraftCard(species, pickAttr) {
  return `<div class="draft-card" style="background:${typeGradient(species.types)}">
    <div class="draft-top">${spriteTag(species, 'front', 'md')}<div><div class="tiny">#${species.num}</div><h3>${species.name}</h3></div></div>
    <div class="types">${species.types.map((type) => `<span>${type}</span>`).join('')}</div>
    <div class="tiny">L100 ${species.battleStats.hp}/${species.battleStats.atk}/${species.battleStats.def}/${species.battleStats.spc}/${species.battleStats.spe}</div>
    <div class="move-row">${previewMoves(species, dex).map((move) => `<span>${move}</span>`).join('')}</div>
    <div class="card-actions"><button class="ghost-btn" data-inspect="${species.name}">Infos</button><button class="primary-btn" ${pickAttr}>Wählen</button></div>
  </div>`;
}

function renderPreviewCard(member, index, controls) {
  return `<div class="preview-card" style="background:${typeGradient(member.types)}">
    ${spriteTag(member, 'front', 'sm')}
    <div class="preview-copy"><strong>${index + 1}. ${member.name}</strong><div class="tiny">${member.moveNames.join(', ')}</div></div>
    <div class="preview-actions"><button class="info-chip" data-inspect="${member.name}">Infos</button>${controls ? `<button class="mini-btn" data-move-index="${index}" data-move-dir="-1" ${index === 0 ? 'disabled' : ''}>hoch</button><button class="mini-btn" data-move-index="${index}" data-move-dir="1" ${index === state.playerPreview.length - 1 ? 'disabled' : ''}>runter</button>` : ''}</div>
  </div>`;
}

function renderInspectModal() {
  if (!state.inspecting) return '';
  const member = state.inspecting;
  return `<div class="modal-backdrop" data-close-inspect="1">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head"><div><div class="label">Pokémon Details</div><h3>${member.name}</h3></div><button class="ghost-btn" data-close-inspect="1">Schließen</button></div>
      <div class="modal-body">
        <div class="modal-card" style="background:${typeGradient(member.types)}">${spriteTag(member, 'front', 'lg')}</div>
        <div class="modal-stats">
          <div><strong>Typen</strong><span>${member.types.join(' / ')}</span></div>
          <div><strong>Base</strong><span>${member.baseStats.hp}/${member.baseStats.atk}/${member.baseStats.def}/${member.baseStats.spc}/${member.baseStats.spe}</span></div>
          <div><strong>Level 100</strong><span>${member.battleStats.hp}/${member.battleStats.atk}/${member.battleStats.def}/${member.battleStats.spc}/${member.battleStats.spe}</span></div>
          <div><strong>Rolle</strong><span>${member.archetype}</span></div>
        </div>
        <div class="modal-moves"><strong>Moveset</strong>${member.moveNames.map((move) => `<span>${move}</span>`).join('')}</div>
      </div>
    </div>
  </div>`;
}

function renderMenuStage() {
  const generation = currentGenerationConfig();
  const botCard = generation.modeCards.bot;
  const linkCard = generation.modeCards.link;
  const renderMenuModeCard = (card) => `
    <button class="menu-mode-card ${card.enabled ? '' : 'locked'}" data-action="${card.action}" ${card.enabled ? '' : 'disabled'}>
      <div class="menu-mode-head">
        <span class="label">${card.eyebrow}</span>
        <span class="menu-mode-state">${card.enabled ? generation.availability : 'In Vorbereitung'}</span>
      </div>
      <h3>${card.title}</h3>
      <div class="menu-mode-points">${card.points.map((point) => `<span>${point}</span>`).join('')}</div>
      <span class="menu-mode-cta">${card.cta}</span>
    </button>`;
  const showcase = generation.id === 'gen1'
    ? `<div class="menu-showcase menu-showcase-gen1">
        <div class="menu-stage-card menu-stage-card-foe">
          <strong>${generation.label} Arena</strong>
        </div>
        <div class="menu-stage-mon menu-stage-mon-foe">${menuSpriteTag(MENU_SHOWCASE.foe, 'front', 'foe')}</div>
        <div class="menu-stage-mon menu-stage-mon-player">${menuSpriteTag(MENU_SHOWCASE.player, 'back', 'player')}</div>
        <div class="menu-stage-line menu-stage-line-top"></div>
        <div class="menu-stage-line menu-stage-line-bottom"></div>
        <div class="menu-stage-text">Generation wählen, Modus starten, dann Draft und Kampf.</div>
      </div>`
    : `<div class="menu-showcase menu-showcase-gen5">
        <div class="menu-tech-card menu-tech-card-foe"><span class="label">Theme Shift</span><strong>Gen 5 Preview</strong><span>Eigenständiger Stil</span></div>
        <div class="menu-tech-card menu-tech-card-player"><span class="label">Ausbau</span><strong>Next Battle Layer</strong><span>Modus folgt später</span></div>
        <div class="menu-energy menu-energy-a"></div>
        <div class="menu-energy menu-energy-b"></div>
        <div class="menu-energy menu-energy-c"></div>
        <div class="menu-stage-text">Der Umschalter trennt bereits die visuelle Sprache der Generationen.</div>
      </div>`;
  return `<section class="menu-shell">
    <div class="menu-topbar">
      <a class="ghost-btn back" href="../index.html#games">Zurück zur Startseite</a>
      <div class="menu-generation-switch" role="tablist" aria-label="Generation wählen">
        <button class="menu-generation-btn ${state.generation === 'gen1' ? 'active' : ''}" data-action="set-generation-gen1">Gen 1</button>
        <button class="menu-generation-btn ${state.generation === 'gen5' ? 'active' : ''}" data-action="set-generation-gen5">Gen 5</button>
      </div>
    </div>
    <section class="menu-hero">
      <div class="menu-copy">
        <div class="menu-kicker-row"><span class="label">${generation.kicker}</span><span class="menu-status-pill">${generation.status}</span></div>
        <h2>${generation.title}</h2>
        <p>${generation.subtitle}</p>
        <div class="menu-feature-row">${generation.features.map((feature) => `<span>${feature}</span>`).join('')}</div>
      </div>
      ${showcase}
    </section>
    <section class="menu-lower">
      <div class="menu-modes">
        <div class="menu-section-head"><div><div class="label">Moduswahl</div><h3>Wähle deine Arena</h3></div><p>${generation.note}</p></div>
        <div class="menu-mode-grid">${renderMenuModeCard(botCard)}${renderMenuModeCard(linkCard)}</div>
      </div>
      <div class="menu-info-panel">
        <div class="label">Ablauf</div>
        <div class="menu-step-list">${generation.steps.map((step, index) => `<div class="menu-step"><span>${index + 1}</span><strong>${step}</strong></div>`).join('')}</div>
        <div class="menu-meta-grid">
          <div class="menu-meta-card"><span class="label">Aktive Generation</span><strong>${generation.label}</strong></div>
          <div class="menu-meta-card"><span class="label">Best Run</span><strong>${state.bestRun}</strong></div>
          <div class="menu-meta-card"><span class="label">Status</span><strong>${generation.availability}</strong></div>
        </div>
      </div>
    </section>
  </section>`;
}

function renderDraftStage() {
  return `<section class="hero"><div><div class="label">Bot-Serie</div><h2>Draft Phase</h2></div><p>${state.message}</p></section>
    <section class="three-col">${state.pack.map((species) => renderDraftCard(species, `data-draft-id="${species.id}"`)).join('')}</section>`;
}

function renderBotPreviewStage() {
  return `<section class="hero"><div><div class="label">Arena Preview</div><h2>${currentEnemyLabel()}</h2></div><p>${state.message}</p></section>
    <section class="two-col"><div class="panel"><div class="label">Deine Reihenfolge</div>${state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join('')}</div><div class="panel"><div class="label">Gegnerteam</div>${state.opponentPreview.map((member, index) => renderPreviewCard(member, index, false)).join('')}</div></section>
    <div class="actions"><button class="primary-btn" data-action="start-battle">Kampf starten</button><button class="ghost-btn" data-action="go-menu">Zur Moduswahl</button></div>`;
}

function renderLinkSetupStage() {
  return `<section class="hero"><div><div class="label">Link Battle</div><h2>Verbindung</h2></div><p>${state.link.status}</p></section>
    <section class="two-col"><div class="panel"><div class="label">Host</div><button class="primary-btn" data-action="host-link">Raum öffnen</button><div class="code-box">${state.link.peerId || 'Noch kein Code'}</div></div><div class="panel"><div class="label">Gast</div><input id="joinCodeInput" class="text-input" placeholder="Raumcode eingeben" value="${state.hostJoinCode}"><button class="primary-btn" data-action="join-link">Verbinden</button></div></section>
    <div class="actions"><button class="ghost-btn" data-action="go-menu">Zurück</button></div>`;
}

function renderLinkDraftStage() {
  return `<section class="hero"><div><div class="label">Link Battle Draft</div><h2>Runde ${state.link.draftRound || 1} von 3</h2></div><p>${state.link.connected ? `Verbunden mit ${state.link.remoteName}. Wähle eines aus 3.` : 'Warte auf Verbindung.'}</p></section>
    ${state.playerDraft.length ? `<div class="panel"><div class="label">Deine bisherigen Picks</div>${state.playerDraft.map((member) => renderRosterCard(createLoadout(member), true)).join('')}</div>` : ''}
    <div class="status-row"><span>${state.playerDraft.length}/3 gewählt</span><span>${state.link.remoteDraftCount}/3 Gegner-Picks</span><span>${state.link.localPickLocked ? 'Wahl gesperrt' : 'Wähle jetzt'}</span></div>
    <section class="three-col">${state.link.localPack.map((species) => renderDraftCard(species, `data-link-draft-id="${species.id}" ${state.link.localPickLocked ? 'disabled' : ''}`)).join('')}</section>`;
}

function renderLinkPreviewStage() {
  return `<section class="hero"><div><div class="label">Verdeckte Reihenfolge</div><h2>Ordne dein Team</h2></div><p>Der Gegner sieht deine Anpassungen nicht live. Erst beim Kampfstart wird aufgedeckt.</p></section>
    <section class="two-col"><div class="panel"><div class="label">Deine Reihenfolge</div>${state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join('')}</div><div class="panel"><div class="label">Gegnerstatus</div><div class="empty">${state.link.remoteDraftCount}/3 Picks bestätigt<br>${state.link.remoteReady ? 'Bereit' : 'Noch nicht bereit'}</div></div></section>
    <div class="actions"><button class="primary-btn" data-action="ready-link-battle" ${!state.link.connected ? 'disabled' : ''}>Bereit für den Kampf</button><button class="ghost-btn" data-action="link-rematch">Neu draften</button></div>`;
}

function hpTone(percent) {
  if (percent <= 20) return 'hp-low';
  if (percent <= 50) return 'hp-mid';
  return 'hp-high';
}

function renderCombatant(mon, label, facing, sideKey, side) {
  if (!mon) return `<div class="combatant combatant-${side} empty">Warte auf Aktivierung.</div>`;
  const percent = conditionToPercent(mon.condition);
  return `<div class="combatant combatant-${side} ${state.flash[sideKey]}">
    <div class="battle-status battle-status-${side}">
      <div class="battle-status-top">
        <div><div class="label">${label}</div><strong>${mon.name}</strong></div>
        <button class="info-chip" data-inspect="${mon.name}">Infos</button>
      </div>
      <div class="battle-status-meta"><span>Lv100</span><span>${mon.status || 'OK'}</span></div>
      <div class="battle-hp-row"><span class="hp-label">HP</span><div class="hp battle-hp"><div class="hp-fill ${hpTone(percent)}" style="width:${percent}%"></div></div></div>
      <div class="tiny">${mon.condition}</div>
    </div>
    <div class="battle-sprite-wrap battle-sprite-${side}">
      <div class="battle-shadow"></div>
      ${spriteTag(mon, facing, 'battle')}
    </div>
  </div>`;
}

function renderBench(team, own) {
  const bench = team.filter((member) => !member.active);
  if (!bench.length) return '<div class="empty">Keine Reserve sichtbar.</div>';
  return `<div class="bench-grid">${bench.map((member) => `<div class="bench-card" style="background:${typeGradient(member.types || ['Normal'])}">${spriteTag(member, own ? 'back' : 'front', 'sm')}<strong>${member.name}</strong><div class="tiny">${member.condition}</div><button class="info-chip" data-inspect="${member.name}">Infos</button></div>`).join('')}</div>`;
}

function renderChoiceButtons() {
  if (!state.playerRequest) return '<div class="empty">Warte auf den nächsten Request.</div>';
  const disabled = state.actionLocked ? 'disabled' : '';
  if (state.playerRequest.forceSwitch) {
    return `<div class="choice-grid">${state.playerRequest.side.pokemon.map((mon, index) => ({mon, index})).filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt')).map(({mon, index}) => `<button class="choice-btn" ${disabled} data-choice="switch ${index + 1}">${mon.details.split(',')[0]}<span>Pflichtwechsel</span></button>`).join('')}</div>`;
  }
  const moves = state.playerRequest.active?.[0]?.moves.map((move, index) => `<button class="choice-btn" ${disabled} data-choice="move ${index + 1}">${move.move}<span>${move.pp}/${move.maxpp} PP</span></button>`).join('') || '';
  const switches = !state.playerRequest.active?.[0]?.trapped
    ? state.playerRequest.side.pokemon.map((mon, index) => ({mon, index})).filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt')).map(({mon, index}) => `<button class="choice-btn alt" ${disabled} data-choice="switch ${index + 1}">${mon.details.split(',')[0]}<span>Zug opfern</span></button>`).join('')
    : '';
  return `<div class="choice-grid">${moves}${switches}</div>`;
}

function renderBattleStage() {
  const rematch = state.playMode === 'link' && state.battleFinished ? '<button class="primary-btn" data-action="link-rematch">Revanche</button>' : '';
  const latestFeed = state.battleFeed[0] || 'Der Kampf beginnt.';
  return `<section class="battle-ui">
    <div class="battle-header"><div><div class="label">Battle Phase</div><h2>${currentEnemyLabel()}</h2></div><p>${state.message}</p></div>
    <section class="battle-shell"><div class="battle-stage">${renderCombatant(foeActive(), currentEnemyLabel(), 'front', foeSide(), 'foe')}<div class="battle-feed"><div class="feed-line">${latestFeed}</div></div>${renderCombatant(ownActive(), 'Du', 'back', ownSide(), 'player')}</div></section>
    <section class="battle-footer">
      <div class="panel battle-panel"><div class="label">Deine Reserve</div>${renderBench(ownTeamState(), true)}</div>
      <div class="panel battle-panel"><div class="label">Gegnerische Reserve</div>${renderBench(foeTeamState(), false)}</div>
      <div class="panel battle-panel battle-actions-panel"><div class="label">Aktionen</div>${renderChoiceButtons()}<div class="actions">${rematch}<button class="ghost-btn" data-action="go-menu">Zur Moduswahl</button></div></div>
    </section>
  </section>`;
}

function renderStage() {
  if (state.phase === 'menu') return renderMenuStage();
  if (state.phase === 'draft') return renderDraftStage();
  if (state.phase === 'preview') return renderBotPreviewStage();
  if (state.phase === 'link-setup') return renderLinkSetupStage();
  if (state.phase === 'link-draft') return renderLinkDraftStage();
  if (state.phase === 'link-preview') return renderLinkPreviewStage();
  return renderBattleStage();
}

function render() {
  const ownTeam = state.playMode === 'link'
    ? (state.playerPreview.length ? state.playerPreview : state.playerLoadout.length ? state.playerLoadout : state.playerDraft)
    : (state.phase === 'draft' ? state.playerDraft : state.playerPreview.length ? state.playerPreview : state.playerLoadout);
  const battleView = state.phase === 'battle';
  const menuView = state.phase === 'menu';
  if (menuView) {
    app.innerHTML = `<div class="app-shell menu-view theme-${state.generation}">
      <main class="main menu-main">${renderStage()}</main>
      ${renderInspectModal()}
    </div>`;
  } else {
    app.innerHTML = `<div class="app-shell ${battleView ? 'battle-view' : ''} theme-${state.generation}">
      <aside class="side"><a class="ghost-btn back" href="../index.html#games">Zurück zur Startseite</a><div class="brand"><div class="label">Pokémon Battler</div><h1>Kanto Link Arena</h1><p>Gen-1-Sprites, Level-100-Stats, RBY-Regeln und Link Battles mit verdecktem Draft.</p></div><div class="panel metrics"><span>Modus ${state.playMode === 'bot' ? 'Bot-Serie' : 'Link Battle'}</span><span>151 Pokémon</span><span>Best Run ${state.bestRun}</span></div>${renderSidePanel('Dein Team', ownTeam, true)}${renderOpponentPanel()}</aside>
      <main class="main">${renderStage()}</main>
      <aside class="side"><div class="panel"><div class="label">Hinweise</div><div class="empty">Das Regelset folgt der aktiven Generation.</div></div><div class="panel"><div class="label">Log</div>${state.logs.map((line) => `<div class="log-line">${line}</div>`).join('')}</div></aside>
      ${renderInspectModal()}
    </div>`;
  }
  bindEvents();
  if (battleView) window.scrollTo({top: 0, left: 0, behavior: 'auto'});
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => handleAction(button.dataset.action)));
  document.querySelectorAll('[data-draft-id]').forEach((button) => button.addEventListener('click', () => draftSpecies(button.dataset.draftId)));
  document.querySelectorAll('[data-link-draft-id]').forEach((button) => button.addEventListener('click', () => pickLinkDraft(button.dataset.linkDraftId)));
  document.querySelectorAll('[data-move-index]').forEach((button) => button.addEventListener('click', () => movePreviewMon(Number(button.dataset.moveIndex), Number(button.dataset.moveDir))));
  document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => submitChoice(button.dataset.choice)));
  document.querySelectorAll('[data-inspect]').forEach((button) => button.addEventListener('click', () => openInspect(button.dataset.inspect)));
  document.querySelectorAll('[data-close-inspect]').forEach((button) => button.addEventListener('click', closeInspect));
  document.getElementById('joinCodeInput')?.addEventListener('input', (event) => { state.hostJoinCode = event.target.value.trim(); });
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
  state.battleFeed = [];
}

function resetDraft() {
  resetBattleState();
  state.playMode = 'bot';
  state.phase = 'draft';
  state.draftedIds = new Set();
  state.playerDraft = [];
  state.opponentDraft = [];
  state.playerLoadout = [];
  state.opponentLoadout = [];
  state.playerPreview = [];
  state.opponentPreview = [];
  state.logs = [];
  state.message = 'Wähle dein erstes Pokémon für die Bot-Serie.';
  state.runWins = 0;
  state.enemyNumber = 1;
  state.enemyName = '';
  state.pack = drawPack(state.draftedIds, 3);
  render();
}

function draftSpecies(id) {
  const picked = state.pack.find((member) => member.id === id);
  if (!picked) return;
  state.playerDraft.push(picked);
  state.draftedIds.add(picked.id);
  const opponentPick = pickOpponentDraft(state.pack.filter((member) => member.id !== id), state.opponentDraft, state.playerDraft, dex);
  if (opponentPick) {
    state.opponentDraft.push(opponentPick);
    state.draftedIds.add(opponentPick.id);
  }
  if (state.playerDraft.length === 3) {
    state.playerLoadout = state.playerDraft.map(createLoadout);
    prepareNextEnemy('Dein Team ist gesetzt. Ordne jetzt den Lead.');
    return;
  }
  state.pack = drawPack(state.draftedIds, 3);
  render();
}

function buildOpponentLoadout() {
  const excluded = new Set(state.playerDraft.map((member) => member.id));
  const source = shuffle(POKEMON_POOL.filter((member) => !excluded.has(member.id)));
  const team = [];
  let index = 0;
  while (team.length < 3 && index < source.length) {
    const slice = source.slice(index, index + 6);
    const choice = pickOpponentDraft(slice, team, state.playerLoadout, dex);
    if (choice && !team.some((entry) => entry.id === choice.id)) team.push(choice);
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
  state.message = message;
  render();
}

function movePreviewMon(index, direction) {
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= state.playerPreview.length) return;
  [state.playerPreview[index], state.playerPreview[swapIndex]] = [state.playerPreview[swapIndex], state.playerPreview[index]];
  render();
}

function handleAction(action) {
  if (action === 'set-generation-gen1') {
    state.generation = 'gen1';
    state.message = 'Wähle Bot-Serie oder Link Battle.';
    return render();
  }
  if (action === 'set-generation-gen5') {
    state.generation = 'gen5';
    state.message = 'Die Gen-5-Erweiterung ist als Stilvorschau vorbereitet.';
    return render();
  }
  if (state.generation !== 'gen1' && (action === 'start-bot' || action === 'start-link')) {
    state.message = 'Der spielbare Gen-5-Modus folgt mit dem nächsten Ausbau.';
    return render();
  }
  if (action === 'start-bot') return resetDraft();
  if (action === 'start-link') {
    state.playMode = 'link';
    state.phase = 'link-setup';
    state.message = 'Öffne einen Raum oder tritt einem Raum bei.';
    return render();
  }
  if (action === 'start-battle') return startBotBattle();
  if (action === 'host-link') return startHosting();
  if (action === 'join-link') return joinHost();
  if (action === 'ready-link-battle') return readyLinkBattle();
  if (action === 'link-rematch') return beginLinkRematch(true);
  if (action === 'go-menu') {
    teardownLink();
    state.playMode = 'bot';
    state.phase = 'menu';
    state.message = 'Wähle Bot-Serie oder Link Battle.';
    resetBattleState();
    return render();
  }
}

function teardownLink() {
  state.link.conn?.close?.();
  state.link.peer?.destroy?.();
  state.link = freshLinkState();
}

function sendLinkMessage(message) {
  if (state.link.conn?.open) state.link.conn.send(message);
}

function setupLinkDraft() {
  resetBattleState();
  state.phase = 'link-draft';
  state.draftedIds = new Set();
  state.playerDraft = [];
  state.opponentDraft = [];
  state.playerLoadout = [];
  state.opponentLoadout = [];
  state.playerPreview = [];
  state.opponentPreview = [];
  state.link.draftRound = 1;
  state.link.localPickLocked = false;
  state.link.remotePickLocked = false;
  state.link.remoteDraftCount = 0;
  state.link.localReady = false;
  state.link.remoteReady = false;
  state.link.remoteRoster = null;
  if (state.link.role === 'host') prepareLinkRound();
  render();
}

function prepareLinkRound() {
  const excluded = new Set(state.draftedIds);
  const localPack = drawPack(excluded, 3);
  const remotePack = drawPack(new Set([...excluded, ...localPack.map((member) => member.id)]), 3);
  state.link.localPack = localPack;
  state.link.remotePack = remotePack;
  state.link.localPickLocked = false;
  state.link.remotePickLocked = false;
  sendLinkMessage({type: 'link-pack', round: state.link.draftRound, pack: remotePack, remoteDraftCount: state.opponentDraft.length});
  render();
}

function pickLinkDraft(id) {
  if (state.link.localPickLocked) return;
  const picked = state.link.localPack.find((member) => member.id === id);
  if (!picked) return;
  state.playerDraft.push(picked);
  state.draftedIds.add(picked.id);
  state.link.localPickLocked = true;
  sendLinkMessage({type: 'link-pick', id, round: state.link.draftRound});
  if (state.link.role === 'host') maybeFinishLinkRound();
  render();
}

function maybeFinishLinkRound() {
  if (!state.link.localPickLocked || !state.link.remotePickLocked) return;
  if (state.playerDraft.length >= 3 && state.opponentDraft.length >= 3) return finishLinkDraft();
  state.link.draftRound += 1;
  prepareLinkRound();
}

function finishLinkDraft() {
  state.playerLoadout = state.playerDraft.map(createLoadout);
  state.opponentLoadout = state.opponentDraft.map(createLoadout);
  state.playerPreview = chooseTeamOrder(state.playerLoadout);
  state.phase = 'link-preview';
  sendLinkMessage({type: 'link-draft-done', remoteDraftCount: state.playerDraft.length});
  render();
}

function beginLinkRematch(broadcast) {
  if (broadcast) sendLinkMessage({type: 'link-rematch'});
  setupLinkDraft();
}

function startHosting() {
  teardownLink();
  state.link = freshLinkState();
  state.link.role = 'host';
  const peer = new Peer();
  state.link.peer = peer;
  peer.on('open', (id) => {
    state.link.peerId = id;
    state.link.status = 'Raum offen. Teile den Code.';
    render();
  });
  peer.on('connection', (conn) => attachConnection(conn, 'host'));
}

function joinHost() {
  if (!state.hostJoinCode) return;
  teardownLink();
  state.link = freshLinkState();
  state.link.role = 'guest';
  const peer = new Peer();
  state.link.peer = peer;
  peer.on('open', () => attachConnection(peer.connect(state.hostJoinCode, {reliable: true}), 'guest'));
}

function attachConnection(conn, role) {
  state.link.conn = conn;
  state.link.role = role;
  conn.on('open', () => {
    state.link.connected = true;
    state.link.status = 'Verbindung steht.';
    sendLinkMessage({type: 'hello', name: 'Gegner'});
    setupLinkDraft();
  });
  conn.on('data', handleLinkMessage);
  conn.on('close', () => {
    state.link.connected = false;
    state.link.status = 'Verbindung getrennt.';
    render();
  });
}

function handleLinkMessage(message) {
  if (message.type === 'hello') {
    state.link.status = 'Verbindung steht.';
    state.link.remoteName = message.name || 'Gegner';
  }
  if (message.type === 'link-pack') {
    state.phase = 'link-draft';
    state.link.draftRound = message.round;
    state.link.localPack = message.pack;
    state.link.remoteDraftCount = message.remoteDraftCount || state.link.remoteDraftCount;
    state.link.localPickLocked = false;
  }
  if (message.type === 'link-pick') {
    const picked = state.link.remotePack.find((member) => member.id === message.id);
    if (picked) {
      state.opponentDraft.push(picked);
      state.draftedIds.add(picked.id);
      state.link.remotePickLocked = true;
      state.link.remoteDraftCount = state.opponentDraft.length;
    }
    if (state.link.role === 'host') maybeFinishLinkRound();
  }
  if (message.type === 'link-draft-done') {
    state.link.remoteDraftCount = message.remoteDraftCount;
    if (state.playerDraft.length === 3) {
      state.playerLoadout = state.playerDraft.map(createLoadout);
      state.playerPreview = chooseTeamOrder(state.playerLoadout);
      state.phase = 'link-preview';
    }
  }
  if (message.type === 'battle-ready') {
    state.link.remoteReady = true;
    state.link.remoteRoster = message.roster;
    maybeStartHostedBattle();
  }
  if (message.type === 'battle-start') {
    state.phase = 'battle';
    state.link.localSide = message.localSide;
    initialiseTeamStates(message.p1Roster, message.p2Roster);
    render();
  }
  if (message.type === 'battle-request') {
    state.playerRequest = message.request;
    state.actionLocked = false;
    updateTeamStateFromRequest(ownSide(), message.request);
    render();
  }
  if (message.type === 'battle-choice' && state.link.role === 'host' && state.battle) state.battle.streams.p2.write(message.choice);
  if (message.type === 'battle-chunk') void animateBattleChunk(message.chunk);
  if (message.type === 'link-rematch') beginLinkRematch(false);
  render();
}

function readyLinkBattle() {
  state.link.localReady = true;
  sendLinkMessage({type: 'battle-ready', roster: state.playerPreview});
  maybeStartHostedBattle();
  render();
}

function maybeStartHostedBattle() {
  if (state.playMode !== 'link' || state.link.role !== 'host' || !state.link.localReady || !state.link.remoteReady || !state.link.remoteRoster) return;
  startBattleSimulation({
    p1Team: state.playerPreview,
    p2Team: state.link.remoteRoster,
    p1Name: 'Du',
    p2Name: state.link.remoteName,
    localSide: 'p1',
    multiplayer: true,
  });
  sendLinkMessage({type: 'battle-start', localSide: 'p2', p1Roster: state.playerPreview, p2Roster: state.link.remoteRoster});
}

function initialiseTeamStates(p1Roster, p2Roster) {
  state.teamStates = {
    p1: p1Roster.map((member) => ({...member, condition: '100/100', active: false, status: ''})),
    p2: p2Roster.map((member) => ({...member, condition: '100/100', active: false, status: ''})),
  };
  state.active = {p1: null, p2: null};
}

function startBotBattle() {
  startBattleSimulation({
    p1Team: state.playerPreview,
    p2Team: state.opponentPreview,
    p1Name: 'Du',
    p2Name: currentEnemyLabel(),
    localSide: 'p1',
    multiplayer: false,
  });
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
        if (ownSide() === 'p1') {
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
    const original = resolveMember(name);
    return {...(original || {name, types: ['Normal'], sprites: {}}), condition: mon.condition, active: mon.active, status: mon.status || (mon.condition.endsWith(' fnt') ? 'fainted' : '')};
  });
  state.active[sideKey] = state.teamStates[sideKey].find((member) => member.active) || null;
}

function updateRosterState(sideKey, name, updater) {
  const target = state.teamStates[sideKey].find((member) => member.name === name);
  if (target) updater(target, state.teamStates[sideKey]);
  state.active[sideKey] = state.teamStates[sideKey].find((member) => member.active) || null;
}

function formatStatus(status) {
  const labels = {
    brn: 'Verbrennung',
    frz: 'Eis',
    par: 'Paralyse',
    psn: 'Vergiftung',
    tox: 'schwere Vergiftung',
    slp: 'Schlaf',
    confusion: 'Verwirrung',
  };
  return labels[status] || status;
}

function battleText(parts) {
  const type = parts[1];
  if (type === 'move') return `${parts[2].split(': ').pop()} setzt ${parts[3]} ein.`;
  if (type === '-miss') return `${parts[2].split(': ').pop()} verfehlt.`;
  if (type === '-supereffective') return 'Es ist sehr effektiv.';
  if (type === '-resisted') return 'Das ist nicht sehr effektiv.';
  if (type === '-crit') return 'Ein Volltreffer.';
  if (type === 'switch') return `${parts[2].split(': ').pop()} betritt das Feld.`;
  if (type === 'faint') return `${parts[2].split(': ').pop()} ist kampfunfähig.`;
  if (type === '-status') return `${parts[2].split(': ').pop()} erleidet ${formatStatus(parts[3])}.`;
  if (type === '-curestatus') return `${parts[2].split(': ').pop()} ist wieder fit.`;
  if (type === 'cant') {
    const name = parts[2].split(': ').pop();
    const reason = parts[3];
    if (reason === 'slp') return `${name} schläft tief und fest.`;
    if (reason === 'frz') return `${name} ist eingefroren.`;
    if (reason === 'par') return `${name} ist paralysiert und kann sich nicht bewegen.`;
    if (reason === 'flinch') return `${name} schreckt zurück.`;
    if (reason === 'recharge') return `${name} muss sich aufladen.`;
    if (reason === 'Disable') return `${name} kann die Attacke nicht einsetzen.`;
    return `${name} kann nicht handeln.`;
  }
  if (type === '-start') {
    const name = parts[2].split(': ').pop();
    if (parts[3] === 'confusion') return `${name} ist verwirrt.`;
    if (parts[3] === 'Substitute') return `${name} erschafft einen Delegator.`;
    return `${name} ist von ${parts[3]} betroffen.`;
  }
  if (type === '-end') {
    const name = parts[2].split(': ').pop();
    if (parts[3] === 'confusion') return `${name} ist nicht mehr verwirrt.`;
    if (parts[3] === 'Substitute') return `Der Delegator von ${name} verschwindet.`;
    return `${parts[3]} endet bei ${name}.`;
  }
  if (type === '-activate') {
    const name = parts[2].split(': ').pop();
    if (parts[3] === 'confusion') return `${name} ist verwirrt.`;
    if (parts[3]?.startsWith('move: Bide')) return `${name} sammelt Energie.`;
    return `${name} aktiviert ${parts[3]}.`;
  }
  if (type === '-boost') return `${parts[2].split(': ').pop()} steigert ${parts[3]}.`;
  if (type === '-unboost') return `${parts[2].split(': ').pop()} verliert ${parts[3]}.`;
  if (type === '-immune') return `${parts[2].split(': ').pop()} bleibt unbeeindruckt.`;
  if (type === '-fail') return 'Aber es fehlschlägt.';
  if (type === '-mustrecharge') return `${parts[2].split(': ').pop()} muss aussetzen.`;
  if (type === '-hitcount') return `${parts[2]} Treffer.`;
  if (type === '-ohko') return 'Ein K.-o.-Treffer.';
  if (type === 'win') return `${parts[2]} gewinnt den Kampf.`;
  return '';
}

function flashSide(sideKey, cls) {
  state.flash[sideKey] = cls;
  render();
  setTimeout(() => {
    state.flash[sideKey] = '';
    render();
  }, 280);
}

function handleBattleLine(line) {
  if (!line.startsWith('|')) return 0;
  const parts = line.split('|');
  const type = parts[1];
  const text = battleText(parts);
  if (text) {
    pushBattleFeed(text);
    logLine(text);
  }
  if (type === 'move') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    state.lastMove[sideKey] = parts[3];
    return 700;
  }
  if (type === 'switch') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    const name = parts[2].split(': ').pop();
    updateRosterState(sideKey, name, (target, team) => {
      team.forEach((entry) => { entry.active = entry.name === name; });
      target.condition = parts[4];
      target.active = true;
    });
    flashSide(sideKey, 'flash-switch');
    return 650;
  }
  if (type === '-damage' || type === '-heal') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => { target.condition = parts[3]; });
    flashSide(sideKey, type === '-damage' ? 'flash-hit' : 'flash-heal');
    return 550;
  }
  if (type === '-status' || type === '-curestatus') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => { target.status = type === '-status' ? parts[3] : ''; });
    return 650;
  }
  if (type === 'faint') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => {
      target.condition = '0 fnt';
      target.status = 'fainted';
      target.active = false;
    });
    flashSide(sideKey, 'flash-faint');
    return 800;
  }
  if (type === 'turn') {
    state.message = `Zug ${parts[2]}.`;
    return 350;
  }
  if (type === 'win') {
    void finishBattle(parts[2]);
    return 900;
  }
  return text ? 650 : 0;
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
  const localWon = winner === 'Du';
  if (state.playMode === 'bot') {
    if (localWon) {
      state.runWins += 1;
      saveBestRun(state.runWins);
      state.enemyNumber += 1;
      state.message = `Sieg. Serie: ${state.runWins}.`;
      render();
      await sleep(1000);
      prepareNextEnemy('Nächster Gegner wartet.');
      return;
    }
    state.message = `Serie endet bei ${state.runWins}.`;
    return render();
  }
  state.message = localWon ? 'Du gewinnst das Link Battle.' : 'Das Link Battle geht an den Gegner.';
  render();
}

function submitChoice(choice) {
  if (!state.playerRequest || state.actionLocked) return;
  state.actionLocked = true;
  render();
  if (state.playMode === 'link' && state.link.role === 'guest') return sendLinkMessage({type: 'battle-choice', choice});
  state.battle?.streams?.p1.write(choice);
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root{
      --line:rgba(233,236,214,.14);
      --text:#f3f1e6;
      --muted:#c8ccb4;
      --ink:#182117;
      --ink-soft:#334030;
      --panel:rgba(18,29,22,.95);
      --panel-soft:rgba(255,255,255,.04);
      --chip:rgba(255,255,255,.52);
      --chip-text:#182117;
      --menu-accent:#d6c074;
      --menu-accent-soft:#f5e8ab;
      --menu-glow:rgba(214,192,116,.22);
      --menu-stage-top:#eef4d3;
      --menu-stage-bottom:#d4e1a5;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      padding:18px;
      font-family:Georgia,serif;
      color:var(--text);
      background:
        radial-gradient(circle at top left,rgba(212,176,79,.18),transparent 20%),
        radial-gradient(circle at bottom right,rgba(116,183,201,.08),transparent 24%),
        linear-gradient(180deg,#111915,#0d1310 52%,#16211a);
    }
    .theme-gen1{
      --menu-accent:#d6c074;
      --menu-accent-soft:#f5e8ab;
      --menu-glow:rgba(214,192,116,.22);
      --menu-stage-top:#eef4d3;
      --menu-stage-bottom:#d4e1a5;
    }
    .theme-gen5{
      --menu-accent:#66d8ff;
      --menu-accent-soft:#92f0ff;
      --menu-glow:rgba(102,216,255,.24);
      --menu-stage-top:#111a30;
      --menu-stage-bottom:#1e2446;
      --line:rgba(150,215,255,.18);
      --panel:rgba(14,19,38,.94);
      --panel-soft:rgba(255,255,255,.05);
      --text:#edf7ff;
      --muted:#aebfd7;
      --chip:rgba(120,229,255,.16);
      --chip-text:#edf7ff;
    }
    button,input{font:inherit}
    .app-shell{
      width:min(1520px,100%);
      margin:0 auto;
      display:grid;
      grid-template-columns:300px minmax(0,1fr) 300px;
      gap:18px;
      align-items:start;
    }
    .side,.main{
      background:var(--panel);
      border:1px solid var(--line);
      border-radius:26px;
      padding:18px;
      display:grid;
      gap:14px;
      box-shadow:0 24px 60px rgba(0,0,0,.24);
    }
    .brand h1{margin:.25rem 0 .5rem;font-size:clamp(2rem,4vw,4rem);line-height:.95}
    .brand p,.tiny,.empty,.log-line,.label,.panel span{color:var(--muted)}
    .label{text-transform:uppercase;letter-spacing:.14em;font-size:.75rem}
    .hero,.panel,.draft-card,.preview-card,.combatant,.bench-card,.mode-card,.choice-btn,.roster-card,.modal,.code-box,.ghost-btn,.primary-btn,.info-chip{
      border:1px solid var(--line);
      border-radius:20px;
    }
    .hero,.panel{
      padding:16px;
      background:var(--panel-soft);
    }
    .metrics span,.synergy span{display:block}
    .back,.ghost-btn,.primary-btn,.choice-btn,.mini-btn,.info-chip{
      padding:10px 12px;
      border:none;
      cursor:pointer;
      transition:transform .14s ease, background .14s ease, color .14s ease;
    }
    .ghost-btn,.info-chip,.mini-btn{
      background:rgba(255,255,255,.14);
      color:var(--text);
    }
    .primary-btn,.choice-btn{
      background:linear-gradient(180deg,#f2d97b,#c6a548);
      color:var(--ink);
      font-weight:700;
    }
    .choice-btn.alt{background:linear-gradient(180deg,#cfdfab,#8ca85b)}
    .three-col,.two-col,.battle-shell,.choice-grid,.bench-grid{display:grid;gap:14px}
    .three-col{grid-template-columns:repeat(3,minmax(0,1fr))}
    .two-col{grid-template-columns:repeat(2,minmax(0,1fr))}
    .draft-card,.mode-card,.roster-card,.preview-card,.combatant,.bench-card{
      padding:16px;
      color:var(--ink);
      box-shadow:inset 0 0 0 999px rgba(255,255,255,.14);
      overflow:hidden;
    }
    .draft-top,.roster-head,.combatant-head,.card-actions,.preview-actions,.actions,.status-row{
      display:flex;
      gap:10px;
      align-items:center;
      justify-content:space-between;
    }
    .roster-head,.combatant-head{align-items:flex-start}
    .types,.move-row{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:8px;
    }
    .types span,.move-row span,.modal-moves span{
      padding:5px 8px;
      border-radius:999px;
      background:var(--chip);
      color:var(--chip-text);
      font-size:.78rem;
      font-weight:600;
    }
    .draft-card .tiny,.roster-card .tiny,.preview-card .tiny,.combatant .tiny,.bench-card .tiny{
      color:var(--ink-soft);
      font-weight:600;
    }
    .preview-card{
      display:grid;
      grid-template-columns:auto 1fr auto;
      gap:12px;
      align-items:center;
    }
    .preview-copy strong,.draft-card h3,.combatant strong,.roster-card strong{color:var(--ink)}
    .battle-view{grid-template-columns:minmax(0,1fr)}
    .battle-view .side{display:none}
    .battle-view .main{padding:0}
    .menu-view{
      width:min(1460px,100%);
      grid-template-columns:minmax(0,1fr);
    }
    .menu-view .main{
      padding:0;
      background:none;
      border:none;
      box-shadow:none;
    }
    .menu-shell{
      display:grid;
      gap:16px;
      padding:12px 0 8px;
    }
    .menu-topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
    }
    .menu-topbar .back{
      padding:10px 16px;
      background:rgba(255,255,255,.1);
    }
    .menu-generation-switch{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      padding:8px;
      border-radius:999px;
      border:1px solid var(--line);
      background:rgba(7,11,10,.4);
      backdrop-filter:blur(10px);
    }
    .menu-generation-btn{
      min-width:112px;
      padding:10px 16px;
      border:none;
      border-radius:999px;
      background:transparent;
      color:var(--muted);
      cursor:pointer;
      font-weight:700;
      letter-spacing:.04em;
      transition:background .16s ease,color .16s ease,transform .16s ease,box-shadow .16s ease;
    }
    .menu-generation-btn.active{
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      color:#16211a;
      box-shadow:0 10px 24px var(--menu-glow);
    }
    .menu-hero{
      display:grid;
      grid-template-columns:minmax(320px,1fr) minmax(380px,1.05fr);
      gap:16px;
      align-items:stretch;
    }
    .menu-copy,.menu-showcase,.menu-info-panel,.menu-modes{
      border:1px solid var(--line);
      border-radius:28px;
      background:linear-gradient(180deg,rgba(21,31,24,.94),rgba(16,25,20,.9));
      box-shadow:0 28px 80px rgba(0,0,0,.22);
    }
    .theme-gen5 .menu-copy,.theme-gen5 .menu-showcase,.theme-gen5 .menu-info-panel,.theme-gen5 .menu-modes{
      background:linear-gradient(180deg,rgba(15,22,43,.94),rgba(11,16,34,.92));
    }
    .menu-copy{
      padding:24px;
      display:grid;
      gap:14px;
      align-content:start;
    }
    .menu-kicker-row{
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }
    .menu-status-pill{
      padding:7px 12px;
      border-radius:999px;
      color:#16211a;
      font-size:.82rem;
      font-weight:700;
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      box-shadow:0 10px 24px var(--menu-glow);
    }
    .menu-copy h2{
      margin:0;
      font-size:clamp(2.5rem,5vw,4.8rem);
      line-height:.92;
      letter-spacing:-.03em;
    }
    .menu-copy p,.menu-section-head p{
      margin:0;
      font-size:1rem;
      line-height:1.6;
      color:var(--muted);
    }
    .menu-feature-row{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
    }
    .menu-feature-row span,.menu-mode-points span{
      padding:8px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      color:var(--text);
      font-size:.88rem;
    }
    .menu-showcase{
      position:relative;
      min-height:386px;
      --menu-dialog-bottom:5.5%;
      --menu-dialog-height:23%;
      --menu-player-shift-y:-8%;
      overflow:hidden;
      padding:18px;
    }
    .menu-showcase::before{
      content:"";
      position:absolute;
      inset:0;
      background:
        radial-gradient(circle at 20% 18%,var(--menu-glow),transparent 24%),
        radial-gradient(circle at 82% 26%,rgba(255,255,255,.12),transparent 22%);
      pointer-events:none;
    }
    .menu-showcase-gen1{
      background:
        linear-gradient(180deg,var(--menu-stage-top) 0%,var(--menu-stage-top) 53%,var(--menu-stage-bottom) 53%,var(--menu-stage-bottom) 100%);
    }
    .menu-stage-card,.menu-tech-card{
      position:absolute;
      z-index:2;
      min-width:0;
      padding:13px 15px;
      border-radius:18px;
      border:2px solid rgba(16,23,16,.8);
      background:rgba(249,245,232,.92);
      color:#1e2b14;
      display:grid;
      gap:4px;
      box-shadow:0 18px 32px rgba(0,0,0,.18);
    }
    .menu-stage-card strong,.menu-tech-card strong{
      font-size:1.2rem;
    }
    .menu-stage-card-foe{
      top:6%;
      left:4%;
      width:min(32%,220px);
      min-height:64px;
      place-items:center;
      text-align:center;
    }
    .menu-stage-card-foe strong{
      line-height:1;
    }
    .menu-stage-card-player{display:none}
    .menu-stage-mon{
      position:absolute;
      z-index:2;
      display:grid;
      place-items:end center;
    }
    .menu-stage-mon-foe{
      top:12%;
      right:6%;
      width:19%;
      height:31%;
    }
    .menu-stage-mon-player{
      left:8%;
      bottom:calc(var(--menu-dialog-bottom) + var(--menu-dialog-height));
      width:20%;
      height:31%;
      overflow:hidden;
    }
    .menu-sprite{
      display:block;
      width:100%;
      height:100%;
      object-fit:contain;
      object-position:center bottom;
      image-rendering:pixelated;
      filter:drop-shadow(0 12px 0 rgba(255,255,255,.2)) drop-shadow(0 20px 18px rgba(0,0,0,.18));
    }
    .menu-sprite-foe.front{transform:translateX(1%)}
    .menu-sprite-player.back{transform:translateX(-1%) translateY(var(--menu-player-shift-y))}
    .menu-mon-placeholder{
      display:grid;
      place-items:center;
      width:100%;
      height:100%;
      border-radius:24px;
      font-size:3rem;
      font-weight:700;
      color:rgba(255,255,255,.85);
      background:rgba(255,255,255,.08);
    }
    .menu-stage-line{
      position:absolute;
      left:0;
      right:0;
      height:1px;
      background:rgba(255,255,255,.28);
      z-index:1;
    }
    .menu-stage-line-top{top:53%}
    .menu-stage-line-bottom{
      bottom:var(--menu-dialog-bottom);
      left:3.8%;
      right:3.8%;
      height:var(--menu-dialog-height);
      border:3px solid #182117;
      border-radius:12px;
      background:rgb(249,245,232);
      z-index:3;
    }
    .menu-stage-text{
      position:absolute;
      left:7%;
      right:7%;
      bottom:var(--menu-dialog-bottom);
      height:var(--menu-dialog-height);
      z-index:4;
      display:flex;
      align-items:center;
      padding-left:clamp(110px,11vw,154px);
      color:#213018;
      font-size:.94rem;
      font-weight:700;
      line-height:1.1;
    }
    .menu-showcase-gen5{
      background:
        radial-gradient(circle at 18% 26%,rgba(102,216,255,.18),transparent 22%),
        radial-gradient(circle at 76% 30%,rgba(139,107,255,.2),transparent 26%),
        linear-gradient(145deg,#11172f,#19224f 55%,#121937);
    }
    .menu-tech-card-foe{top:28px;left:28px;background:rgba(13,21,46,.9);border-color:rgba(102,216,255,.4);color:#edf7ff}
    .menu-tech-card-player{right:28px;bottom:88px;background:rgba(27,21,58,.9);border-color:rgba(139,107,255,.45);color:#edf7ff}
    .menu-energy{
      position:absolute;
      border-radius:50%;
      filter:blur(2px);
      z-index:1;
    }
    .menu-energy-a{width:180px;height:180px;top:106px;right:80px;border:2px solid rgba(102,216,255,.46);box-shadow:0 0 40px rgba(102,216,255,.26), inset 0 0 32px rgba(102,216,255,.12)}
    .menu-energy-b{width:220px;height:220px;bottom:88px;left:60px;border:2px solid rgba(139,107,255,.3);box-shadow:0 0 40px rgba(139,107,255,.22), inset 0 0 36px rgba(139,107,255,.12)}
    .menu-energy-c{width:70px;height:70px;top:148px;left:44%;background:radial-gradient(circle,var(--menu-accent-soft),transparent 70%);opacity:.9}
    .menu-showcase-gen5 .menu-stage-text{
      color:#eef8ff;
      left:32px;
      right:32px;
      bottom:34px;
      text-transform:none;
      letter-spacing:.02em;
      font-weight:600;
      font-size:1rem;
    }
    .menu-lower{
      display:grid;
      grid-template-columns:minmax(0,1.35fr) minmax(280px,.92fr);
      gap:16px;
      align-items:start;
    }
    .menu-modes,.menu-info-panel{
      padding:20px;
      display:grid;
      gap:16px;
    }
    .menu-section-head{
      display:flex;
      gap:16px;
      justify-content:space-between;
      align-items:flex-end;
    }
    .menu-section-head h3{
      margin:.2rem 0 0;
      font-size:1.8rem;
    }
    .menu-mode-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:14px;
    }
    .menu-mode-card{
      display:grid;
      gap:14px;
      padding:20px;
      text-align:left;
      color:var(--text);
      background:
        linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.06));
      border:1px solid rgba(255,255,255,.12);
      border-radius:24px;
      cursor:pointer;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 20px 30px rgba(0,0,0,.14);
      transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease;
    }
    .menu-mode-card:hover:not(:disabled){
      transform:translateY(-2px);
      border-color:rgba(255,255,255,.2);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 28px 36px rgba(0,0,0,.18);
    }
    .menu-mode-card.locked{
      opacity:.76;
      cursor:not-allowed;
    }
    .menu-mode-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }
    .menu-mode-card h3{
      margin:0;
      font-size:1.65rem;
    }
    .menu-mode-points{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
    }
    .menu-mode-state,.menu-mode-cta{
      color:var(--menu-accent-soft);
      font-weight:700;
    }
    .menu-step-list{
      display:grid;
      gap:10px;
    }
    .menu-step{
      display:grid;
      grid-template-columns:44px 1fr;
      gap:12px;
      align-items:center;
      padding:12px;
      border-radius:18px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
    }
    .menu-step span{
      display:grid;
      place-items:center;
      width:44px;
      height:44px;
      border-radius:50%;
      color:#16211a;
      font-weight:700;
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
    }
    .menu-meta-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
    }
    .menu-meta-card{
      display:grid;
      gap:6px;
      padding:14px;
      border-radius:18px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
    }
    .menu-meta-card strong{
      font-size:1.1rem;
    }
    .battle-ui{
      display:grid;
      gap:6px;
      font-family:"Courier New",monospace;
    }
    .battle-header{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:8px;
      padding:0 .5%;
      max-width:none;
      width:100%;
      margin:0 auto;
    }
    .battle-header h2{
      margin:0;
      font-size:clamp(1.25rem,2vw,1.75rem);
      letter-spacing:.02em;
      text-transform:uppercase;
    }
    .battle-header p{margin:0;max-width:420px;text-align:right;color:var(--muted)}
    .battle-shell{
      display:block;
      max-width:none;
      width:100%;
      margin:0 auto;
    }
    .battle-stage{
      position:relative;
      height:clamp(352px,28vw,430px);
      min-height:0;
      aspect-ratio:auto;
      --battle-pad-x:4.5%;
      --battle-pad-top:6%;
      --battle-feed-bottom:3.2%;
      --battle-feed-height:16.8%;
      --battle-player-line:21.5%;
      --battle-foe-line:14%;
      border:3px solid #151d11;
      border-radius:10px;
      overflow:hidden;
      background:
        linear-gradient(180deg,#e7f3cb 0%,#e7f3cb 54%,#cadc9a 54%,#cadc9a 100%);
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.2), 0 24px 60px rgba(0,0,0,.22);
    }
    .battle-stage::before{
      content:"";
      position:absolute;
      inset:0;
      background:
        radial-gradient(circle at 74% 34%,rgba(255,255,255,.28),transparent 26%),
        radial-gradient(circle at 27% 78%,rgba(255,255,255,.24),transparent 24%);
      pointer-events:none;
    }
    .battle-feed{
      position:absolute;
      left:2.8%;
      right:2.8%;
      bottom:var(--battle-feed-bottom);
      border:3px solid #151d11;
      border-radius:8px;
      padding:1.7% 2.1%;
      display:grid;
      align-content:center;
      min-height:var(--battle-feed-height);
      background:#f8f5e8;
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);
      z-index:3;
    }
    .feed-line{
      color:#1e2b14;
      text-align:left;
      font-size:1.02rem;
      line-height:1.45;
      font-weight:700;
      text-transform:uppercase;
    }
    .combatant{
      position:absolute;
      inset:0;
      display:block;
      z-index:2;
      pointer-events:none;
    }
    .combatant-foe{
    }
    .combatant-player{
    }
    .combatant.flash-hit{transform:translateY(-2px)}
    .combatant.flash-heal{transform:scale(1.02)}
    .combatant.flash-faint{opacity:.45}
    .combatant.flash-switch{transform:translateX(4px)}
    .battle-status{
      position:absolute;
      padding:2.4% 2.8%;
      border:3px solid #151d11;
      border-radius:8px;
      background:#f8f5e8;
      color:#1e2b14;
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);
      pointer-events:auto;
    }
    .battle-status-foe{
      top:var(--battle-pad-top);
      left:var(--battle-pad-x);
      width:24%;
      max-width:none;
    }
    .battle-status-player{
      right:var(--battle-pad-x);
      bottom:calc(var(--battle-player-line) + 1.5%);
      width:25%;
      max-width:none;
    }
    .battle-status-top,.battle-status-meta,.battle-hp-row{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }
    .battle-status-meta{
      margin-top:4px;
      color:#4d5b41;
      font-size:.8rem;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .battle-hp-row{margin-top:8px}
    .hp-label{
      color:#1e2b14;
      font-size:.86rem;
      font-weight:700;
      letter-spacing:.08em;
    }
    .hp{
      height:12px;
      width:100%;
      border-radius:999px;
      background:#c7cbb8;
      overflow:hidden;
    }
    .battle-hp{
      height:14px;
      border:2px solid #1e2b14;
      background:#b7bf9c;
    }
    .hp-fill{height:100%;background:linear-gradient(90deg,#6eb24b,#9fd050)}
    .hp-fill.hp-mid{background:linear-gradient(90deg,#d4bf48,#e9da79)}
    .hp-fill.hp-low{background:linear-gradient(90deg,#b44b41,#de7c60)}
    .battle-sprite-wrap{
      position:relative;
      display:flex;
      align-items:flex-end;
      justify-content:center;
    }
    .battle-sprite-foe{
      position:absolute;
      top:calc(var(--battle-foe-line) + 1.5%);
      right:5.5%;
      width:22%;
      height:31%;
    }
    .battle-sprite-player{
      position:absolute;
      left:5.5%;
      bottom:calc(var(--battle-feed-bottom) + var(--battle-feed-height) - 3.2%);
      width:25%;
      height:38%;
    }
    .battle-shadow{
      position:absolute;
      left:50%;
      bottom:4%;
      width:56%;
      height:11%;
      border-radius:50%;
      background:radial-gradient(circle,rgba(34,49,20,.38) 0%,rgba(34,49,20,.16) 58%,transparent 74%);
      transform:translateX(-50%);
    }
    .battle-footer{
      display:grid;
      grid-template-columns:.92fr .92fr 1.16fr;
      gap:6px;
      max-width:none;
      width:100%;
      margin:0 auto;
    }
    .battle-panel{
      padding:3px;
      gap:4px;
      background:rgba(255,255,255,.05);
    }
    .battle-panel .bench-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    .bench-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    .bench-card{
      display:grid;
      gap:3px;
      padding:4px;
      justify-items:center;
      text-align:center;
      min-height:56px;
    }
    .battle-panel .bench-card strong{
      font-size:.75rem;
      line-height:1.1;
    }
    .battle-panel .bench-card .tiny{
      font-size:.67rem;
      line-height:1.2;
    }
    .battle-panel .bench-card .info-chip{
      padding:4px 6px;
      font-size:.68rem;
    }
    .battle-panel .sprite.sm{width:30px;height:30px}
    .choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .choice-btn{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      min-height:24px;
      padding:3px 8px;
      text-align:left;
    }
    .synergy,.metrics{display:grid;gap:8px}
    .log-line{
      padding:10px 12px;
      border-radius:14px;
      background:rgba(255,255,255,.04);
    }
    .code-box{
      padding:12px;
      display:grid;
      place-items:center;
      background:rgba(255,255,255,.04);
      min-height:52px;
      word-break:break-all;
    }
    .text-input{
      width:100%;
      padding:12px;
      border-radius:16px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.06);
      color:var(--text);
    }
    .sprite{
      image-rendering:pixelated;
      filter:drop-shadow(0 8px 10px rgba(0,0,0,.2));
      flex:0 0 auto;
    }
    .sprite.sm{width:56px;height:56px}
    .sprite.md{width:78px;height:78px}
    .sprite.lg{width:120px;height:120px}
    .sprite.battle{
      display:block;
      width:100%;
      height:100%;
      object-fit:contain;
      object-position:center bottom;
      filter:drop-shadow(0 10px 0 rgba(255,255,255,.18)) drop-shadow(0 18px 16px rgba(0,0,0,.18));
    }
    .battle-sprite-foe .sprite.battle.front{
      transform:translateX(2%) translateY(0);
    }
    .battle-sprite-player .sprite.battle.back{
      transform:translateX(-2%) translateY(12%);
    }
    .modal-backdrop{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.55);
      display:grid;
      place-items:center;
      padding:20px;
    }
    .modal{
      width:min(780px,100%);
      padding:20px;
      background:#16211a;
    }
    .modal-head,.modal-body{
      display:flex;
      gap:16px;
      justify-content:space-between;
      align-items:flex-start;
    }
    .modal-body{
      display:grid;
      grid-template-columns:180px 1fr;
      gap:18px;
    }
    .modal-card{
      padding:18px;
      border-radius:22px;
      display:grid;
      place-items:center;
    }
    .modal-stats,.modal-moves{display:grid;gap:10px}
    .modal-stats span{display:block;color:var(--text)}
    .empty{
      padding:14px;
      border-radius:16px;
      background:rgba(255,255,255,.04);
    }
    .status-row{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
    }
    @media (min-width:721px){
      .battle-view{
        width:min(82vw,1240px);
        max-width:none;
        margin:0 auto;
      }
      .battle-stage{
        --battle-foe-line:11.5%;
        --battle-player-line:20.5%;
      }
      .battle-status-foe{
        width:22%;
      }
      .battle-status-player{
        width:22%;
        bottom:calc(var(--battle-player-line) + .5%);
      }
      .battle-sprite-foe{
        top:calc(var(--battle-foe-line) + .5%);
        right:7.5%;
        width:19%;
        height:24%;
      }
      .battle-sprite-player{
        width:24%;
        height:35%;
      }
    }
    @media (max-height:950px) and (min-width:721px){
      .menu-shell{
        gap:12px;
        padding:8px 0 6px;
      }
      .menu-hero,.menu-lower{
        gap:12px;
      }
      .menu-copy,.menu-modes,.menu-info-panel{
        padding:18px;
        gap:14px;
      }
      .menu-copy h2{
        font-size:clamp(2.3rem,4.1vw,4rem);
      }
      .menu-showcase{
        min-height:334px;
        --menu-dialog-bottom:16px;
        --menu-dialog-height:72px;
        --menu-player-shift-y:-8%;
      }
      .menu-stage-card-foe{top:16px;left:16px;width:min(34%,200px);min-height:60px}
      .menu-stage-mon-foe{top:56px;right:24px;width:18%;height:26%}
      .menu-stage-mon-player{left:24px;width:22%;height:30%}
      .menu-stage-line-bottom{left:16px;right:16px}
      .menu-stage-text{left:26px;right:26px;padding-left:116px;font-size:.82rem;line-height:1.08}
      .menu-mode-card{
        padding:16px;
      }
      .menu-mode-card h3{
        font-size:1.5rem;
      }
      .menu-step{
        padding:10px;
      }
      .menu-meta-card{
        padding:12px;
      }
    }
    @media (max-width:1280px){
      .app-shell{grid-template-columns:1fr}
      .main{order:1}
      .side:first-of-type{order:2}
      .side:last-of-type{order:3}
      .three-col,.two-col,.choice-grid,.bench-grid{grid-template-columns:1fr}
      .preview-card{grid-template-columns:1fr}
      .menu-hero,.menu-lower,.menu-mode-grid,.menu-meta-grid{grid-template-columns:1fr}
      .menu-section-head{align-items:flex-start;flex-direction:column}
      .menu-showcase{min-height:340px}
      .menu-stage-mon-foe{right:28px;width:18%;height:26%}
      .menu-stage-mon-player{left:24px;width:22%;height:30%}
      .battle-footer{grid-template-columns:1fr 1fr}
      .battle-actions-panel{grid-column:1 / -1}
    }
    @media (max-width:720px){
      body{padding:10px}
      .side,.main{padding:14px;border-radius:22px}
      .menu-view .main{padding:0}
      .menu-shell{gap:10px;padding:6px 0 8px}
      .menu-topbar{
        flex-direction:column;
        align-items:stretch;
      }
      .menu-generation-switch{
        width:100%;
      }
      .menu-generation-btn{
        min-width:0;
      }
      .menu-copy,.menu-showcase,.menu-info-panel,.menu-modes{
        border-radius:24px;
      }
      .menu-copy,.menu-modes,.menu-info-panel{
        padding:14px;
        gap:12px;
      }
      .menu-copy h2{
        font-size:clamp(1.8rem,9.4vw,2.7rem);
      }
      .menu-copy p,.menu-section-head p{font-size:.92rem;line-height:1.45}
      .menu-feature-row,.menu-mode-points{
        gap:8px;
      }
      .menu-feature-row span,.menu-mode-points span{padding:6px 9px;font-size:.74rem}
      .menu-feature-row span:nth-child(n+3),
      .menu-mode-points span:nth-child(3){display:none}
      .menu-showcase{
        min-height:146px;
        --menu-dialog-bottom:8px;
        --menu-dialog-height:30px;
        --menu-player-shift-y:-7%;
        padding:10px;
      }
      .menu-stage-card,.menu-tech-card{
        min-width:108px;
        padding:6px 8px;
      }
      .menu-stage-card strong,.menu-tech-card strong{
        font-size:.84rem;
      }
      .menu-stage-card-foe{top:10px;left:10px;width:98px;min-height:42px;padding:6px 7px;gap:0}
      .menu-stage-card-foe strong{font-size:.8rem}
      .menu-stage-card-player{display:none}
      .menu-stage-mon-foe{top:34px;right:8px;width:17%;height:18%}
      .menu-stage-mon-player{display:grid;left:6px;width:20%;height:28%}
      .menu-stage-line-bottom{
        left:12px;
        right:12px;
      }
      .menu-stage-text{
        left:80px;
        right:16px;
        padding-left:0;
        font-size:.56rem;
        letter-spacing:0;
        line-height:1.08;
      }
      .menu-stage-mon-player .menu-sprite-player.back{transform:translateX(-2%) translateY(var(--menu-player-shift-y))}
      .menu-tech-card-player{display:none}
      .menu-energy-a{width:82px;height:82px;top:54px;right:22px}
      .menu-energy-b{width:90px;height:90px;bottom:34px;left:14px}
      .menu-energy-c{width:44px;height:44px;top:86px;left:42%}
      .menu-showcase-gen5 .menu-stage-text{bottom:12px;left:16px;right:16px;font-size:.68rem;line-height:1.2}
      .menu-mode-card{
        padding:10px;
        gap:8px;
        border-radius:20px;
      }
      .menu-mode-card h3{
        font-size:1.06rem;
      }
      .menu-step-list{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      .menu-step{
        grid-template-columns:1fr;
        justify-items:center;
        text-align:center;
        gap:6px;
        padding:8px 6px;
      }
      .menu-step span{
        width:30px;
        height:30px;
      }
      .menu-step strong{
        font-size:.68rem;
        line-height:1.2;
      }
      .menu-meta-grid{
        gap:8px;
      }
      .menu-meta-card{
        padding:9px;
      }
      .menu-meta-card strong{
        font-size:.9rem;
      }
      .battle-view .main{padding:10px}
      .brand h1{font-size:clamp(1.85rem,10vw,2.8rem)}
      .hero,.panel,.draft-card,.preview-card,.combatant,.bench-card,.mode-card{padding:14px}
      .draft-top,.roster-head,.combatant-head,.card-actions,.preview-actions,.actions{
        flex-wrap:wrap;
        align-items:flex-start;
      }
      .card-actions .primary-btn,.card-actions .ghost-btn,.actions .primary-btn,.actions .ghost-btn{
        width:100%;
        justify-content:center;
      }
      .choice-btn{
        flex-direction:column;
        align-items:flex-start;
      }
      .sprite.lg{width:104px;height:104px}
      .battle-stage{
        min-height:36vh;
        border-radius:8px;
        aspect-ratio:auto;
        --battle-pad-x:3%;
        --battle-pad-top:4%;
        --battle-feed-bottom:3%;
        --battle-feed-height:17%;
        --battle-player-line:22%;
        --battle-foe-line:16%;
      }
      .battle-header{
        align-items:flex-start;
        flex-direction:column;
        gap:6px;
      }
      .battle-header p{
        text-align:left;
        max-width:none;
      }
      .combatant{inset:0}
      .battle-status{
        padding:8px 10px;
        border-width:2px;
        border-radius:6px;
      }
      .battle-status-foe{top:var(--battle-pad-top);left:var(--battle-pad-x);width:36%;max-width:none}
      .battle-status-player{right:var(--battle-pad-x);bottom:var(--battle-player-line);width:38%;max-width:none}
      .battle-status .info-chip{padding:6px 8px}
      .battle-status-meta{
        font-size:.68rem;
        letter-spacing:.05em;
      }
      .battle-hp{height:12px}
      .battle-sprite-foe{
        top:var(--battle-foe-line);
        right:8%;
        width:26%;
        height:32%;
      }
      .battle-sprite-player{
        left:7%;
        bottom:calc(var(--battle-feed-bottom) + var(--battle-feed-height) - 4%);
        width:26%;
        height:30%;
      }
      .battle-shadow{width:72%;height:14%;bottom:6%}
      .sprite.battle{width:100%;height:100%}
      .battle-sprite-foe .sprite.battle.front{
        transform:translateX(4%) translateY(0);
      }
      .battle-sprite-player .sprite.battle.back{
        transform:translateX(-4%) translateY(14%);
      }
      .battle-feed{
        left:3%;
        right:3%;
        bottom:var(--battle-feed-bottom);
        min-height:var(--battle-feed-height);
        padding:2% 2.4%;
        border-width:2px;
        border-radius:6px;
      }
      .feed-line{font-size:.8rem}
      .battle-footer{
        grid-template-columns:1fr 1fr;
        gap:6px;
      }
      .battle-panel{
        padding:6px;
        border-radius:18px;
      }
      .battle-panel .bench-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
      .battle-panel .bench-card{
        min-height:70px;
        padding:4px 3px;
      }
      .battle-panel .bench-card .info-chip{
        padding:3px 5px;
        font-size:.62rem;
      }
      .battle-panel .sprite.sm{width:28px;height:28px}
      .choice-grid{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:6px;
      }
      .choice-btn{
        min-height:40px;
        padding:6px 8px;
        gap:3px;
      }
      .modal{
        padding:16px;
        max-height:90vh;
        overflow:auto;
      }
      .modal-body{grid-template-columns:1fr}
      .status-row span{width:100%}
    }
  `;
  document.head.appendChild(style);
}

injectStyles();
render();

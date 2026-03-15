import Peer from 'peerjs';
import {BattleStreams, Dex, Teams} from '@pkmn/sim';
import {
  POKEMON_POOL,
  chooseBattleAction,
  chooseTeamOrder,
  conditionToPercent,
  draftSynergy,
  drawPack,
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
const BATTLE_LOGO_PATH = '../assets/pokemon-logo-cutout.png';
const GENERATION_CONFIG = {
  gen1: {
    id: 'gen1',
    label: 'Gen 1',
    kicker: 'Retro Arena',
    title: 'Pokemon Battle Arena',
    subtitle: 'Choose a generation first. Then pick Bot Run or Link Battle and jump straight into the draft.',
    availability: 'Playable now',
    status: 'Kanto roster live',
    features: ['151 Kanto Pokemon', 'Ready to play', 'Retro arena style inspired by Gen 1'],
    steps: ['Pick a generation', 'Choose a mode', 'Draft, order, battle'],
    modeCards: {
      bot: {
        eyebrow: 'Solo',
        title: 'Bot Run',
        points: ['Always 3 Pokemon to choose from', 'Set your own order', 'Then battle the AI'],
        enabled: true,
        action: 'start-bot',
        cta: 'Start',
      },
      link: {
        eyebrow: 'Online',
        title: 'Link Battle',
        points: ['Share a room code or join one', 'Both players draft in secret across 3 rounds', 'Then battle each other right away'],
        enabled: true,
        action: 'start-link',
        cta: 'Connect',
      },
    },
    note: 'Battle rules depend on the selected generation.',
  },
  gen5: {
    id: 'gen5',
    label: 'Gen 5',
    kicker: 'Next Era Preview',
    title: 'Pokemon Battle Arena',
    subtitle: 'This already previews the visual direction for the later Gen 5 expansion. The playable mode comes next.',
    availability: 'Style preview',
    status: 'Next expansion',
    features: ['Distinct theme', 'More modern arena feel', 'Prepared for expansion'],
    steps: ['Inspect the generation', 'Compare styles', 'Expand it into a full mode later'],
    modeCards: {
      bot: {
        eyebrow: 'Solo',
        title: 'Bot Run',
        points: ['The theme preview is already live', 'The playable Gen 5 mode comes next', 'The structure is ready for future expansion'],
        enabled: false,
        action: 'start-bot',
        cta: 'Coming soon',
      },
      link: {
        eyebrow: 'Online',
        title: 'Link Battle',
        points: ['The design system is already separated', 'Switching styles is visible immediately', 'Online mode comes later'],
        enabled: false,
        action: 'start-link',
        cta: 'Coming soon',
      },
    },
    note: 'Rules stay intentionally generation-agnostic so future systems fit cleanly.',
  },
};
const MENU_SHOWCASE = {
  foe: POKEMON_POOL.find((species) => species.name === 'Mewtwo') || POKEMON_POOL[0],
  player: POKEMON_POOL.find((species) => species.name === 'Charizard') || POKEMON_POOL[1] || POKEMON_POOL[0],
};
const STARTER_ART_PATH = '../assets/firstgenstarter-cutout.png';
const BATTLE_DECOR_ZONES = [
  {leftMin: 1.2, leftMax: 7.4, topMin: 9.5, topMax: 26},
  {leftMin: 1.2, leftMax: 8.2, topMin: 27, topMax: 44},
  {leftMin: 1.2, leftMax: 8.6, topMin: 45, topMax: 62},
  {leftMin: 91.6, leftMax: 98.2, topMin: 9.5, topMax: 26},
  {leftMin: 90.8, leftMax: 98.2, topMin: 27, topMax: 44},
  {leftMin: 90.4, leftMax: 98.2, topMin: 45, topMax: 62},
  {leftMin: 1.2, leftMax: 12.6, topMin: 69.5, topMax: 95},
  {leftMin: 87.4, leftMax: 98.2, topMin: 69.5, topMax: 95},
];

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
  message: 'Choose Bot Run or Link Battle.',
  actionLocked: false,
  selectedChoice: '',
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
    remoteName: 'Opponent',
    status: 'No connection yet.',
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

function statusFromCondition(condition = '') {
  if (!condition || condition.endsWith(' fnt')) return condition.endsWith(' fnt') ? 'fainted' : '';
  const match = condition.match(/\b(brn|frz|par|psn|tox|slp)\b/i);
  return match ? match[1].toLowerCase() : '';
}

function spriteTag(member, facing = 'front', size = 'md') {
  if (!member?.sprites?.[facing]) return '';
  return `<img class="sprite ${size} ${facing}" src="${member.sprites[facing]}" alt="${member.name}">`;
}

function seededUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function renderBattleDecor() {
  return `<div class="battle-decor-layer" aria-hidden="true">${POKEMON_POOL.map((member, index) => {
    if (!member?.sprites?.front) return '';
    const zone = BATTLE_DECOR_ZONES[index % BATTLE_DECOR_ZONES.length];
    const left = zone.leftMin + (zone.leftMax - zone.leftMin) * seededUnit(index + 11);
    const top = zone.topMin + (zone.topMax - zone.topMin) * seededUnit(index + 97);
    const size = 18 + Math.round(seededUnit(index + 173) * 20);
    const rotation = -10 + seededUnit(index + 241) * 20;
    const opacity = 0.1 + seededUnit(index + 311) * 0.12;
    return `<img class="battle-decor-sprite" src="${member.sprites.front}" alt="" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;width:${size}px;height:${size}px;opacity:${opacity.toFixed(2)};transform:translate(-50%,-50%) rotate(${rotation.toFixed(2)}deg);">`;
  }).join('')}</div>`;
}

function menuSpriteTag(member, facing = 'front', slot = 'foe') {
  if (!member?.sprites?.[facing]) return `<div class="menu-mon-placeholder menu-mon-placeholder-${slot}">${slot === 'foe' ? 'F' : 'P'}</div>`;
  return `<img class="menu-sprite menu-sprite-${slot} ${facing}" src="${member.sprites[facing]}" alt="${member.name}">`;
}

function createLoadout(species) {
  const set = generateSet(species, dex);
  return {...species, set, archetype: setArchetype(species, set), moveNames: set.moves.map((moveId) => dex.moves.get(moveId).name)};
}

function currentEnemyLabel() {
  return state.playMode === 'bot' ? `${state.enemyName || 'Opponent'} #${state.enemyNumber}` : state.link.remoteName;
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

function inspectMoveDetails(member) {
  const moveIds = member.set?.moves || generateSet(member, dex).moves;
  return moveIds.map((moveId) => dex.moves.get(moveId)).filter((move) => move?.exists);
}

function formatMoveAccuracy(move) {
  return move.accuracy === true ? '--' : `${move.accuracy}`;
}

function formatMovePower(move) {
  return move.category === 'Status' ? '--' : `${move.basePower || 0}`;
}

function renderInspectMoveCard(move) {
  const effectText = move.desc && move.desc !== 'No additional effect.' ? move.desc : move.shortDesc && move.shortDesc !== 'No additional effect.' ? move.shortDesc : 'No additional effect.';
  return `<article class="inspect-move-card">
    <div class="inspect-move-head">
      <strong>${move.name}</strong>
      <div class="inspect-move-tags"><span>${move.type}</span><span>${move.category}</span></div>
    </div>
    <div class="inspect-move-stats">
      <div><span>PWR</span><strong>${formatMovePower(move)}</strong></div>
      <div><span>ACC</span><strong>${formatMoveAccuracy(move)}</strong></div>
      <div><span>PP</span><strong>${move.pp || '--'}</strong></div>
      <div><span>PRI</span><strong>${move.priority || 0}</strong></div>
    </div>
    <p><span>Effect</span>${effectText}</p>
  </article>`;
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
    <div class="roster-head">${spriteTag(member, 'front', 'sm')}<div><strong>${member.name}</strong><div class="tiny">#${member.num} | ${member.types.join(' / ')}</div></div><button class="info-chip" data-inspect="${member.name}">Info</button></div>
    <div class="tiny">${reveal ? `Lv100 ${member.battleStats.hp}/${member.battleStats.atk}/${member.battleStats.def}/${member.battleStats.spc}/${member.battleStats.spe}` : 'Data hidden'}</div>
  </div>`;
}

function renderSidePanel(title, team, reveal) {
  const synergy = team.length ? draftSynergy(team) : null;
  return `<div class="panel"><div class="label">${title}</div>
    ${team.length ? team.map((member) => renderRosterCard(member, reveal)).join('') : '<div class="empty">No picks yet.</div>'}
    ${synergy ? `<div class="synergy"><span>Types ${synergy.typeCoverage}</span><span>Profiles ${synergy.roleCoverage}</span><span>Control ${synergy.control}</span></div>` : ''}
  </div>`;
}

function renderOpponentPanel() {
  if (state.playMode === 'link' && state.phase !== 'battle') {
    return `<div class="panel"><div class="label">Opponent</div><div class="empty"><strong>${state.link.connected ? state.link.remoteName : 'No opponent'}</strong><div>${state.link.remoteDraftCount}/3 picks locked</div><div>${state.link.remoteReady ? 'Ready to battle' : 'Not ready yet'}</div></div></div>`;
  }
  const team = state.playMode === 'bot' ? (state.phase === 'draft' ? state.opponentDraft : state.opponentLoadout) : state.opponentLoadout;
  return renderSidePanel(state.playMode === 'bot' ? currentEnemyLabel() : 'Opponent', team, state.playMode === 'bot');
}

function renderDraftStatCells(member) {
  const stats = [
    ['HP', member.battleStats.hp],
    ['ATK', member.battleStats.atk],
    ['DEF', member.battleStats.def],
    ['SPC', member.battleStats.spc],
    ['SPE', member.battleStats.spe],
  ];
  return stats.map(([label, value]) => `<div class="draft-stat-cell"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderDraftCard(species, pickAttr) {
  return `<article class="draft-card draft-choice-card" style="background:${typeGradient(species.types)}">
    <div class="draft-choice-head">
      <div><div class="label">#${species.num}</div><h3>${species.name}</h3></div>
      <button class="info-chip" data-inspect="${species.name}">Info</button>
    </div>
    <div class="draft-choice-body">
      <div class="draft-choice-sprite">${spriteTag(species, 'front', 'lg')}</div>
      <div class="draft-choice-copy">
        <div class="types">${species.types.map((type) => `<span>${type}</span>`).join('')}</div>
        <div class="move-row">${previewMoves(species, dex).map((move) => `<span>${move}</span>`).join('')}</div>
      </div>
    </div>
    <div class="draft-stat-grid">${renderDraftStatCells(species)}</div>
    <div class="card-actions"><button class="primary-btn" ${pickAttr}>Pick</button></div>
  </article>`;
}

function renderDraftTeamSlots(team) {
  return `<div class="draft-team-strip">${Array.from({length: 3}, (_, index) => {
    const member = team[index];
    if (!member) {
      return `<div class="draft-team-slot empty"><span class="draft-team-index">${index + 1}</span><div><strong>Empty slot</strong><div class="tiny">Your pick appears here.</div></div></div>`;
    }
    return `<div class="draft-team-slot filled" style="background:${typeGradient(member.types)}">
      <span class="draft-team-index">${index + 1}</span>
      ${spriteTag(member, 'front', 'sm')}
      <div class="draft-team-copy"><strong>${member.name}</strong><div class="tiny">${member.types.join(' / ')}</div></div>
      <button class="info-chip" data-inspect="${member.name}">Info</button>
    </div>`;
  }).join('')}</div>`;
}

function renderDraftStatusCard(mode, roundLabel) {
  const filled = state.playerDraft.length;
  const progress = `<div class="draft-status-progress">${Array.from({length: 3}, (_, index) => `<span class="${index < filled ? 'filled' : ''}">${index + 1}</span>`).join('')}</div>`;
  return `<div class="draft-status-card">
    <div class="label">${mode === 'link' ? 'Opponent status' : 'Draft progress'}</div>
    <strong>${filled}/3 picked</strong>
    ${progress}
    <div class="draft-status-list">
      <span>${state.link.connected ? 'Connection ready' : 'Waiting for connection'}</span>
      <span>${state.link.connected ? state.link.remoteName : 'No opponent connected'}</span>
      <span>${state.link.localPickLocked ? 'Pick locked' : 'Pick 1 of 3 now'}</span>
    </div>
  </div>`;
}

function renderDraftShell({mode, roundLabel, title, statusCopy, chips, action, cards}) {
  return `<section class="draft-shell">
    <div class="draft-topbar">
      <a class="ghost-btn back" href="../index.html#games">Back to home</a>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>${mode === 'bot' ? 'Bot Run' : 'Link Battle'}</span></div>
    </div>
    <section class="draft-hero-panel">
      <div class="draft-hero-copy">
        <div class="draft-kicker-row"><span class="label">${mode === 'bot' ? 'Arena Draft' : 'Hidden Draft'}</span><span class="draft-status-pill">${roundLabel}</span></div>
        <h2>${title}</h2>
        <p>${statusCopy}</p>
        <div class="draft-chip-row">${chips.map((chip) => `<span>${chip}</span>`).join('')}</div>
      </div>
    </section>
    ${mode === 'link' ? `<section class="draft-link-status">${renderDraftStatusCard(mode, roundLabel)}</section>` : ''}
    <section class="draft-team-panel">
      <div class="draft-section-head"><div><div class="label">Your Team</div><h3>3 draft slots</h3></div><p>Your picks appear here right away. Use Info to check stats and moves before you lock one in.</p></div>
      ${renderDraftTeamSlots(state.playerDraft)}
    </section>
    <section class="draft-board">
      <div class="draft-section-head"><div><div class="label">Selection</div><h3>Pick 1 of 3 Pokemon</h3></div><p>${action}</p></div>
      <div class="draft-mobile-swipe-hint"><span>←</span><strong>Swipe for the next card</strong><em>● ● ●</em></div>
      <section class="draft-choice-grid">${cards}</section>
    </section>
  </section>`;
}

function renderPreviewHeroGuide(mode) {
  const slots = Array.from({length: 3}, (_, index) => {
    const member = state.playerPreview[index];
    if (!member) {
      return `<div class="preview-hero-slot empty"><span>${index + 1}</span><strong>Open</strong><div>Filled after the draft.</div></div>`;
    }
    return `<div class="preview-hero-slot" style="background:${typeGradient(member.types)}">
      <span>${index + 1}</span>
      <strong>${member.name}</strong>
      <div>${index === 0 ? 'Leads the battle' : 'Ready to switch in'}</div>
    </div>`;
  }).join('');
  const note = mode === 'bot'
    ? 'Only check your lead and your two switch options. The opposing team stays hidden until battle.'
    : 'Your order stays hidden until both sides are ready and the battle begins.';
  return `<aside class="preview-hero-guide">
    <div class="label">${mode === 'bot' ? 'Battle plan' : 'Hidden plan'}</div>
    <div class="preview-hero-slot-grid">${slots}</div>
    <div class="preview-hero-note">${note}</div>
  </aside>`;
}

function renderPreviewShell({mode, title, statusCopy, chips, actionLabel, playerPanelTitle, playerCards, asidePanel}) {
  return `<section class="preview-shell">
    <div class="draft-topbar">
      <a class="ghost-btn back" href="../index.html#games">Back to home</a>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>${mode === 'bot' ? 'Bot Run' : 'Link Battle'}</span></div>
    </div>
    <section class="draft-hero-panel preview-hero-panel">
      <div class="draft-hero-copy">
        <div class="draft-kicker-row"><span class="label">${mode === 'bot' ? 'Order' : 'Hidden Order'}</span><span class="draft-status-pill">${mode === 'bot' ? currentEnemyLabel() : 'Arrange team'}</span></div>
        <h2>${title}</h2>
        <p>${statusCopy}</p>
        <div class="draft-chip-row">${chips.map((chip) => `<span>${chip}</span>`).join('')}</div>
      </div>
      ${renderPreviewHeroGuide(mode)}
    </section>
    <section class="preview-main-grid">
      <section class="preview-panel preview-order-panel">
        <div class="draft-section-head"><div><div class="label">${playerPanelTitle}</div><h3>Move your team into lead order</h3></div><p class="preview-order-note">${actionLabel}</p></div>
        <div class="preview-card-list">${playerCards}</div>
      </section>
      <aside class="preview-side-panel">${asidePanel}</aside>
    </section>
  </section>`;
}

function renderPreviewCard(member, index, controls) {
  return `<div class="preview-card" style="background:${typeGradient(member.types)}">
    <div class="preview-card-media"><span class="preview-rank">${index + 1}</span>${spriteTag(member, 'front', 'sm')}</div>
    <div class="preview-copy"><strong>${member.name}</strong><div class="tiny">${member.moveNames.join(', ')}</div></div>
    <div class="preview-actions"><button class="info-chip" data-inspect="${member.name}">Info</button>${controls ? `<button class="mini-btn" data-move-index="${index}" data-move-dir="-1" ${index === 0 ? 'disabled' : ''}>Up</button><button class="mini-btn" data-move-index="${index}" data-move-dir="1" ${index === state.playerPreview.length - 1 ? 'disabled' : ''}>Down</button>` : ''}</div>
  </div>`;
}

function renderInspectModal() {
  if (!state.inspecting) return '';
  const member = state.inspecting;
  const moves = inspectMoveDetails(member);
  return `<div class="modal-backdrop" data-close-inspect="1">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head"><div><div class="label">Pokemon Info</div><h3>${member.name}</h3></div><button class="ghost-btn" data-close-inspect="1">Close</button></div>
      <div class="modal-body">
        <div class="inspect-sidebar">
          <div class="modal-card inspect-summary" style="background:${typeGradient(member.types)}">
            ${spriteTag(member, 'front', 'lg')}
            <div class="inspect-summary-meta">
              <div class="inspect-summary-head"><span>#${member.num}</span><strong>${member.name}</strong></div>
              <div class="types">${member.types.map((type) => `<span>${type}</span>`).join('')}</div>
            </div>
          </div>
          <div class="modal-stats inspect-stat-panel">
            <strong>Level 100 Stats</strong>
            <div class="inspect-stat-grid">
              <div><span>HP</span><strong>${member.battleStats.hp}</strong></div>
              <div><span>ATK</span><strong>${member.battleStats.atk}</strong></div>
              <div><span>DEF</span><strong>${member.battleStats.def}</strong></div>
              <div><span>SPC</span><strong>${member.battleStats.spc}</strong></div>
              <div><span>SPE</span><strong>${member.battleStats.spe}</strong></div>
            </div>
          </div>
        </div>
        <div class="inspect-details">
          <div class="modal-moves inspect-move-panel">
            <strong>Moves</strong>
            <div class="inspect-move-list">${moves.map((move) => renderInspectMoveCard(move)).join('')}</div>
          </div>
        </div>
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
        <span class="menu-mode-state">${card.enabled ? generation.availability : 'In development'}</span>
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
        <div class="menu-stage-text">Choose a generation, pick a mode, then draft and battle.</div>
      </div>`
    : `<div class="menu-showcase menu-showcase-gen5">
        <div class="menu-tech-card menu-tech-card-foe"><span class="label">Theme Shift</span><strong>Gen 5 Preview</strong><span>Distinct battle style</span></div>
        <div class="menu-tech-card menu-tech-card-player"><span class="label">Expansion</span><strong>Next Battle Layer</strong><span>Mode arrives later</span></div>
        <div class="menu-energy menu-energy-a"></div>
        <div class="menu-energy menu-energy-b"></div>
        <div class="menu-energy menu-energy-c"></div>
        <div class="menu-stage-text">The switch already separates the visual language of each generation.</div>
      </div>`;
  return `<section class="menu-shell">
    <div class="menu-topbar">
      <a class="ghost-btn back" href="../index.html#games">Back to home</a>
      <div class="menu-generation-switch" role="tablist" aria-label="Choose generation">
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
        <div class="menu-section-head"><div><div class="label">Mode Select</div><h3>Choose your arena</h3></div><p>${generation.note}</p></div>
        <div class="menu-mode-grid">${renderMenuModeCard(botCard)}${renderMenuModeCard(linkCard)}</div>
      </div>
      <div class="menu-info-panel">
        <div class="label">Flow</div>
        <div class="menu-step-list">${generation.steps.map((step, index) => `<div class="menu-step"><span>${index + 1}</span><strong>${step}</strong></div>`).join('')}</div>
        <div class="menu-meta-grid">
          <div class="menu-meta-card"><span class="label">Active Generation</span><strong>${generation.label}</strong></div>
          <div class="menu-meta-card"><span class="label">Best Run</span><strong>${state.bestRun}</strong></div>
          <div class="menu-meta-card"><span class="label">Status</span><strong>${generation.availability}</strong></div>
        </div>
      </div>
    </section>
  </section>`;
}

function renderDraftStage() {
  const round = Math.min(state.playerDraft.length + 1, 3);
  return renderDraftShell({
    mode: 'bot',
    roundLabel: `Round ${round} of 3`,
    title: 'Pick your next Pokemon',
    statusCopy: state.message,
    chips: [currentGenerationConfig().label, '3-card draft', `${state.playerDraft.length}/3 picked`],
    action: 'These three cards are your full selection for this round.',
    cards: state.pack.map((species) => renderDraftCard(species, `data-draft-id="${species.id}"`)).join(''),
  });
}

function renderBotPreviewStage() {
  return renderPreviewShell({
    mode: 'bot',
    title: `Arrange your team for ${currentEnemyLabel()}`,
    statusCopy: state.message,
    chips: [currentGenerationConfig().label, '3 Pokemon picked', 'Set your lead order'],
    actionLabel: 'Your order decides your lead and your switch options.',
    playerPanelTitle: 'Your order',
    playerCards: state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join(''),
    asidePanel: `<div class="preview-panel preview-opponent-panel">
        <div class="draft-section-head"><div><div class="label">Arena ready</div><h3>${currentEnemyLabel()}</h3></div><p>Only set your lead and your two switch options now.</p></div>
        <div class="preview-status-stack">
          <div class="empty"><strong>Set your order</strong><div>Slot 1 starts the battle. Slots 2 and 3 are your switch options.</div></div>
        </div>
        <div class="actions"><button class="primary-btn" data-action="start-battle">Start Battle</button><button class="ghost-btn" data-action="go-menu">Mode Select</button></div>
      </div>`,
  });
}

function renderLinkSetupStage() {
  return `<section class="hero"><div><div class="label">Link Battle</div><h2>Connection</h2></div><p>${state.link.status}</p></section>
    <section class="two-col"><div class="panel"><div class="label">Host</div><button class="primary-btn" data-action="host-link">Open room</button><div class="code-box">${state.link.peerId || 'No code yet'}</div></div><div class="panel"><div class="label">Guest</div><input id="joinCodeInput" class="text-input" placeholder="Enter room code" value="${state.hostJoinCode}"><button class="primary-btn" data-action="join-link">Connect</button></div></section>
    <div class="actions"><button class="ghost-btn" data-action="go-menu">Back</button></div>`;
}

function renderLinkDraftStage() {
  return renderDraftShell({
    mode: 'link',
    roundLabel: `Round ${state.link.draftRound || 1} of 3`,
    title: 'Secretly pick your next Pokemon',
    statusCopy: state.link.connected ? `Connected to ${state.link.remoteName}. Both sides pick from three options at the same time.` : 'Waiting for connection.',
    chips: [currentGenerationConfig().label, 'Hidden draft', `${state.playerDraft.length}/3 picked`, state.link.connected ? 'Opponent connected' : 'Waiting for opponent'],
    action: state.link.localPickLocked ? 'Your pick is locked. Wait for the other side.' : 'Only your three cards are visible. The opponent cannot see your pack.',
    cards: state.link.localPack.map((species) => renderDraftCard(species, `data-link-draft-id="${species.id}" ${state.link.localPickLocked ? 'disabled' : ''}`)).join(''),
  });
}

function renderLinkPreviewStage() {
  return renderPreviewShell({
    mode: 'link',
    title: 'Arrange your team in secret',
    statusCopy: 'The opponent cannot see your changes live. Everything is revealed only when the battle starts.',
    chips: [currentGenerationConfig().label, 'Hidden draft', `${state.playerPreview.length}/3 ready`, state.link.connected ? 'Opponent connected' : 'Waiting for opponent'],
    actionLabel: 'Use up and down until your lead order looks right.',
    playerPanelTitle: 'Your order',
    playerCards: state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join(''),
    asidePanel: `<div class="preview-panel preview-status-panel">
        <div class="draft-section-head"><div><div class="label">Opponent status</div><h3>${state.link.connected ? state.link.remoteName : 'Waiting for opponent'}</h3></div><p>Your changes stay hidden until both sides are ready.</p></div>
        <div class="preview-status-stack">
          <div class="empty"><strong>${state.link.remoteDraftCount}/3 picks locked</strong><div>${state.link.remoteReady ? 'Ready to battle' : 'Not ready yet'}</div></div>
          <div class="empty"><strong>${state.link.connected ? 'Connection ready' : 'Connection open'}</strong><div>${state.link.localPickLocked ? 'Your last pick is locked' : 'Your team can still be reordered'}</div></div>
        </div>
        <div class="actions"><button class="primary-btn" data-action="ready-link-battle" ${!state.link.connected ? 'disabled' : ''}>Ready to battle</button><button class="ghost-btn" data-action="link-rematch">Draft again</button></div>
      </div>`,
  });
}

function hpTone(percent) {
  if (percent <= 20) return 'hp-low';
  if (percent <= 50) return 'hp-mid';
  return 'hp-high';
}

function renderCombatant(mon, label, facing, sideKey, side) {
  if (!mon) return `<div class="combatant combatant-${side} empty"></div>`;
  const percent = conditionToPercent(mon.condition);
  return `<div class="combatant combatant-${side} ${state.flash[sideKey]}">
    <div class="battle-status battle-status-${side}">
      <div class="battle-status-top">
        <div><div class="label">${label}</div><strong>${mon.name}</strong></div>
        <button class="info-chip" data-inspect="${mon.name}">Info</button>
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
  if (!bench.length) return '<div class="empty">No reserve available.</div>';
  return `<div class="bench-grid">${bench.map((member) => `<div class="bench-card bench-card-switch" style="background:${typeGradient(member.types || ['Normal'])}">
      <div class="bench-card-sprite">${spriteTag(member, own ? 'back' : 'front', 'sm')}</div>
      <div class="bench-card-copy"><strong>${member.name}</strong><div class="tiny">${member.condition}</div></div>
      <button class="info-chip" data-inspect="${member.name}">Info</button>
    </div>`).join('')}</div>`;
}

function renderChoiceButtons() {
  if (!state.playerRequest) return '<div class="empty">Waiting for the next request.</div>';
  const switchDisabled = state.actionLocked ? 'disabled' : '';
  if (state.playerRequest.forceSwitch) {
    return `<div class="choice-grid">${state.playerRequest.side.pokemon.map((mon, index) => ({mon, index})).filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt')).map(({mon, index}) => `<button class="choice-btn" ${switchDisabled} data-choice="switch ${index + 1}" data-choice-kind="switch">${mon.details.split(',')[0]}<span>Forced switch</span></button>`).join('')}</div>`;
  }
  const moves = state.playerRequest.active?.[0]?.moves.map((move, index) => {
    const selected = state.selectedChoice === `move ${index + 1}` ? 'selected' : '';
    const ppText = Number.isFinite(move.pp) && Number.isFinite(move.maxpp) ? `<span>${move.pp}/${move.maxpp} PP</span>` : '';
    return `<button class="choice-btn ${selected}" data-choice="move ${index + 1}" data-choice-kind="move" data-move-name="${move.move}">${move.move}${ppText}</button>`;
  }).join('') || '';
  const switches = !state.playerRequest.active?.[0]?.trapped
    ? state.playerRequest.side.pokemon.map((mon, index) => ({mon, index})).filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt')).map(({mon, index}) => `<button class="choice-btn alt" ${switchDisabled} data-choice="switch ${index + 1}" data-choice-kind="switch">${mon.details.split(',')[0]}<span>Spend your turn</span></button>`).join('')
    : '';
  return `<div class="choice-grid">${moves}${switches}</div>`;
}

function renderBattleStage() {
  const rematch = state.playMode === 'link' && state.battleFinished ? '<button class="primary-btn" data-action="link-rematch">Rematch</button>' : '';
  const latestFeed = state.battleFeed[0] || 'The battle is about to begin.';
  const streak = `Win Streak ${state.runWins}`;
  return `<section class="battle-ui">
    ${renderBattleDecor()}
    <div class="battle-frame-top">
      <button class="ghost-btn battle-mode-link" data-action="go-menu">Mode Select</button>
      <div class="battle-brand-logo"><img src="${BATTLE_LOGO_PATH}" alt="Pokemon logo"></div>
      <div class="battle-streak-badge"><span class="label">Run</span><strong>${streak}</strong></div>
    </div>
    <div class="battle-desktop-shell">
      <div class="battle-center">
        <div class="battle-header"><div><div class="label">Battle Phase</div><h2>${currentEnemyLabel()}</h2></div><p>${state.message}</p></div>
        <section class="battle-shell"><div class="battle-stage">${renderCombatant(foeActive(), currentEnemyLabel(), 'front', foeSide(), 'foe')}<div class="battle-feed"><div class="feed-line">${latestFeed}</div></div>${renderCombatant(ownActive(), 'You', 'back', ownSide(), 'player')}</div></section>
        <section class="battle-footer">
          <div class="panel battle-panel"><div class="label">Your Bench</div>${renderBench(ownTeamState(), true)}</div>
          <div class="panel battle-panel battle-actions-panel"><div class="label">Actions</div>${renderChoiceButtons()}<div class="actions">${rematch}<button class="ghost-btn battle-mobile-menu" data-action="go-menu">Mode Select</button></div></div>
        </section>
        <div class="battle-starter-art"><img src="${STARTER_ART_PATH}" alt="First-generation starters"></div>
      </div>
    </div>
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
  const draftView = state.phase === 'draft' || state.phase === 'link-draft' || state.phase === 'preview' || state.phase === 'link-preview';
  if (menuView) {
    app.innerHTML = `<div class="app-shell menu-view theme-${state.generation}">
      <main class="main menu-main">${renderStage()}</main>
      ${renderInspectModal()}
    </div>`;
  } else if (draftView) {
    app.innerHTML = `<div class="app-shell draft-view theme-${state.generation}">
      <main class="main draft-main">${renderStage()}</main>
      ${renderInspectModal()}
    </div>`;
  } else {
    app.innerHTML = `<div class="app-shell ${battleView ? 'battle-view' : ''} theme-${state.generation}">
      <aside class="side"><a class="ghost-btn back" href="../index.html#games">Back to home</a><div class="brand"><div class="label">Pokemon Battler</div><h1>Kanto Link Arena</h1><p>Gen 1 sprites, level 100 stats, RBY rules, and Link Battles with a hidden draft.</p></div><div class="panel metrics"><span>Mode ${state.playMode === 'bot' ? 'Bot Run' : 'Link Battle'}</span><span>151 Pokemon</span><span>Best Run ${state.bestRun}</span></div>${renderSidePanel('Your Team', ownTeam, true)}${renderOpponentPanel()}</aside>
      <main class="main">${renderStage()}</main>
      <aside class="side"><div class="panel"><div class="label">Notes</div><div class="empty">Rules follow the active generation.</div></div><div class="panel"><div class="label">Log</div>${state.logs.map((line) => `<div class="log-line">${line}</div>`).join('')}</div></aside>
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
  document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => handleChoiceClick(button.dataset.choice, button.dataset.choiceKind || '', button.dataset.moveName || '')));
  document.querySelectorAll('[data-inspect]').forEach((button) => button.addEventListener('click', () => openInspect(button.dataset.inspect)));
  document.querySelectorAll('[data-close-inspect]').forEach((button) => button.addEventListener('click', closeInspect));
  document.getElementById('joinCodeInput')?.addEventListener('input', (event) => { state.hostJoinCode = event.target.value.trim(); });
}

function resetBattleState() {
  state.battle = null;
  state.playerRequest = null;
  state.actionLocked = false;
  state.selectedChoice = '';
  state.battleFinished = false;
  state.teamStates = {p1: [], p2: []};
  state.active = {p1: null, p2: null};
  state.lastMove = {p1: '', p2: ''};
  state.flash = {p1: '', p2: ''};
  state.battleFeed = [];
}

function selectedMoveChoice(request = state.playerRequest) {
  if (!request || request.forceSwitch || !state.selectedChoice?.startsWith('move ')) return '';
  const slot = Number(state.selectedChoice.split(' ')[1]) - 1;
  const move = request.active?.[0]?.moves?.[slot];
  return move && !move.disabled && move.pp > 0 ? state.selectedChoice : '';
}

function maybeSubmitHeldMove(request = state.playerRequest) {
  const choice = selectedMoveChoice(request);
  if (!choice) {
    if (state.selectedChoice) state.selectedChoice = '';
    return false;
  }
  if (state.actionLocked) return false;
  state.selectedChoice = '';
  submitChoice(choice);
  return true;
}

function handleChoiceClick(choice, kind, moveName) {
  if (kind !== 'move') return submitChoice(choice);
  if (!state.actionLocked) {
    state.selectedChoice = '';
    render();
    return submitChoice(choice);
  }
  if (state.selectedChoice === choice) {
    state.selectedChoice = '';
    return render();
  }
  state.selectedChoice = choice;
  render();
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
  state.message = 'Pick your first Pokemon for the Bot Run.';
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
    prepareNextEnemy('Your team is ready. Arrange your lead now.');
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
    state.message = 'Choose Bot Run or Link Battle.';
    return render();
  }
  if (action === 'set-generation-gen5') {
    state.generation = 'gen5';
    state.message = 'The Gen 5 expansion is prepared as a style preview.';
    return render();
  }
  if (state.generation !== 'gen1' && (action === 'start-bot' || action === 'start-link')) {
    state.message = 'The playable Gen 5 mode arrives in the next expansion.';
    return render();
  }
  if (action === 'start-bot') return resetDraft();
  if (action === 'start-link') {
    state.playMode = 'link';
    state.phase = 'link-setup';
    state.message = 'Open a room or join one.';
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
    state.message = 'Choose Bot Run or Link Battle.';
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
    state.link.status = 'Room open. Share the code.';
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
    state.link.status = 'Connection ready.';
    sendLinkMessage({type: 'hello', name: 'Opponent'});
    setupLinkDraft();
  });
  conn.on('data', handleLinkMessage);
  conn.on('close', () => {
    state.link.connected = false;
    state.link.status = 'Connection closed.';
    render();
  });
}

function handleLinkMessage(message) {
  if (message.type === 'hello') {
    state.link.status = 'Connection ready.';
    state.link.remoteName = message.name || 'Opponent';
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
    if (!maybeSubmitHeldMove(message.request)) render();
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
    p1Name: 'You',
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
    p1Name: 'You',
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
  state.message = `${p2Name} accepts the challenge.`;
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
          if (!maybeSubmitHeldMove(request)) render();
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
  state.teamStates[sideKey] = request.side.pokemon.map((mon, index) => {
    const name = mon.details.split(',')[0];
    const existing = state.teamStates[sideKey]?.[index];
    const original = resolveMember(name);
    return {
      ...(original || {name, types: ['Normal'], sprites: {}}),
      ...(existing?.name === name ? existing : {}),
      condition: mon.condition,
      active: mon.active,
      status: mon.status || statusFromCondition(mon.condition),
    };
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
    brn: 'burn',
    frz: 'freeze',
    par: 'paralysis',
    psn: 'poison',
    tox: 'bad poison',
    slp: 'sleep',
    confusion: 'confusion',
  };
  return labels[status] || status;
}

function battleText(parts) {
  const type = parts[1];
  if (type === 'move') return `${parts[2].split(': ').pop()} used ${parts[3]}.`;
  if (type === '-miss') return `${parts[2].split(': ').pop()} missed.`;
  if (type === '-supereffective') return "It's super effective.";
  if (type === '-resisted') return "It's not very effective.";
  if (type === '-crit') return 'A critical hit.';
  if (type === 'switch') return `${parts[2].split(': ').pop()} entered the battle.`;
  if (type === 'faint') return `${parts[2].split(': ').pop()} fainted.`;
  if (type === '-status') return `${parts[2].split(': ').pop()} is afflicted with ${formatStatus(parts[3])}.`;
  if (type === '-curestatus') return `${parts[2].split(': ').pop()} recovered.`;
  if (type === '-clearstatus') return `${parts[2].split(': ').pop()} is cured.`;
  if (type === 'cant') {
    const name = parts[2].split(': ').pop();
    const reason = parts[3];
    if (reason === 'slp') return `${name} is fast asleep.`;
    if (reason === 'frz') return `${name} is frozen solid.`;
    if (reason === 'par') return `${name} is paralyzed and cannot move.`;
    if (reason === 'flinch') return `${name} flinched.`;
    if (reason === 'recharge') return `${name} must recharge.`;
    if (reason === 'Disable') return `${name} cannot use that move.`;
    return `${name} cannot act.`;
  }
  if (type === '-start') {
    const name = parts[2].split(': ').pop();
    if (parts[3] === 'confusion') return `${name} became confused.`;
    if (parts[3] === 'Substitute') return `${name} put up a substitute.`;
    return `${name} is affected by ${parts[3]}.`;
  }
  if (type === '-end') {
    const name = parts[2].split(': ').pop();
    if (parts[3] === 'confusion') return `${name} snapped out of confusion.`;
    if (parts[3] === 'Substitute') return `${name}'s substitute faded.`;
    return `${parts[3]} ended for ${name}.`;
  }
  if (type === '-activate') {
    const name = parts[2].split(': ').pop();
    if (parts[3] === 'confusion') return `${name} is confused.`;
    if (parts[3]?.startsWith('move: Bide')) return `${name} is storing energy.`;
    return `${name} activates ${parts[3]}.`;
  }
  if (type === '-sidestart') return `${parts[2].startsWith('p1') ? 'One side' : 'The other side'} gained ${parts[3]}.`;
  if (type === '-sideend') return `${parts[3]} wore off.`;
  if (type === '-fieldstart') return `${parts[2]} began.`;
  if (type === '-fieldend') return `${parts[2]} ended.`;
  if (type === '-prepare') return `${parts[2].split(': ').pop()} is getting ready for ${parts[3]}.`;
  if (type === '-singleturn') return `${parts[2].split(': ').pop()} is affected by ${parts[3]}.`;
  if (type === '-singlemove') return `${parts[2].split(': ').pop()} gained ${parts[3]}.`;
  if (type === '-boost') return `${parts[2].split(': ').pop()} boosts ${parts[3]}.`;
  if (type === '-unboost') return `${parts[2].split(': ').pop()} loses ${parts[3]}.`;
  if (type === '-clearboost') return `${parts[2].split(': ').pop()}'s stat boosts were cleared.`;
  if (type === '-clearallboost') return 'All stat changes were cleared.';
  if (type === '-clearpositiveboost') return `${parts[2].split(': ').pop()}'s positive boosts were removed.`;
  if (type === '-clearnegativeboost') return `${parts[2].split(': ').pop()}'s negative boosts were removed.`;
  if (type === '-setboost') return `${parts[2].split(': ').pop()}'s ${parts[3]} changed.`;
  if (type === '-immune') return `${parts[2].split(': ').pop()} is unaffected.`;
  if (type === '-fail') return 'But it failed.';
  if (type === '-mustrecharge') return `${parts[2].split(': ').pop()} must wait this turn.`;
  if (type === '-hitcount') return `${parts[2]} hits.`;
  if (type === '-ohko') return 'A one-hit knockout.';
  if (type === 'win') return `${parts[2]} wins the battle.`;
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
      target.status = statusFromCondition(parts[4]) || target.status || '';
      target.active = true;
    });
    flashSide(sideKey, 'flash-switch');
    return 650;
  }
  if (type === '-damage' || type === '-heal') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => {
      target.condition = parts[3];
      target.status = statusFromCondition(parts[3]) || target.status || '';
    });
    flashSide(sideKey, type === '-damage' ? 'flash-hit' : 'flash-heal');
    return 550;
  }
  if (type === '-status' || type === '-curestatus' || type === '-clearstatus') {
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
    state.message = `Turn ${parts[2]}.`;
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
  const localWon = winner === 'You';
  if (state.playMode === 'bot') {
    if (localWon) {
      state.runWins += 1;
      saveBestRun(state.runWins);
      state.enemyNumber += 1;
      state.message = `Win. Streak: ${state.runWins}.`;
      render();
      await sleep(1000);
      prepareNextEnemy('The next opponent is waiting.');
      return;
    }
    state.message = `The streak ends at ${state.runWins}.`;
    return render();
  }
  state.message = localWon ? 'You win the Link Battle.' : 'The opponent wins the Link Battle.';
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
    .types span,.move-row span{
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
      min-height:88px;
    }
    .preview-card-media{
      display:grid;
      justify-items:center;
      gap:8px;
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
    .draft-view{
      width:min(1500px,100%);
      grid-template-columns:minmax(0,1fr);
    }
    .draft-view .main{
      padding:0;
      background:none;
      border:none;
      box-shadow:none;
    }
    .draft-shell{
      display:grid;
      gap:12px;
      padding:10px 0 6px;
    }
    .preview-shell{
      display:grid;
      gap:12px;
      padding:10px 0 6px;
    }
    .draft-topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
    }
    .draft-topbar .back{
      padding:10px 16px;
      background:rgba(255,255,255,.1);
    }
    .draft-topbar-meta,.draft-chip-row,.draft-status-list,.draft-role-row{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
    }
    .draft-topbar-meta span,.draft-chip-row span,.draft-status-list span,.draft-role-row span{
      padding:8px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      color:var(--text);
      font-size:.86rem;
    }
    .draft-hero-panel,.draft-team-panel,.draft-board{
      border:1px solid var(--line);
      border-radius:28px;
      background:linear-gradient(180deg,rgba(21,31,24,.94),rgba(16,25,20,.9));
      box-shadow:0 28px 80px rgba(0,0,0,.22);
    }
    .draft-hero-panel{
      display:grid;
      grid-template-columns:minmax(0,1fr);
      gap:12px;
      padding:18px;
      align-items:stretch;
    }
    .draft-link-status{
      display:grid;
      justify-content:end;
    }
    .draft-link-status .draft-status-card{
      width:min(420px,100%);
    }
    .draft-hero-copy,.draft-status-card{
      border:1px solid rgba(255,255,255,.08);
      border-radius:24px;
      background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));
      padding:18px;
    }
    .draft-hero-copy{
      display:grid;
      gap:14px;
      align-content:start;
    }
    .draft-kicker-row{
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }
    .draft-status-pill{
      padding:7px 12px;
      border-radius:999px;
      color:#16211a;
      font-size:.82rem;
      font-weight:700;
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      box-shadow:0 10px 24px var(--menu-glow);
    }
    .draft-hero-copy h2,.draft-section-head h3{
      margin:0;
    }
    .draft-hero-copy h2{
      font-size:clamp(2.2rem,4.4vw,3.8rem);
      line-height:.95;
      letter-spacing:-.03em;
    }
    .draft-hero-copy p,.draft-section-head p{
      margin:0;
      color:var(--muted);
      line-height:1.55;
    }
    .draft-status-card{
      display:grid;
      gap:12px;
      align-content:start;
    }
    .draft-status-progress{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
    }
    .draft-status-progress span{
      min-height:44px;
      display:grid;
      place-items:center;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:var(--muted);
      font-weight:800;
    }
    .draft-status-progress span.filled{
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      color:#16211a;
      box-shadow:0 10px 24px var(--menu-glow);
      border-color:transparent;
    }
    .draft-status-card strong{
      font-size:1.55rem;
      line-height:1;
    }
    .draft-team-panel,.draft-board{
      padding:18px;
      display:grid;
      gap:12px;
      min-height:0;
    }
    .preview-main-grid{
      display:grid;
      grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);
      gap:12px;
      align-items:start;
    }
    .preview-hero-panel{
      grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);
      align-items:stretch;
    }
    .preview-hero-guide{
      display:grid;
      gap:10px;
      padding:14px;
      border-radius:22px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.08);
      align-content:start;
    }
    .preview-hero-slot-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
    }
    .preview-hero-slot{
      display:grid;
      gap:4px;
      padding:10px;
      border-radius:18px;
      color:var(--ink);
      box-shadow:inset 0 0 0 999px rgba(255,255,255,.12);
      min-width:0;
    }
    .preview-hero-slot.empty{
      background:rgba(255,255,255,.04);
      color:var(--text);
      box-shadow:none;
    }
    .preview-hero-slot span,.preview-rank{
      width:28px;
      height:28px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      color:#16211a;
      font-weight:800;
      box-shadow:0 10px 24px var(--menu-glow);
    }
    .preview-hero-slot strong{
      line-height:1.05;
    }
    .preview-hero-slot div,.preview-hero-note{
      color:var(--muted);
      font-size:.82rem;
      line-height:1.35;
    }
    .preview-panel,.preview-side-panel{
      border:1px solid var(--line);
      border-radius:28px;
      background:linear-gradient(180deg,rgba(21,31,24,.94),rgba(16,25,20,.9));
      box-shadow:0 28px 80px rgba(0,0,0,.22);
      padding:18px;
      display:grid;
      gap:12px;
      min-height:0;
    }
    .preview-card-list,.preview-status-stack{
      display:grid;
      gap:10px;
    }
    .preview-order-note{
      max-width:340px;
      padding:8px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
      text-align:right;
    }
    .draft-section-head{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:16px;
    }
    .draft-team-strip{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:12px;
    }
    .draft-team-slot{
      min-width:0;
      display:grid;
      grid-template-columns:auto auto minmax(0,1fr) auto;
      align-items:center;
      gap:12px;
      padding:12px;
      border-radius:22px;
      border:1px solid rgba(255,255,255,.1);
      background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));
      color:var(--text);
    }
    .draft-team-slot.empty{
      grid-template-columns:auto 1fr;
      color:var(--muted);
    }
    .draft-team-index{
      width:34px;
      height:34px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      color:#16211a;
      font-weight:800;
      box-shadow:0 10px 24px var(--menu-glow);
    }
    .draft-team-copy{
      min-width:0;
      display:grid;
      gap:3px;
    }
    .draft-choice-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:14px;
      min-height:0;
    }
    .draft-mobile-swipe-hint{
      display:none;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:10px 12px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:var(--muted);
      align-self:start;
    }
    .draft-mobile-swipe-hint strong{
      font-size:.78rem;
      line-height:1.2;
      letter-spacing:.03em;
    }
    .draft-mobile-swipe-hint span,.draft-mobile-swipe-hint em{
      color:var(--menu-accent-soft);
      font-style:normal;
      font-weight:800;
      letter-spacing:.16em;
      white-space:nowrap;
    }
    .draft-choice-card{
      display:grid;
      gap:12px;
      padding:16px;
      border-radius:26px;
      box-shadow:inset 0 0 0 999px rgba(255,255,255,.12),0 20px 34px rgba(0,0,0,.16);
    }
    .draft-choice-head,.draft-choice-body{
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:flex-start;
    }
    .draft-choice-sprite{
      min-width:112px;
      display:grid;
      place-items:center;
    }
    .draft-choice-copy{
      min-width:0;
      display:grid;
      gap:10px;
      flex:1;
    }
    .draft-role-row span{
      color:var(--chip-text);
      background:var(--chip);
      border:none;
      font-size:.78rem;
      font-weight:700;
    }
    .draft-stat-grid{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:8px;
    }
    .draft-stat-cell{
      padding:9px 6px;
      border-radius:16px;
      text-align:center;
      background:rgba(255,255,255,.18);
      display:grid;
      gap:3px;
    }
    .draft-stat-cell span{
      font-size:.68rem;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:var(--ink-soft);
      font-weight:700;
    }
    .draft-stat-cell strong{
      color:var(--ink);
      font-size:.94rem;
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
      position:relative;
      display:grid;
      gap:4px;
      font-family:"Courier New",monospace;
      overflow:hidden;
    }
    .battle-decor-layer{
      display:none;
    }
    .battle-decor-sprite{
      position:absolute;
      image-rendering:pixelated;
      pointer-events:none;
      z-index:0;
      filter:drop-shadow(0 0 6px rgba(0,0,0,.2));
    }
    .battle-frame-top{
      display:grid;
      grid-template-columns:auto auto;
      justify-content:space-between;
      align-items:start;
      gap:12px;
      position:relative;
      z-index:2;
      min-height:52px;
    }
    .battle-mode-link{
      justify-self:start;
    }
    .battle-streak-badge{
      display:grid;
      gap:4px;
      justify-items:end;
      padding:10px 14px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.05);
    }
    .battle-streak-badge strong{
      font-size:1rem;
      line-height:1.05;
    }
    .battle-desktop-shell{
      display:grid;
      grid-template-columns:minmax(0,1fr);
      gap:12px;
      align-items:start;
      position:relative;
      z-index:1;
    }
    .battle-center{
      display:grid;
      gap:6px;
      min-width:0;
    }
    .battle-brand-logo{
      position:absolute;
      top:-12px;
      left:50%;
      transform:translateX(-50%);
      z-index:2;
      pointer-events:none;
    }
    .battle-brand-logo img{
      width:min(24vw,272px);
      height:auto;
      display:block;
      filter:drop-shadow(0 12px 20px rgba(0,0,0,.18));
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
      grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr);
      gap:8px;
      max-width:none;
      width:100%;
      margin:0 auto;
    }
    .battle-starter-art{
      display:none;
    }
    .battle-mobile-menu{
      display:inline-flex;
    }
    .battle-panel{
      padding:8px;
      gap:6px;
      background:rgba(255,255,255,.05);
    }
    .battle-panel .bench-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .bench-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    .bench-card{
      display:grid;
      gap:6px;
      padding:10px 12px;
      min-height:92px;
    }
    .bench-card-switch{
      grid-template-columns:auto minmax(0,1fr) auto;
      align-items:center;
      justify-items:start;
      text-align:left;
    }
    .bench-card-sprite{
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .bench-card-copy{
      display:grid;
      gap:3px;
      min-width:0;
    }
    .battle-panel .bench-card strong{
      font-size:.9rem;
      line-height:1.1;
    }
    .battle-panel .bench-card .tiny{
      font-size:.76rem;
      line-height:1.15;
    }
    .battle-panel .bench-card .info-chip{
      justify-self:end;
      padding:6px 8px;
      font-size:.72rem;
    }
    .battle-panel .sprite.sm{width:56px;height:56px}
    .choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .choice-btn{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      min-height:24px;
      padding:3px 8px;
      text-align:left;
      border:2px solid transparent;
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);
    }
    .choice-btn:hover:not(:disabled){
      border-color:rgba(135,211,255,.88);
      box-shadow:0 0 0 1px rgba(135,211,255,.28), inset 0 0 0 1px rgba(255,255,255,.16);
    }
    .choice-btn.selected{
      border-color:#1e56a8;
      background:linear-gradient(180deg,#3e79d6,#234c9d);
      color:#f4f8ff;
      box-shadow:0 0 0 1px rgba(21,49,97,.85), inset 0 0 0 1px rgba(255,255,255,.08);
    }
    .choice-btn.selected span{
      color:#dbeaff;
    }
    .choice-btn.alt.selected{
      border-color:transparent;
      background:linear-gradient(180deg,#cfdfab,#8ca85b);
      color:var(--ink);
    }
    .choice-btn:disabled{
      opacity:.82;
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
      background:rgba(4,8,7,.78);
      backdrop-filter:blur(4px);
      display:grid;
      place-items:center;
      padding:20px;
      z-index:40;
    }
    .modal{
      width:min(980px,100%);
      max-height:min(88svh,920px);
      overflow:hidden;
      display:grid;
      grid-template-rows:auto minmax(0,1fr);
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
      grid-template-columns:280px minmax(0,1fr);
      gap:18px;
      min-height:0;
      overflow:auto;
      padding-right:4px;
    }
    .inspect-sidebar{
      display:grid;
      gap:16px;
      align-content:start;
      min-width:0;
    }
    .modal-card{
      padding:18px;
      border-radius:22px;
      display:grid;
      align-content:start;
      gap:14px;
    }
    .modal-stats,.modal-moves{display:grid;gap:10px}
    .inspect-summary .sprite.lg{
      justify-self:center;
    }
    .inspect-summary-meta{
      display:grid;
      gap:12px;
    }
    .inspect-summary-head{
      display:grid;
      gap:4px;
    }
    .inspect-summary-head span{
      color:var(--ink-soft);
      font-size:.82rem;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .inspect-stat-grid div,.inspect-move-stats div{
      padding:10px;
      border-radius:16px;
      background:rgba(255,255,255,.14);
      display:grid;
      gap:4px;
    }
    .inspect-stat-grid span,.inspect-move-stats span{
      color:var(--ink-soft);
      font-size:.72rem;
      font-weight:700;
      letter-spacing:.06em;
      text-transform:uppercase;
    }
    .inspect-details{
      display:grid;
      gap:0;
      min-width:0;
      align-content:start;
    }
    .inspect-stat-panel,.inspect-move-panel{
      display:grid;
      gap:12px;
      padding:16px;
      border-radius:22px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.08);
    }
    .inspect-stat-grid{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:10px;
    }
    .inspect-move-list{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
    }
    .inspect-move-card{
      display:grid;
      gap:10px;
      padding:14px;
      border-radius:18px;
      background:rgba(255,255,255,.07);
      border:1px solid rgba(255,255,255,.08);
      min-width:0;
    }
    .inspect-move-head{
      display:grid;
      gap:8px;
    }
    .inspect-move-tags{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }
    .inspect-move-tags span{
      padding:5px 8px;
      border-radius:999px;
      background:var(--chip);
      color:var(--chip-text);
      font-size:.76rem;
      font-weight:700;
    }
    .inspect-move-stats{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:8px;
    }
    .inspect-move-card p{
      margin:0;
      color:var(--text);
      line-height:1.42;
      font-size:.88rem;
      display:grid;
      gap:6px;
    }
    .inspect-move-card p span{
      display:block;
      width:100%;
      min-width:0;
      color:var(--muted);
      font-size:.72rem;
      font-weight:700;
      letter-spacing:.06em;
      text-transform:uppercase;
    }
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
        width:min(90vw,1520px);
        max-width:none;
        margin:0 auto;
      }
      .battle-decor-layer{
        display:block;
      }
      .battle-frame-top{
        padding:0 12px;
      }
      .battle-mode-link{
        min-width:154px;
      }
      .battle-streak-badge{
        min-width:164px;
      }
      .battle-desktop-shell{
        grid-template-columns:minmax(0,1fr);
        gap:14px;
      }
      .battle-center{
        width:min(72vw,1080px);
        margin:0 auto;
      }
      .battle-brand-logo img{
        width:min(22vw,258px);
      }
      .battle-mobile-menu{
        display:none;
      }
      .battle-starter-art{
        display:grid;
        place-items:center;
        padding:6px 0 2px;
      }
      .battle-starter-art img{
        width:min(34vw,430px);
        height:auto;
        display:block;
        filter:drop-shadow(0 18px 24px rgba(0,0,0,.18));
      }
      .preview-shell .draft-hero-copy h2{
        font-size:clamp(2rem,3.6vw,3.2rem);
      }
      .preview-card{
        grid-template-columns:auto minmax(0,1fr) auto;
        min-height:96px;
        padding:12px 14px;
      }
      .preview-card .sprite.sm{
        width:52px;
        height:52px;
      }
      .battle-panel .sprite.sm{
        width:64px;
        height:64px;
      }
      .preview-copy strong{
        font-size:1.12rem;
      }
      .preview-copy .tiny{
        line-height:1.25;
      }
      .preview-actions{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,auto));
        gap:6px;
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
      .preview-main-grid{
        grid-template-columns:minmax(0,1.05fr) minmax(300px,.95fr);
      }
      .preview-panel,.preview-side-panel{
        border-radius:24px;
        padding:14px;
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
      .draft-shell{
        gap:10px;
        padding:8px 0 4px;
      }
      .draft-hero-panel,.draft-team-panel,.draft-board{
        border-radius:24px;
      }
      .draft-hero-panel{
        padding:14px;
      }
      .draft-hero-copy,.draft-status-card{
        padding:14px;
        border-radius:20px;
      }
      .draft-hero-copy h2{
        font-size:clamp(2rem,4vw,3.2rem);
      }
      .draft-hero-copy p,.draft-section-head p{
        font-size:.92rem;
        line-height:1.4;
      }
      .draft-section-head p{
        display:none;
      }
      .draft-topbar-meta span,.draft-chip-row span,.draft-status-list span,.draft-role-row span{
        padding:6px 10px;
        font-size:.78rem;
      }
      .draft-team-panel,.draft-board{
        padding:14px;
        gap:10px;
      }
      .draft-team-strip,.draft-choice-grid{
        gap:10px;
      }
      .draft-team-slot{
        padding:10px;
        gap:10px;
      }
      .draft-choice-card{
        padding:12px;
        gap:8px;
      }
      .draft-choice-sprite{
        min-width:78px;
      }
      .draft-choice-copy{
        gap:8px;
      }
      .draft-choice-copy .move-row{
        gap:6px;
        margin-top:0;
      }
      .draft-choice-copy .move-row span,.draft-role-row span,.draft-choice-copy .types span{
        padding:4px 6px;
        font-size:.7rem;
      }
      .draft-stat-grid{
        gap:6px;
      }
      .draft-stat-cell{
        padding:6px 4px;
      }
      .draft-stat-cell span{
        font-size:.62rem;
      }
      .draft-stat-cell strong{
        font-size:.86rem;
      }
    }
    @media (min-width:1700px) and (min-height:1000px){
      .menu-showcase{
        --menu-player-shift-y:-2%;
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
      .draft-hero-panel,.draft-team-strip,.draft-choice-grid{grid-template-columns:1fr}
      .draft-link-status{justify-content:stretch}
      .draft-link-status .draft-status-card{width:100%}
      .draft-section-head{align-items:flex-start;flex-direction:column}
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
      .draft-view{
        height:calc(100svh - 20px);
      }
      .draft-view .main{
        height:100%;
        overflow:hidden;
      }
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
      .draft-shell{
        gap:8px;
        padding:4px 0 2px;
        min-height:0;
        height:100%;
        grid-template-rows:auto auto auto 1fr;
        overflow:hidden;
      }
      .preview-shell{
        gap:8px;
        padding:4px 0 2px;
        height:calc(100svh - 20px);
        grid-template-rows:auto auto 1fr;
        overflow:hidden;
      }
      .draft-topbar{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:center;
        gap:8px;
      }
      .draft-topbar .back{
        padding:8px 10px;
        font-size:.74rem;
      }
      .draft-topbar-meta{
        justify-content:flex-end;
        gap:6px;
      }
      .draft-hero-panel,.draft-team-panel,.draft-board{
        border-radius:20px;
      }
      .preview-main-grid{
        grid-template-columns:1fr;
        grid-template-rows:minmax(0,1fr) auto;
        gap:8px;
        min-height:0;
        overflow:hidden;
      }
      .preview-panel,.preview-side-panel{
        border-radius:20px;
        padding:10px;
        gap:8px;
      }
      .preview-hero-panel{
        grid-template-columns:1fr;
      }
      .preview-hero-guide{
        padding:8px;
        gap:6px;
      }
      .preview-hero-slot-grid{
        gap:5px;
      }
      .preview-hero-slot{
        padding:6px;
        border-radius:14px;
      }
      .preview-hero-slot strong{
        font-size:.78rem;
      }
      .preview-hero-slot div,.preview-hero-note{
        font-size:.68rem;
        line-height:1.2;
      }
      .preview-hero-note{
        display:none;
      }
      .preview-panel{
        min-height:0;
        overflow:hidden;
      }
      .draft-hero-panel{
        grid-template-columns:minmax(0,1fr);
        padding:10px;
        gap:8px;
      }
      .draft-status-card{
        display:none;
      }
      .draft-hero-copy,.draft-status-card{
        padding:10px;
        border-radius:16px;
        gap:8px;
      }
      .draft-hero-copy h2{
        font-size:clamp(1.45rem,7vw,2rem);
        line-height:.98;
      }
      .draft-topbar-meta span,.draft-chip-row span,.draft-status-list span,.draft-role-row span{
        padding:5px 8px;
        font-size:.68rem;
      }
      .draft-chip-row span:nth-child(n+4){display:none}
      .draft-mobile-swipe-hint{
        display:flex;
        padding:8px 10px;
        border-radius:14px;
      }
      .draft-status-progress{
        gap:6px;
      }
      .draft-status-progress span{
        min-height:28px;
        border-radius:12px;
        font-size:.74rem;
      }
      .draft-team-panel,.draft-board{
        padding:10px;
        gap:8px;
      }
      .preview-card-list,.preview-status-stack{
        gap:8px;
      }
      .preview-card{
        grid-template-columns:46px 1fr auto;
        justify-items:stretch;
        text-align:left;
        align-items:center;
        gap:8px;
        min-height:66px;
        padding:7px 8px;
      }
      .preview-card-media{
        gap:4px;
      }
      .preview-rank{
        width:24px;
        height:24px;
        font-size:.72rem;
      }
      .preview-card .sprite.sm{
        width:38px;
        height:38px;
      }
      .preview-copy{
        display:grid;
        gap:4px;
        min-width:0;
      }
      .preview-copy .tiny{
        display:none;
      }
      .preview-copy strong{
        font-size:.86rem;
        line-height:1.15;
      }
      .preview-actions{
        width:auto;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,auto));
        justify-content:end;
        gap:4px;
      }
      .preview-actions .info-chip,.preview-actions .mini-btn{
        justify-content:center;
        padding:5px 7px;
        font-size:.62rem;
      }
      .preview-side-panel .actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:6px;
      }
      .preview-side-panel .actions .primary-btn,.preview-side-panel .actions .ghost-btn{
        width:100%;
        padding:8px 10px;
        font-size:.78rem;
      }
      .draft-team-panel .label{
        display:none;
      }
      .draft-section-head h3{
        font-size:.96rem;
      }
      .draft-section-head p,.draft-hero-copy p{display:none}
      .draft-team-strip{
        gap:6px;
        grid-template-columns:repeat(3,minmax(0,1fr));
        min-height:72px;
      }
      .draft-team-slot{
        grid-template-columns:1fr;
        justify-items:center;
        text-align:center;
        padding:8px 6px;
        gap:6px;
        border-radius:16px;
        min-height:72px;
        height:72px;
        align-content:center;
      }
      .draft-team-slot.empty{
        grid-template-columns:1fr;
      }
      .draft-team-slot .sprite.sm{
        width:34px;
        height:34px;
      }
      .draft-team-copy strong{
        display:none;
      }
      .draft-team-slot .tiny{
        display:none;
      }
      .draft-team-slot .info-chip{
        display:none;
      }
      .draft-board{
        grid-template-rows:auto auto 1fr;
      }
      .draft-choice-grid{
        display:grid;
        grid-auto-flow:column;
        grid-auto-columns:84%;
        grid-template-columns:none;
        gap:10px;
        overflow-x:auto;
        overflow-y:hidden;
        scroll-snap-type:x mandatory;
        padding-right:18%;
        padding-bottom:2px;
      }
      .draft-choice-grid::-webkit-scrollbar{display:none}
      .draft-choice-card{
        min-height:0;
        height:100%;
        padding:10px;
        gap:8px;
        border-radius:18px;
        scroll-snap-align:start;
        align-content:start;
      }
      .draft-choice-head,.draft-choice-body{
        gap:8px;
      }
      .draft-choice-sprite{
        min-width:58px;
      }
      .draft-role-row{display:none}
      .draft-stat-grid{
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:6px;
      }
      .draft-stat-cell{
        padding:6px 4px;
        border-radius:12px;
      }
      .draft-stat-cell span{
        font-size:.55rem;
      }
      .draft-stat-cell strong{
        font-size:.72rem;
      }
      .menu-copy h2{
        font-size:clamp(1.8rem,9.4vw,2.7rem);
      }
      .menu-copy p,.menu-section-head p{font-size:.92rem;line-height:1.45}
      .draft-hero-copy p,.draft-section-head p{font-size:.9rem;line-height:1.45}
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
        --menu-player-shift-y:-14%;
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
      .menu-stage-mon-player{display:grid;left:10px;width:20%;height:28%}
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
      .modal-backdrop{
        padding:8px;
      }
      .modal{
        width:100%;
        height:calc(100svh - 16px);
        max-height:none;
        padding:14px;
        border-radius:24px;
      }
      .modal-head{
        position:sticky;
        top:0;
        z-index:1;
        background:#16211a;
        padding-bottom:8px;
      }
      .modal-body{
        grid-template-columns:1fr;
        gap:14px;
        padding-right:0;
      }
      .inspect-sidebar{
        gap:14px;
      }
      .inspect-summary{
        grid-template-columns:72px 1fr;
        align-items:center;
      }
      .inspect-summary .sprite.lg{
        width:72px;
        height:72px;
      }
      .inspect-stat-grid{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      .inspect-move-list{
        grid-template-columns:1fr;
      }
      .inspect-move-stats{
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
      .inspect-move-card{
        padding:12px;
        gap:8px;
      }
      .inspect-move-card p{
        font-size:.86rem;
        line-height:1.35;
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
      .draft-choice-head,.draft-choice-body,.draft-topbar-meta,.draft-chip-row,.draft-status-list{
        gap:8px;
      }
      .draft-choice-card h3{
        font-size:1.05rem;
        line-height:1.05;
      }
      .draft-choice-copy{
        gap:8px;
      }
      .draft-choice-copy .move-row{
        gap:6px;
        margin-top:0;
      }
      .draft-choice-copy .move-row span,.draft-role-row span,.draft-choice-copy .types span{
        font-size:.66rem;
        padding:4px 6px;
        white-space:nowrap;
      }
      .draft-choice-copy .types{
        flex-wrap:nowrap;
        overflow:hidden;
        min-height:19px;
      }
      .draft-choice-copy .move-row{
        overflow:hidden;
        max-height:44px;
      }
      .draft-role-row{display:none}
      .draft-choice-card .info-chip{
        padding:5px 7px;
        font-size:.66rem;
      }
      .draft-choice-card .card-actions .primary-btn{
        min-height:38px;
        padding:8px 12px;
      }
      .battle-view .main{padding:8px}
      .brand h1{font-size:clamp(1.85rem,10vw,2.8rem)}
      .hero,.panel,.draft-card,.preview-card,.combatant,.bench-card,.mode-card{padding:14px}
      .draft-top,.roster-head,.combatant-head,.card-actions,.preview-actions,.actions,.draft-choice-head,.draft-choice-body{
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
        min-height:34vh;
        border-radius:8px;
        aspect-ratio:auto;
        --battle-pad-x:3%;
        --battle-pad-top:4%;
        --battle-feed-bottom:3%;
        --battle-feed-height:17%;
        --battle-player-line:22%;
        --battle-foe-line:10.5%;
      }
      .battle-header{
        align-items:flex-start;
        flex-direction:column;
        gap:6px;
      }
      .battle-brand-logo{
        top:-6px;
      }
      .battle-brand-logo img{
        width:min(38vw,150px);
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
        top:calc(var(--battle-foe-line) - 1.5%);
        right:6%;
        width:29%;
        height:35%;
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
        grid-template-columns:1fr;
        gap:6px;
      }
      .battle-panel{
        padding:6px;
        border-radius:18px;
      }
      .battle-panel .bench-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      .battle-panel .bench-card{
        min-height:80px;
        padding:6px 8px;
      }
      .battle-panel .bench-card-switch{
        grid-template-columns:56px minmax(0,1fr) auto;
        gap:6px;
      }
      .battle-panel .bench-card strong{
        font-size:.82rem;
      }
      .battle-panel .bench-card .tiny{
        font-size:.68rem;
      }
      .battle-panel .bench-card .info-chip{
        padding:4px 6px;
        font-size:.66rem;
      }
      .battle-panel .sprite.sm{width:54px;height:54px}
      .choice-grid{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:6px;
      }
      .choice-btn{
        min-height:36px;
        padding:5px 8px;
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
    @media (max-width:720px) and (max-height:780px){
      body{padding:8px}
      .draft-shell{
        gap:6px;
        padding:2px 0 0;
      }
      .draft-topbar .back{
        padding:6px 8px;
        font-size:.7rem;
      }
      .draft-topbar-meta{
        gap:4px;
      }
      .draft-topbar-meta span,.draft-chip-row span{
        padding:4px 7px;
        font-size:.63rem;
      }
      .draft-chip-row span:nth-child(n+3){
        display:none;
      }
      .draft-hero-panel,.draft-team-panel,.draft-board{
        padding:8px;
        border-radius:18px;
      }
      .draft-hero-copy{
        padding:8px;
        gap:6px;
      }
      .draft-hero-copy h2{
        font-size:clamp(1.18rem,6vw,1.55rem);
      }
      .draft-team-strip{
        gap:5px;
        min-height:64px;
      }
      .draft-team-slot{
        padding:6px 4px;
        gap:4px;
        min-height:64px;
        height:64px;
      }
      .draft-team-index{
        width:28px;
        height:28px;
      }
      .draft-team-slot.empty strong,.draft-team-copy strong{
        display:none;
      }
      .draft-section-head h3{
        font-size:.88rem;
      }
      .draft-mobile-swipe-hint{
        padding:6px 8px;
        gap:8px;
      }
      .draft-mobile-swipe-hint strong{
        font-size:.68rem;
      }
      .draft-choice-grid{
        grid-auto-columns:82%;
        gap:8px;
        padding-right:20%;
        align-items:start;
      }
      .draft-choice-card{
        padding:8px;
        gap:6px;
      }
      .draft-choice-card h3{
        margin:0;
        font-size:1rem;
      }
      .draft-choice-head .info-chip{
        padding:5px 7px;
        font-size:.66rem;
      }
      .draft-choice-body{
        display:grid;
        grid-template-columns:64px 1fr;
        gap:6px;
      }
      .draft-choice-sprite{
        min-width:64px;
      }
      .draft-choice-sprite .sprite.lg{
        width:64px;
        height:64px;
      }
      .draft-choice-copy{
        gap:6px;
      }
      .draft-choice-copy .types,.draft-choice-copy .move-row{
        gap:5px;
        margin-top:0;
      }
      .draft-choice-copy .types span,.draft-choice-copy .move-row span{
        padding:4px 6px;
        font-size:.62rem;
        white-space:nowrap;
      }
      .draft-choice-copy .types{
        flex-wrap:nowrap;
        overflow:hidden;
        min-height:19px;
      }
      .draft-choice-copy .move-row{
        overflow:hidden;
        max-height:42px;
      }
      .draft-choice-copy .move-row span:nth-child(n+4){
        display:none;
      }
      .draft-stat-grid{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:5px;
      }
      .draft-stat-cell:nth-child(4),.draft-stat-cell:nth-child(5){
        display:none;
      }
      .draft-stat-cell{
        padding:5px 3px;
      }
      .draft-stat-cell span{
        font-size:.52rem;
      }
      .draft-stat-cell strong{
        font-size:.68rem;
      }
      .draft-choice-card .card-actions .primary-btn{
        min-height:34px;
        padding:7px 10px;
        font-size:.92rem;
      }
      .battle-stage{
        --battle-foe-line:11%;
      }
      .battle-sprite-foe{
        top:calc(var(--battle-foe-line) - 1.2%);
      }
      .battle-panel .bench-grid{
        gap:5px;
      }
      .battle-panel .bench-card{
        min-height:72px;
        padding:5px 6px;
      }
      .battle-panel .bench-card-switch{
        grid-template-columns:48px minmax(0,1fr) auto;
        gap:5px;
      }
      .battle-panel .bench-card strong{
        font-size:.74rem;
      }
      .battle-panel .bench-card .tiny{
        font-size:.64rem;
      }
      .battle-panel .bench-card .info-chip{
        padding:4px 5px;
        font-size:.62rem;
      }
      .battle-panel .sprite.sm{
        width:46px;
        height:46px;
      }
    }
  `;
  document.head.appendChild(style);
}

injectStyles();
render();

import Peer from 'peerjs';
import {BattleStreams, Dex, Teams} from '@pkmn/sim';
import {
  POKEMON_POOL,
  chooseBattleAction,
  chooseTeamOrder,
  conditionToPercent,
  draftSynergy,
  drawPack,
  generateConfiguredSet,
  generateSet,
  pickOpponentDraft,
  rerollMove,
  setArchetype,
  shuffle,
} from './pokemon-draft-core.js';

const GEN1_BATTLER_MOD = 'gen1battler';

function ensureGen1BattleDex() {
  if (!Dex.dexes[GEN1_BATTLER_MOD]) {
    Dex.mod(GEN1_BATTLER_MOD, {
      Scripts: {inherit: 'gen1', gen: 1},
      Conditions: {
        slp: {
          inherit: true,
          onStart(target, source, sourceEffect) {
            if (sourceEffect && sourceEffect.effectType === 'Move') {
              this.add('-status', target, 'slp', `[from] move: ${sourceEffect.name}`);
            } else {
              this.add('-status', target, 'slp');
            }
            // Modern RBY research found a 1-turn sleep happens twice as often as 2-7 turns.
            const raw = this.random(0, 8);
            this.effectState.startTime = raw === 0 ? 1 : raw;
            this.effectState.time = this.effectState.startTime;
            if (target.removeVolatile('nightmare')) {
              this.add('-end', target, 'Nightmare', '[silent]');
            }
          },
        },
      },
    });
  }
  const format = Dex.formats.get('gen1customgame');
  if (format.mod !== GEN1_BATTLER_MOD) format.mod = GEN1_BATTLER_MOD;
  return Dex.mod(GEN1_BATTLER_MOD);
}

const dex = ensureGen1BattleDex();
const app = document.getElementById('app');
const BEST_RUN_KEY = 'pokemon-battler-rby-best-run-v4';
const ENEMY_NAMES = ['Brock', 'Misty', 'Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Lance'];
const BATTLE_LOGO_PATH = '../assets/pokemon-logo-cutout.png';
const POKEBALL_STATUS_PATH = '../assets/pokeball-status.png';
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
        points: ['Always 3 Pokemon to choose from', 'Set your own order', 'Rule screen before the draft'],
        enabled: true,
        action: 'start-bot',
        cta: 'Start',
      },
      link: {
        eyebrow: 'Online',
        title: 'Link Battle',
        points: ['Share a room code or join one', 'Both players draft in secret', 'Rule screen before the draft'],
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
    subtitle: 'Choose a generation first. Then pick Bot Run or Link Battle and jump straight into the draft. Gen 5 modes are still in development.',
    availability: 'In development',
    status: 'Unova preview',
    features: ['Gen 5 style preview', 'Modes still in development', 'Modern arena style inspired by Gen 5'],
    steps: ['Pick a generation', 'Choose a mode', 'Draft, order, battle'],
    modeCards: {
      bot: {
        eyebrow: 'Solo',
        title: 'Bot Run',
        points: ['Always 3 Pokemon to choose from', 'Set your own order', 'Gen 5 mode still in development'],
        enabled: false,
        action: 'start-bot',
        cta: 'Coming soon',
      },
      link: {
        eyebrow: 'Online',
        title: 'Link Battle',
        points: ['Share a room code or join one', 'Both players draft in secret', 'Gen 5 mode still in development'],
        enabled: false,
        action: 'start-link',
        cta: 'Coming soon',
      },
    },
    note: 'Battle rules depend on the selected generation.',
  },
};
const MENU_SHOWCASE = {
  foe: POKEMON_POOL.find((species) => species.name === 'Mewtwo') || POKEMON_POOL[0],
  player: POKEMON_POOL.find((species) => species.name === 'Charizard') || POKEMON_POOL[1] || POKEMON_POOL[0],
};
const STARTER_ART_PATH = '../assets/firstgenstarter-cutout.png';
const ITEM_ICON_BASE_PATH = '../assets/pokemon-item-icons';
const ITEM_ICON_SLUGS = {
  leftovers: 'leftovers',
  blacksludge: 'black-sludge',
  focussash: 'focus-sash',
  lumberry: 'lum-berry',
  sitrusberry: 'sitrus-berry',
  lifeorb: 'life-orb',
  choiceband: 'choice-band',
  choicespecs: 'choice-specs',
  expertbelt: 'expert-belt',
  eviolite: 'eviolite',
  airballoon: 'air-balloon',
};
const ATTACK_PREVIEW_DATA_PATH = './pokemon-attack-preview-data.json';
const DEFAULT_MODE_SETTINGS = {
  attackMode: 'fixed',
  attackReroll: false,
  rerollCount: 3,
  teamSize: 3,
  itemDraft: false,
};
const HELD_ITEM_POOL = [
  'leftovers',
  'blacksludge',
  'focussash',
  'lumberry',
  'sitrusberry',
  'lifeorb',
  'airballoon',
];
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

const ATTACK_FRAME_MS = 70;
const ATTACK_TARGET_BIAS = 0;
const ATTACK_SPECIAL_EFFECT_DURATION = {
  SE_DELAY_ANIMATION_10: 10 * ATTACK_FRAME_MS,
  SE_DARK_SCREEN_FLASH: 4 * ATTACK_FRAME_MS,
  SE_DARK_SCREEN_PALETTE: 0,
  SE_RESET_SCREEN_PALETTE: 0,
  SE_FLASH_SCREEN_LONG: 10 * ATTACK_FRAME_MS,
  SE_SHAKE_SCREEN: 6 * ATTACK_FRAME_MS,
  SE_WATER_DROPLETS_EVERYWHERE: 10 * ATTACK_FRAME_MS,
  SE_DARKEN_MON_PALETTE: 6 * ATTACK_FRAME_MS,
  SE_LIGHT_SCREEN_PALETTE: 8 * ATTACK_FRAME_MS,
  SE_BLINK_MON: 6 * ATTACK_FRAME_MS,
  SE_FLASH_MON_PIC: 4 * ATTACK_FRAME_MS,
  SE_HIDE_MON_PIC: 0,
  SE_SHOW_MON_PIC: 0,
  SE_MOVE_MON_HORIZONTALLY: 5 * ATTACK_FRAME_MS,
  SE_RESET_MON_POSITION: 3 * ATTACK_FRAME_MS,
  SE_SLIDE_MON_OFF: 8 * ATTACK_FRAME_MS,
  SE_SLIDE_MON_HALF_OFF: 7 * ATTACK_FRAME_MS,
  SE_SLIDE_MON_UP: 6 * ATTACK_FRAME_MS,
  SE_SLIDE_MON_DOWN: 6 * ATTACK_FRAME_MS,
  SE_SLIDE_MON_DOWN_AND_HIDE: 8 * ATTACK_FRAME_MS,
  SE_SQUISH_MON_PIC: 6 * ATTACK_FRAME_MS,
  SE_BOUNCE_UP_AND_DOWN: 8 * ATTACK_FRAME_MS,
  SE_MINIMIZE_MON: 8 * ATTACK_FRAME_MS,
  SE_SUBSTITUTE_MON: 0,
  SE_TRANSFORM_MON: 8 * ATTACK_FRAME_MS,
  SE_PETALS_FALLING: 10 * ATTACK_FRAME_MS,
  SE_LEAVES_FALLING: 10 * ATTACK_FRAME_MS,
  SE_SHAKE_ENEMY_HUD: 5 * ATTACK_FRAME_MS,
  SE_SHAKE_BACK_AND_FORTH: 6 * ATTACK_FRAME_MS,
  SE_WAVY_SCREEN: 10 * ATTACK_FRAME_MS,
  SE_SPIRAL_BALLS_INWARD: 10 * ATTACK_FRAME_MS,
  SE_SHOOT_BALLS_UPWARD: 8 * ATTACK_FRAME_MS,
  SE_SHOOT_MANY_BALLS_UPWARD: 9 * ATTACK_FRAME_MS,
  SE_SHOW_ENEMY_MON_PIC: 0,
  SE_HIDE_ENEMY_MON_PIC: 0,
  SE_BLINK_ENEMY_MON: 6 * ATTACK_FRAME_MS,
  SE_SLIDE_ENEMY_MON_OFF: 8 * ATTACK_FRAME_MS,
};
const ATTACK_MOVE_SPECIFIC_DURATION = {
  AnimationFlashScreen: 4 * ATTACK_FRAME_MS,
  DoBlizzardSpecialEffects: 10 * ATTACK_FRAME_MS,
  DoExplodeSpecialEffects: 8 * ATTACK_FRAME_MS,
  DoGrowlSpecialEffects: 6 * ATTACK_FRAME_MS,
  DoRockSlideSpecialEffects: 8 * ATTACK_FRAME_MS,
  FlashScreenEveryEightFrameBlocks: 6 * ATTACK_FRAME_MS,
  FlashScreenEveryFourFrameBlocks: 8 * ATTACK_FRAME_MS,
};
const ATTACK_EFFECT_TILES = {droplet: 0x71, spiralBall: 0x7a};
let attackAnimationAssetsPromise = null;
let attackAnimationAssets = null;
let battleFeedClearHandle = null;

const state = {
  phase: 'menu',
  generation: 'gen1',
  playMode: 'bot',
  pendingMode: 'bot',
  modeSettings: {...DEFAULT_MODE_SETTINGS},
  draftedIds: new Set(),
  pack: [],
  playerDraft: [],
  opponentDraft: [],
  playerLoadout: [],
  opponentLoadout: [],
  playerPreview: [],
  opponentPreview: [],
  rerollsLeft: 0,
  rerollFocusMember: 0,
  draftedItems: [],
  opponentDraftedItems: [],
  itemPack: [],
  itemDraftRound: 0,
  itemAssignments: {},
  selectedDraftItem: '',
  itemAssignFocusMember: 0,
  uiScrollLefts: {},
  itemDraftSequence: 0,
  runWins: 0,
  bestRun: loadBestRun(),
  enemyNumber: 1,
  enemyName: '',
  battle: null,
  playerRequest: null,
  pendingPlayerRequest: null,
  logs: [],
  battleFeed: [],
  message: 'Choose Bot Run or Link Battle.',
  leaveConfirmAction: '',
  actionLocked: false,
  selectedChoice: '',
  battleAnimating: false,
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

function normalizedModeSettings(settings = state.modeSettings) {
  return {
    attackMode: settings.attackMode === 'randomized' ? 'randomized' : 'fixed',
    attackReroll: Boolean(settings.attackReroll),
    rerollCount: Math.min(9, Math.max(1, Number(settings.rerollCount || 3))),
    teamSize: Number(settings.teamSize) === 6 ? 6 : 3,
    itemDraft: Boolean(settings.itemDraft),
  };
}

function currentTeamSize() {
  return normalizedModeSettings().teamSize;
}

function currentRerollBudget() {
  const settings = normalizedModeSettings();
  return settings.attackReroll ? settings.rerollCount : 0;
}

function attackModeLabel() {
  return normalizedModeSettings().attackMode === 'randomized' ? 'Randomized attacks' : 'Fixed attacks';
}

function itemDraftEnabled() {
  return normalizedModeSettings().itemDraft;
}

function rerollEnabled() {
  return normalizedModeSettings().attackReroll;
}

function itemName(itemId) {
  return dex.items.get(itemId)?.name || itemId;
}

function itemDesc(itemId) {
  const item = dex.items.get(itemId);
  return item?.shortDesc || item?.desc || 'Held item effect.';
}

function itemIconPath(itemId) {
  const slug = ITEM_ICON_SLUGS[itemId];
  return slug ? `${ITEM_ICON_BASE_PATH}/${slug}.png` : '';
}

function itemIconTag(itemId, extraClass = '') {
  const path = itemIconPath(itemId);
  if (!path) return '<span class="item-icon item-icon-fallback"></span>';
  const className = `item-icon ${extraClass}`.trim();
  return `<img class="${className}" src="${path}" alt="${itemName(itemId)}" loading="lazy">`;
}

function createDraftedItemEntry(itemId) {
  state.itemDraftSequence += 1;
  return {key: `draft-item-${state.itemDraftSequence}`, id: itemId};
}

function draftedItemEntry(key) {
  return state.draftedItems.find((entry) => entry.key === key) || null;
}

function draftedItemId(keyOrId, draftedItems = state.draftedItems) {
  if (!keyOrId) return '';
  const entry = draftedItems.find((item) => item.key === keyOrId);
  return entry?.id || keyOrId;
}

function memberMoveSplit(member) {
  const summary = {physical: 0, special: 0, status: 0};
  const moves = member?.set?.moves || [];
  for (const moveId of moves) {
    const move = dex.moves.get(moveId);
    if (!move?.exists) continue;
    if (move.category === 'Physical') summary.physical += 1;
    else if (move.category === 'Special') summary.special += 1;
    else summary.status += 1;
  }
  return summary;
}

function itemRelevanceScore(itemId, member) {
  const split = memberMoveSplit(member);
  switch (itemId) {
    case 'lifeorb':
      return split.physical + split.special >= 2 ? 7 : 1;
    case 'focussash':
      return (member?.battleStats?.hp || 0) < 320 ? 5 : 3;
    case 'leftovers':
      return 6;
    case 'blacksludge':
      return member?.types?.includes('Poison') ? 7 : 0;
    case 'lumberry':
      return 4;
    case 'sitrusberry':
      return 5;
    case 'airballoon':
      return member?.types?.includes('Flying') ? 0 : 4;
    default:
      return 0;
  }
}

function relevantHeldItemPool(team = state.playerLoadout) {
  const roster = (team || []).filter(Boolean);
  if (!roster.length) return HELD_ITEM_POOL.slice();
  const scored = HELD_ITEM_POOL
    .map((itemId) => ({
      itemId,
      score: Math.max(...roster.map((member) => itemRelevanceScore(itemId, member))),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId))
    .map((entry) => entry.itemId);
  return scored.length ? scored : HELD_ITEM_POOL.slice();
}

function freshLinkState() {
  return {
    peer: null,
    conn: null,
    role: 'host',
    setupIntent: '',
    battleChunkChain: Promise.resolve(),
    connected: false,
    peerId: '',
    remoteName: 'Opponent',
    status: 'No connection yet.',
    alert: '',
    lobbyExpiryTimer: 0,
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

const LOBBY_CONSONANTS = 'BCDFGHJKLMNPRSTVWXYZ';
const LOBBY_VOWELS = 'AEIOU';
const HOST_ROOM_EXPIRY_MS = 10 * 60 * 1000;

function randomFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateLobbyCode() {
  let code = '';
  for (let index = 0; index < 5; index += 1) code += randomFrom(index % 2 === 0 ? LOBBY_CONSONANTS : LOBBY_VOWELS);
  return code;
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
const lerp = (a, b, t) => a + ((b - a) * t);
const ownSide = () => (state.playMode === 'link' ? state.link.localSide : 'p1');
const foeSide = () => (ownSide() === 'p1' ? 'p2' : 'p1');
const ownActive = () => state.active[ownSide()];
const foeActive = () => state.active[foeSide()];
const ownTeamState = () => state.teamStates[ownSide()];
const foeTeamState = () => state.teamStates[foeSide()];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function makeWhiteTileTransparent(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const {data, width, height} = imageData;
  const isWhite = (x, y) => {
    const index = ((y * width) + x) * 4;
    return data[index] === 255 && data[index + 1] === 255 && data[index + 2] === 255 && data[index + 3] === 255;
  };

  for (let tileY = 0; tileY < height; tileY += 8) {
    for (let tileX = 0; tileX < width; tileX += 8) {
      const queue = [];
      const seen = new Set();
      const push = (x, y) => {
        if (x < tileX || x >= tileX + 8 || y < tileY || y >= tileY + 8) return;
        const key = `${x},${y}`;
        if (seen.has(key) || !isWhite(x, y)) return;
        seen.add(key);
        queue.push([x, y]);
      };
      for (let x = tileX; x < tileX + 8; x += 1) {
        push(x, tileY);
        push(x, tileY + 7);
      }
      for (let y = tileY; y < tileY + 8; y += 1) {
        push(tileX, y);
        push(tileX + 7, y);
      }
      while (queue.length) {
        const [x, y] = queue.shift();
        const index = ((y * width) + x) * 4;
        data[index + 3] = 0;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function ensureAttackAnimationAssets() {
  if (attackAnimationAssets) return attackAnimationAssets;
  if (attackAnimationAssetsPromise) return attackAnimationAssetsPromise;
  attackAnimationAssetsPromise = (async () => {
    const response = await fetch(ATTACK_PREVIEW_DATA_PATH);
    if (!response.ok) throw new Error(`Failed to load ${ATTACK_PREVIEW_DATA_PATH}`);
    const data = await response.json();
    const tilesets = Object.fromEntries(await Promise.all(Object.entries(data.source.tilesets).map(async ([index, src]) => {
      const image = await loadImage(src);
      return [index, makeWhiteTileTransparent(image)];
    })));
    const moveLookup = new Map(data.moves.map((move) => [move.id, move]));
    attackAnimationAssets = {data, tilesets, moveLookup};
    return attackAnimationAssets;
  })().catch((error) => {
    attackAnimationAssetsPromise = null;
    throw error;
  });
  return attackAnimationAssetsPromise;
}

function buildAttackTimeline(move, side, source) {
  const segments = [];
  let cursor = 0;
  for (const command of move.commands) {
    if (command.kind === 'special') {
      const duration = ATTACK_SPECIAL_EFFECT_DURATION[command.effect] ?? (4 * ATTACK_FRAME_MS);
      segments.push({...command, start: cursor, end: cursor + duration});
      cursor += duration;
      continue;
    }
    for (let index = 0; index < command.frames[side].length; index += 1) {
      const frame = command.frames[side][index];
      const duration = Math.max(ATTACK_FRAME_MS, frame.durationFrames * (source.effectFrameMs || ATTACK_FRAME_MS));
      segments.push({
        kind: 'subframe',
        animationId: command.animationId,
        subanimation: command.subanimation,
        moveSpecificEffect: command.moveSpecificEffect,
        frameIndex: index,
        frame,
        start: cursor,
        end: cursor + duration,
      });
      cursor += duration;
    }
  }
  let total = cursor + 120;
  if (total > 5000) {
    for (const segment of segments) {
      segment.start /= 2;
      segment.end /= 2;
    }
    total /= 2;
  }
  return {segments, total};
}

function planBattleAnimations(lines) {
  return lines.map((line, index) => {
    if (!line.startsWith('|move|')) return false;
    return shouldAnimateMove(lines, index);
  });
}

function normalizeAttackMoveName(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveAttackPreviewMove(assets, moveName) {
  const normalized = normalizeAttackMoveName(moveName);
  const dexId = dex.moves.get(moveName)?.id;
  if (dexId && assets.moveLookup.has(dexId)) return assets.moveLookup.get(dexId);
  return assets.data.moves.find((move) => move.id === normalized || normalizeAttackMoveName(move.name) === normalized) || null;
}

class BattleAttackViewport {
  constructor(stage, field, feed, canvas, playerSprite, foeSprite, playerStatus, foeStatus, tilesets, source) {
    this.stage = stage;
    this.field = field;
    this.feed = feed;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.frameCanvas = document.createElement('canvas');
    this.frameCanvas.width = 160;
    this.frameCanvas.height = 120;
    this.frameCtx = this.frameCanvas.getContext('2d');
    this.frameCtx.imageSmoothingEnabled = false;
    this.playerSprite = playerSprite;
    this.foeSprite = foeSprite;
    this.playerStatus = playerStatus;
    this.foeStatus = foeStatus;
    this.tilesets = tilesets;
    this.source = source;
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(bounds.width * devicePixelRatio);
    this.canvas.height = Math.round(bounds.height * devicePixelRatio);
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  spriteImpactPoint(node, profile) {
    const stageRect = this.stage.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    return {
      x: (rect.left - stageRect.left) + (rect.width * profile.x),
      y: (rect.top - stageRect.top) + (rect.height * profile.y),
    };
  }

  fieldMetrics() {
    const stageRect = this.stage.getBoundingClientRect();
    const fieldRect = this.field.getBoundingClientRect();
    const feedRect = this.feed.getBoundingClientRect();
    const width = fieldRect.width;
    const height = Math.max(0, (feedRect.top - stageRect.top) - 6);
    const scale = Math.min(width / this.source.coordinateSpace.width, height / this.source.coordinateSpace.height);
    const renderWidth = this.source.coordinateSpace.width * scale;
    const renderHeight = this.source.coordinateSpace.height * scale;
    return {
      x: fieldRect.left - stageRect.left + ((width - renderWidth) / 2),
      y: fieldRect.top - stageRect.top + ((height - renderHeight) / 2),
      width: renderWidth,
      height: renderHeight,
      scale,
    };
  }

  battleAnchors(metrics) {
    const mobileStage = this.stage.getBoundingClientRect().width <= 500;
    const profiles = mobileStage
      ? {
        player: {attack: {x: 0.58, y: 0.40}, target: {x: 0.34, y: 0.58}},
        foe: {attack: {x: 0.24, y: 0.54}, target: {x: 0.40, y: 0.56}},
      }
      : {
        player: {attack: {x: 0.62, y: 0.42}, target: {x: 0.44, y: 0.66}},
        foe: {attack: {x: 0.26, y: 0.56}, target: {x: 0.30, y: 0.58}},
      };
    const originalPlayer = {x: metrics.x + (40 * metrics.scale), y: metrics.y + (84 * metrics.scale)};
    const originalFoe = {x: metrics.x + (112 * metrics.scale), y: metrics.y + (40 * metrics.scale)};
    const actualPlayerAttack = this.spriteImpactPoint(this.playerSprite, profiles.player.attack);
    const actualPlayerTarget = this.spriteImpactPoint(this.playerSprite, profiles.player.target);
    const actualFoeAttack = this.spriteImpactPoint(this.foeSprite, profiles.foe.attack);
    const actualFoeTarget = this.spriteImpactPoint(this.foeSprite, profiles.foe.target);
    return {
      player: {
        original: originalPlayer,
        attacker: actualPlayerAttack,
        target: actualPlayerTarget,
        attackOffset: {x: actualPlayerAttack.x - originalPlayer.x, y: actualPlayerAttack.y - originalPlayer.y},
        targetOffset: {x: actualPlayerTarget.x - originalPlayer.x, y: actualPlayerTarget.y - originalPlayer.y},
      },
      foe: {
        original: originalFoe,
        attacker: actualFoeAttack,
        target: actualFoeTarget,
        attackOffset: {x: actualFoeAttack.x - originalFoe.x, y: actualFoeAttack.y - originalFoe.y},
        targetOffset: {x: actualFoeTarget.x - originalFoe.x, y: actualFoeTarget.y - originalFoe.y},
      },
    };
  }

  resetSprites() {
    this.stage.style.transform = '';
    this.field.style.transform = '';
    for (const node of [this.playerSprite, this.foeSprite, this.playerStatus, this.foeStatus]) {
      if (!node) continue;
      node.style.transform = '';
      node.style.opacity = '';
      node.style.filter = '';
    }
  }

  drawSpriteTile(ctx, sprite) {
    const image = this.tilesets[sprite.tileset] || this.tilesets[0];
    if (!image) return;
    const tileSize = 8;
    const tileX = (sprite.tile % 16) * tileSize;
    const tileY = Math.floor(sprite.tile / 16) * tileSize;
    ctx.save();
    ctx.translate(Math.round(sprite.x + 4), Math.round(sprite.y + 4));
    ctx.scale(sprite.flipX ? -1 : 1, sprite.flipY ? -1 : 1);
    ctx.drawImage(image, tileX, tileY, tileSize, tileSize, -(tileSize / 2), -(tileSize / 2), tileSize, tileSize);
    ctx.restore();
  }

  frameOffset(scene) {
    const frame = scene.activeFrame;
    if (!frame?.sprites?.length) return {x: 0, y: 0};
    const attackerKey = scene.side === 'player' ? 'player' : 'foe';
    const targetKey = scene.side === 'player' ? 'foe' : 'player';
    const attacker = scene.anchors[attackerKey];
    const target = scene.anchors[targetKey];
    const center = frame.sprites.reduce((acc, sprite) => {
      acc.x += sprite.x + 4;
      acc.y += sprite.y + 4;
      return acc;
    }, {x: 0, y: 0});
    center.x /= frame.sprites.length;
    center.y /= frame.sprites.length;
    const lineX = target.original.x - attacker.original.x;
    const lineY = target.original.y - attacker.original.y;
    const lineLengthSq = (lineX * lineX) + (lineY * lineY) || 1;
    const centerPx = {
      x: scene.metrics.x + (center.x * scene.metrics.scale),
      y: scene.metrics.y + (center.y * scene.metrics.scale),
    };
    const progress = Math.min(Math.max((((centerPx.x - attacker.original.x) * lineX) + ((centerPx.y - attacker.original.y) * lineY)) / lineLengthSq, 0), 1);
    const baseOffset = {
      x: lerp(attacker.attackOffset.x, target.targetOffset.x, progress),
      y: lerp(attacker.attackOffset.y, target.targetOffset.y, progress),
    };
    const dirX = target.target.x - attacker.attacker.x;
    const dirY = target.target.y - attacker.attacker.y;
    const dirLen = Math.hypot(dirX, dirY) || 1;
    const bias = ATTACK_TARGET_BIAS * scene.metrics.scale;
    return {
      x: baseOffset.x + ((dirX / dirLen) * bias),
      y: baseOffset.y + ((dirY / dirLen) * bias),
    };
  }

  drawFlash(color, alpha) {
    if (alpha <= 0) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.ctx.restore();
  }

  drawGlow(x, y, radius, color, alpha = 0.35) {
    this.ctx.save();
    const gradient = this.ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    gradient.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}00`);
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  sourcePointToStage(metrics, point) {
    return {x: metrics.x + (point.x * metrics.scale), y: metrics.y + (point.y * metrics.scale)};
  }

  drawSourceTile(tile, stagePoint, metrics, tileset = 0) {
    const image = this.tilesets[tileset] || this.tilesets[0];
    if (!image) return;
    const tileSize = 8;
    const sx = (tile % 16) * tileSize;
    const sy = Math.floor(tile / 16) * tileSize;
    const size = Math.round(tileSize * metrics.scale);
    this.ctx.drawImage(image, sx, sy, tileSize, tileSize, Math.round(stagePoint.x), Math.round(stagePoint.y), size, size);
  }

  drawSourceDroplets(progress, metrics, effectData) {
    const phase = Math.min(31, Math.floor(progress * 32));
    const startX = -16 + (phase * 27);
    for (const rowStart of [16, 24]) {
      let x = startX;
      let y = rowStart;
      while (y < 112) {
        this.drawSourceTile(ATTACK_EFFECT_TILES.droplet, this.sourcePointToStage(metrics, {x, y}), metrics, 0);
        x += 27;
        if (x >= 144) {
          x -= 168;
          y += 16;
        }
      }
    }
  }

  drawSourceSpiral(progress, metrics, scene, effectData) {
    const coords = effectData.spiralBallAnimationCoordinates || [];
    if (!coords.length) return;
    const frameIndex = Math.min(coords.length - 1, Math.floor(progress * coords.length));
    const base = scene.side === 'player' ? {x: 0, y: 0} : {x: 80, y: -40};
    for (let index = 0; index < 3; index += 1) {
      const coord = coords[Math.max(0, frameIndex - (index * 2))] || coords[0];
      this.drawSourceTile(ATTACK_EFFECT_TILES.spiralBall, this.sourcePointToStage(metrics, {x: base.x + coord.x, y: base.y + coord.y}), metrics, 0);
    }
  }

  drawSourceUpwardBalls(progress, metrics, scene, effectData, many = false) {
    const player = scene.side === 'player';
    const startY = player ? 48 : 0;
    const defaultXs = [player ? 40 : 128];
    const sourceXs = many ? (player ? effectData.upwardBallsAnimXCoordinatesPlayerTurn : effectData.upwardBallsAnimXCoordinatesEnemyTurn) || defaultXs : defaultXs;
    const count = many ? 4 : 5;
    const travel = 48;
    for (const x of sourceXs) {
      for (let index = 0; index < count; index += 1) {
        const stagger = index / count;
        const local = Math.min(Math.max((progress - stagger * 0.25) / Math.max(0.2, 1 - (stagger * 0.25)), 0), 1);
        if (local <= 0 || local >= 1) continue;
        const y = startY + (index * 8) - (travel * local);
        this.drawSourceTile(ATTACK_EFFECT_TILES.spiralBall, this.sourcePointToStage(metrics, {x, y}), metrics, 0);
      }
    }
  }

  drawSourceFallingObjects(progress, metrics, effectData, count) {
    const initialX = (effectData.fallingObjectsInitialXCoords || []).slice(0, count);
    const initialMovement = (effectData.fallingObjectsInitialMovementData || []).slice(0, count);
    const deltaXs = effectData.fallingObjectsDeltaXs || [];
    if (!initialX.length || !initialMovement.length || !deltaXs.length) return;
    const step = Math.min(52, Math.floor(progress * 52));
    for (let index = 0; index < count; index += 1) {
      let y = index * 8;
      let x = initialX[index];
      let movement = initialMovement[index];
      for (let iter = 0; iter < step; iter += 1) {
        y += 2;
        const movingLeft = Boolean(movement & 0x80);
        const delta = deltaXs[movement & 0x7f] || 0;
        x += movingLeft ? -delta : delta;
        movement += 1;
        if ((movement & 0x7f) === 9) movement = (movement & 0x80) ^ 0x80;
      }
      if (y >= 112) continue;
      this.drawSourceTile(count <= 3 ? 0x37 : 0x71, this.sourcePointToStage(metrics, {x, y}), metrics, 1);
    }
  }

  drawScreenParticles(kind, progress, metrics, scene) {
    const effectData = scene.source.specialEffectData || {};
    if (kind === 'droplets') return this.drawSourceDroplets(progress, metrics, effectData);
    if (kind === 'spiral') return this.drawSourceSpiral(progress, metrics, scene, effectData);
    if (kind === 'balls-up') return this.drawSourceUpwardBalls(progress, metrics, scene, effectData, false);
    if (kind === 'many-balls-up') return this.drawSourceUpwardBalls(progress, metrics, scene, effectData, true);
    if (kind === 'leaves') return this.drawSourceFallingObjects(progress, metrics, effectData, 3);
    if (kind === 'petals') return this.drawSourceFallingObjects(progress, metrics, effectData, 20);
  }

  applySpecialEffect(effect, progress, scene) {
    const attackerNode = scene.side === 'player' ? this.playerSprite : this.foeSprite;
    const defenderNode = scene.side === 'player' ? this.foeSprite : this.playerSprite;
    const metrics = scene.metrics;
    const attackerKey = scene.side === 'player' ? 'player' : 'foe';
    const targetKey = scene.side === 'player' ? 'foe' : 'player';
    const attackerAnchor = scene.anchors[attackerKey].actual;
    const targetAnchor = scene.anchors[targetKey].actual;
    switch (effect) {
      case 'SE_DARK_SCREEN_FLASH':
      case 'AnimationFlashScreen':
        this.drawFlash('#fff2a8', 0.24 + (Math.sin(progress * Math.PI) * 0.36));
        break;
      case 'SE_FLASH_SCREEN_LONG':
      case 'FlashScreenEveryFourFrameBlocks':
      case 'FlashScreenEveryEightFrameBlocks':
        this.drawFlash(progress < 0.5 ? '#f2e7a8' : '#d6e3ff', 0.24 + (Math.sin(progress * Math.PI * 4) * 0.18));
        break;
      case 'SE_DARK_SCREEN_PALETTE':
        this.drawFlash('#1a1f33', 0.34);
        break;
      case 'SE_DARKEN_MON_PALETTE':
        defenderNode.style.filter = 'brightness(.55) saturate(.8)';
        break;
      case 'SE_LIGHT_SCREEN_PALETTE':
        this.drawFlash('#d7f0ff', 0.14);
        this.drawGlow(attackerAnchor.x, attackerAnchor.y, metrics.width * 0.14, '#bfe8ff', 0.45);
        break;
      case 'SE_SHAKE_SCREEN':
        this.stage.style.transform = `translate(${Math.sin(progress * Math.PI * 10) * 5}px, 0px)`;
        break;
      case 'SE_WATER_DROPLETS_EVERYWHERE':
        this.drawScreenParticles('droplets', progress, metrics, scene);
        break;
      case 'DoBlizzardSpecialEffects':
      case 'SE_PETALS_FALLING':
        this.drawScreenParticles('petals', progress, metrics, scene);
        break;
      case 'SE_LEAVES_FALLING':
        this.drawScreenParticles('leaves', progress, metrics, scene);
        break;
      case 'SE_SPIRAL_BALLS_INWARD':
        this.drawScreenParticles('spiral', progress, metrics, scene);
        break;
      case 'SE_SHOOT_BALLS_UPWARD':
        this.drawScreenParticles('balls-up', progress, metrics, scene);
        break;
      case 'SE_SHOOT_MANY_BALLS_UPWARD':
        this.drawScreenParticles('many-balls-up', progress, metrics, scene);
        break;
      case 'SE_MOVE_MON_HORIZONTALLY':
        attackerNode.style.transform = `translate(${(scene.side === 'player' ? 8 : -8) * metrics.scale}px, 0px)`;
        break;
      case 'SE_RESET_MON_POSITION':
        attackerNode.style.transform = '';
        break;
      case 'SE_BLINK_MON':
        attackerNode.style.opacity = Math.floor(progress * 10) % 2 === 0 ? '0.15' : '1';
        break;
      case 'SE_FLASH_MON_PIC':
        attackerNode.style.filter = Math.floor(progress * 10) % 2 === 0 ? 'brightness(1.85) contrast(1.35)' : '';
        break;
      case 'SE_HIDE_MON_PIC':
        attackerNode.style.opacity = '0';
        break;
      case 'SE_SHOW_MON_PIC':
        attackerNode.style.opacity = '1';
        break;
      case 'SE_HIDE_ENEMY_MON_PIC':
        defenderNode.style.opacity = '0';
        break;
      case 'SE_SHOW_ENEMY_MON_PIC':
        defenderNode.style.opacity = '1';
        break;
      case 'SE_BLINK_ENEMY_MON':
        defenderNode.style.opacity = Math.floor(progress * 10) % 2 === 0 ? '0.15' : '1';
        break;
      case 'SE_SLIDE_MON_OFF':
        attackerNode.style.transform = `translate(${lerp(0, scene.side === 'player' ? -64 * metrics.scale : 64 * metrics.scale, progress)}px, 0px)`;
        attackerNode.style.opacity = String(1 - progress);
        break;
      case 'SE_SLIDE_MON_HALF_OFF':
        attackerNode.style.transform = `translate(${lerp(0, scene.side === 'player' ? -32 * metrics.scale : 32 * metrics.scale, progress)}px, 0px)`;
        break;
      case 'SE_SLIDE_ENEMY_MON_OFF':
        defenderNode.style.transform = `translate(${lerp(0, scene.side === 'player' ? 64 * metrics.scale : -64 * metrics.scale, progress)}px, 0px)`;
        defenderNode.style.opacity = String(1 - progress);
        break;
      case 'SE_SLIDE_MON_UP':
        attackerNode.style.transform = `translate(0px, ${lerp(0, -8 * metrics.scale, progress)}px)`;
        break;
      case 'SE_SLIDE_MON_DOWN':
        attackerNode.style.transform = `translate(0px, ${lerp(0, 56 * metrics.scale, progress)}px)`;
        break;
      case 'SE_SLIDE_MON_DOWN_AND_HIDE':
        attackerNode.style.transform = `translate(0px, ${lerp(0, 16 * metrics.scale, progress)}px)`;
        attackerNode.style.opacity = String(1 - progress);
        break;
      case 'SE_SQUISH_MON_PIC':
        attackerNode.style.transform = `scaleY(${lerp(1, .4, progress)})`;
        break;
      case 'SE_BOUNCE_UP_AND_DOWN':
        attackerNode.style.transform = `translate(0px, ${Math.sin(progress * Math.PI * 2) * (-18)}px)`;
        break;
      case 'SE_MINIMIZE_MON':
        attackerNode.style.transform = `scale(${lerp(1, .45, progress)})`;
        break;
      case 'SE_SUBSTITUTE_MON':
        attackerNode.style.filter = 'sepia(.6) saturate(.4) brightness(1.15)';
        break;
      case 'SE_TRANSFORM_MON':
        attackerNode.style.filter = `brightness(${1 + (Math.sin(progress * Math.PI * 6) * .8)}) saturate(1.3)`;
        break;
      case 'SE_SHAKE_ENEMY_HUD':
        this.foeStatus.style.transform = `translate(${Math.sin(progress * Math.PI * 12) * (2 * metrics.scale)}px, 0px)`;
        break;
      case 'SE_SHAKE_BACK_AND_FORTH':
        attackerNode.style.transform = `translate(${Math.sin(progress * Math.PI * 10) * (8 * metrics.scale)}px, 0px)`;
        break;
      case 'SE_WAVY_SCREEN': {
        const offsets = scene.source.specialEffectData?.wavyScreenLineOffsets || [];
        const index = offsets.length ? Math.min(offsets.length - 1, Math.floor(progress * offsets.length)) : 0;
        this.field.style.transform = `translateX(${(offsets[index] || 0) * metrics.scale}px)`;
        break;
      }
      case 'DoExplodeSpecialEffects':
        this.drawFlash('#ffd26d', 0.16 + (Math.sin(progress * Math.PI * 3) * 0.32));
        break;
      case 'DoGrowlSpecialEffects':
        this.foeStatus.style.transform = `translate(${Math.sin(progress * Math.PI * 8) * 3}px, 0px)`;
        break;
      case 'DoRockSlideSpecialEffects':
        this.drawFlash('#b88f64', 0.12 + (Math.sin(progress * Math.PI * 2) * 0.1));
        break;
      default:
        break;
    }
  }

  renderFrame(scene) {
    this.resetSprites();
    this.resize();
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    scene.metrics = this.fieldMetrics();
    scene.anchors = this.battleAnchors(scene.metrics);
    if (scene.activeFrame) {
      const frameOffset = this.frameOffset(scene);
      this.frameCtx.clearRect(0, 0, this.frameCanvas.width, this.frameCanvas.height);
      for (const sprite of scene.activeFrame.sprites) this.drawSpriteTile(this.frameCtx, sprite);
      this.ctx.drawImage(this.frameCanvas, 0, 0, this.frameCanvas.width, this.frameCanvas.height, scene.metrics.x + frameOffset.x, scene.metrics.y + frameOffset.y, scene.metrics.width, scene.metrics.height);
    }
    for (const effect of scene.activeEffects) {
      const duration = Math.max(1, effect.end - effect.start);
      const progress = Math.min(Math.max((scene.time - effect.start) / duration, 0), 1);
      this.applySpecialEffect(effect.effectName, progress, scene);
    }
  }

  clear() {
    this.resetSprites();
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }
}

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function currentBattleViewport(assets) {
  const stage = document.querySelector('.battle-stage');
  const field = document.querySelector('[data-battle-attack-field]');
  const feed = document.querySelector('.battle-feed');
  const canvas = document.querySelector('[data-battle-attack-layer]');
  const playerSprite = document.querySelector('.combatant-player .sprite.battle');
  const foeSprite = document.querySelector('.combatant-foe .sprite.battle');
  const playerStatus = document.querySelector('.battle-status-player');
  const foeStatus = document.querySelector('.battle-status-foe');
  if (!stage || !field || !feed || !canvas || !playerSprite || !foeSprite || !playerStatus || !foeStatus) return null;
  const stageRect = stage.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const playerRect = playerSprite.getBoundingClientRect();
  const foeRect = foeSprite.getBoundingClientRect();
  if (stageRect.width < 20 || stageRect.height < 20 || canvasRect.width < 20 || canvasRect.height < 20 || playerRect.width < 8 || playerRect.height < 8 || foeRect.width < 8 || foeRect.height < 8) return null;
  return new BattleAttackViewport(stage, field, feed, canvas, playerSprite, foeSprite, playerStatus, foeStatus, assets.tilesets, assets.data.source);
}

async function waitForBattleViewport(assets, attempts = 18) {
  let viewport = null;
  for (let attempt = 0; attempt < attempts && !viewport; attempt += 1) {
    if (attempt) await nextPaint();
    viewport = currentBattleViewport(assets);
  }
  return viewport;
}

function shouldAnimateMove(lines, moveIndex) {
  const moveParts = lines[moveIndex].split('|');
  if (moveParts.includes('[still]')) return false;
  let sawFailure = false;
  let sawSuccess = false;
  for (let index = moveIndex + 1; index < lines.length; index += 1) {
    const parts = lines[index].split('|');
    const type = parts[1];
    if (type === 'move' || type === 'switch' || type === 'turn' || type === 'win') break;
    if (['-miss', '-immune', '-fail', '-notarget'].includes(type)) sawFailure = true;
    if ([
      '-damage', '-heal', '-status', '-curestatus', '-clearstatus', '-start', '-end', '-activate', '-sidestart',
      '-sideend', '-fieldstart', '-fieldend', '-prepare', '-singleturn', '-singlemove', '-boost', '-unboost',
      '-clearboost', '-clearallboost', '-clearpositiveboost', '-clearnegativeboost', '-setboost', '-supereffective',
      '-resisted', '-crit', '-hitcount', '-ohko', 'faint',
    ].includes(type)) sawSuccess = true;
  }
  if (sawFailure && !sawSuccess) return false;
  return true;
}

async function playBattleMoveAnimation(moveName, sideKey) {
  try {
    window.__pokemonBattlerDebug.lastAnimationInfo = {moveName, sideKey, stage: 'loading'};
    const assets = await ensureAttackAnimationAssets();
    const move = resolveAttackPreviewMove(assets, moveName);
    if (!move) {
      window.__pokemonBattlerDebug.lastAnimationInfo = {moveName, sideKey, stage: 'missing-move'};
      return;
    }
    const viewport = await waitForBattleViewport(assets);
    if (!viewport) {
      window.__pokemonBattlerDebug.lastAnimationInfo = {moveName, sideKey, stage: 'missing-viewport'};
      return;
    }
    const side = sideKey === ownSide() ? 'player' : 'foe';
    const timeline = buildAttackTimeline(move, side, assets.data.source);
    const sceneBase = {side, source: assets.data.source};
    window.__pokemonBattlerDebug.lastAnimationInfo = {moveName, sideKey, stage: 'running', total: timeline.total};
    await new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = (time) => {
        try {
          const localTime = Math.max(0, time - startedAt);
          const activeFrame = timeline.segments.find((segment) => segment.kind === 'subframe' && localTime >= segment.start && localTime < segment.end)?.frame || null;
          const activeEffects = [];
          let darkPalette = false;
          for (const segment of timeline.segments) {
            if (segment.kind !== 'special' || localTime < segment.start) continue;
            if (segment.effect === 'SE_DARK_SCREEN_PALETTE') darkPalette = true;
            if (segment.effect === 'SE_RESET_SCREEN_PALETTE') darkPalette = false;
            if (localTime >= segment.start && localTime < segment.end) activeEffects.push({...segment, effectName: segment.effect});
          }
          const subframeEffect = timeline.segments.find((segment) => segment.kind === 'subframe' && segment.moveSpecificEffect && localTime >= segment.start && localTime < segment.end);
          if (subframeEffect) {
            activeEffects.push({
              effectName: subframeEffect.moveSpecificEffect,
              start: subframeEffect.start,
              end: subframeEffect.start + (ATTACK_MOVE_SPECIFIC_DURATION[subframeEffect.moveSpecificEffect] || (subframeEffect.end - subframeEffect.start)),
            });
          }
          if (darkPalette) activeEffects.push({effectName: 'SE_DARK_SCREEN_PALETTE', start: 0, end: localTime + 1});
          viewport.renderFrame({...sceneBase, time: localTime, activeFrame, activeEffects});
          window.__pokemonBattlerDebug.lastAnimationInfo = {moveName, sideKey, stage: 'tick', time: localTime, hasFrame: !!activeFrame, effects: activeEffects.length};
          if (localTime >= timeline.total) {
            viewport.clear();
            window.__pokemonBattlerDebug.lastAnimationInfo = {moveName, sideKey, stage: 'done'};
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        } catch (error) {
          window.__pokemonBattlerDebug.lastAnimationError = String(error?.stack || error);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  } catch (error) {
    window.__pokemonBattlerDebug.lastAnimationError = String(error?.stack || error);
    console.warn('Battle animation skipped:', error);
  }
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

function typeColors(type) {
  const palette = {
    Normal: {bg: '#d7d0bb', fg: '#3f3729'},
    Fire: {bg: '#f0a15f', fg: '#4f2507'},
    Water: {bg: '#73a9df', fg: '#112f51'},
    Electric: {bg: '#e0c34f', fg: '#4b3900'},
    Grass: {bg: '#7fab74', fg: '#173617'},
    Ice: {bg: '#9fd7e2', fg: '#103943'},
    Fighting: {bg: '#c47d70', fg: '#40150d'},
    Poison: {bg: '#b78ad7', fg: '#33194b'},
    Ground: {bg: '#caa770', fg: '#453117'},
    Flying: {bg: '#adc4ec', fg: '#203253'},
    Psychic: {bg: '#e19cb7', fg: '#4c1830'},
    Bug: {bg: '#b8cf75', fg: '#31430b'},
    Rock: {bg: '#bca47d', fg: '#43341d'},
    Ghost: {bg: '#988fb7', fg: '#2a2145'},
    Dragon: {bg: '#8ea3f0', fg: '#1d2b63'},
  };
  return palette[type] || {bg: '#ced5c2', fg: '#1f271d'};
}

function moveTypeBadge(type, extraClass = '') {
  const tone = typeColors(type);
  const cls = ['type-badge', extraClass].filter(Boolean).join(' ');
  return `<span class="${cls}" style="--type-bg:${tone.bg};--type-fg:${tone.fg}">${type}</span>`;
}

function draftMovePreview(species) {
  const set = species.previewSet || species.set || generateConfiguredSet(species, dex, normalizedModeSettings());
  return set.moves
    .map((moveId) => dex.moves.get(moveId))
    .filter((move) => move?.exists);
}

function moveSummaryText(member, limit = 4) {
  const moves = member?.moveNames || [];
  if (moves.length <= limit) return moves.join(', ');
  return `${moves.slice(0, limit).join(', ')} +${moves.length - limit} more`;
}

function renderItemInfoCard(itemId, {selected = false, assigned = false, compact = false} = {}) {
  return `<article class="item-info-card ${selected ? 'selected' : ''} ${assigned ? 'assigned' : ''} ${compact ? 'compact' : ''}">
    <div class="item-info-head">
      ${itemIconTag(itemId)}
      <div>
        <strong>${itemName(itemId)}</strong>
        <div class="tiny">${assigned ? 'Assigned to a team member' : 'Available to assign'}</div>
      </div>
    </div>
    <div class="tiny item-info-desc">${itemDesc(itemId)}</div>
  </article>`;
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

function createDraftOption(species) {
  const previewSet = generateConfiguredSet(species, dex, normalizedModeSettings());
  return {
    ...species,
    previewSet,
    moveNames: previewSet.moves.map((moveId) => dex.moves.get(moveId)?.name || moveId),
  };
}

function drawConfiguredPack(excludedIds = new Set(), count = 3) {
  return drawPack(excludedIds, count).map((species) => createDraftOption(species));
}

function createLoadout(species, extra = {}) {
  const moves = extra.moves || species.previewSet?.moves || species.set?.moves || null;
  const item = extra.item ?? species.set?.item ?? species.item ?? '';
  const set = generateConfiguredSet(species, dex, {...normalizedModeSettings(), moves, item});
  return {
    ...species,
    set,
    item: set.item || '',
    archetype: setArchetype(species, set),
    moveNames: set.moves.map((moveId) => dex.moves.get(moveId)?.name || moveId),
  };
}

function currentEnemyLabel() {
  return state.playMode === 'bot' ? `${state.enemyName || 'Opponent'} #${state.enemyNumber}` : state.link.remoteName;
}

function nextEnemyName() {
  return ENEMY_NAMES[(state.enemyNumber - 1) % ENEMY_NAMES.length];
}

function buildItemPack(used = new Set(), count = 3, team = state.playerLoadout) {
  const pool = relevantHeldItemPool(team);
  const available = shuffle(pool.filter((itemId) => !used.has(itemId)));
  const fallback = shuffle(pool.length ? pool : HELD_ITEM_POOL);
  const base = (available.length >= count ? available : fallback).slice(0, count);
  return base.map((itemId) => dex.items.get(itemId)).filter((item) => item?.exists);
}

function playerAssignedItemFor(name) {
  return draftedItemId(state.itemAssignments[name] || '');
}

function playerAssignedItemKeyFor(name) {
  return state.itemAssignments[name] || '';
}

function applyAssignedItems(loadout, assignments) {
  return loadout.map((member) => createLoadout(member, {
    moves: member.set?.moves || member.previewSet?.moves,
    item: draftedItemId(assignments[member.name] || ''),
  }));
}

function buildLoadoutFromDraft(draftTeam) {
  return draftTeam.map((member) => createLoadout(member));
}

function autoUseRerolls(loadout) {
  let next = loadout.slice();
  for (let count = 0; count < currentRerollBudget(); count += 1) {
    const targetIndex = Math.floor(Math.random() * next.length);
    const target = next[targetIndex];
    const moveIndex = Math.floor(Math.random() * Math.max(1, target.set.moves.length));
    const moves = rerollMove(target, target.set.moves, moveIndex, dex);
    next[targetIndex] = createLoadout(target, {moves, item: target.set.item || ''});
  }
  return next;
}

function autoDraftItemsForTeam(team) {
  if (!itemDraftEnabled()) return {items: [], assignments: {}};
  const used = new Set();
  const items = [];
  for (let index = 0; index < currentTeamSize(); index += 1) {
    const pack = buildItemPack(used, 3, team);
    const picked = pack[0];
    if (!picked) continue;
    items.push(picked.id);
    used.add(picked.id);
  }
  const assignments = {};
  team.forEach((member, index) => {
    if (items[index]) assignments[member.name] = items[index];
  });
  return {items, assignments};
}

function allKnownMembers() {
  return [
    ...ownTeamState(),
    ...foeTeamState(),
    ...state.playerPreview,
    ...state.opponentPreview,
    ...state.playerLoadout,
    ...state.opponentLoadout,
    ...state.link.localPack,
    ...state.link.remotePack,
    ...state.pack,
    ...state.playerDraft,
    ...state.opponentDraft,
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
      <div class="inspect-move-tags">${moveTypeBadge(move.type)}<span>${move.category}</span></div>
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

function renderInspectMoveColumns(moves) {
  const midpoint = Math.ceil(moves.length / 2);
  const columns = [moves.slice(0, midpoint), moves.slice(midpoint)];
  return columns.map((column) => `<div class="inspect-move-column">${column.map((move) => renderInspectMoveCard(move)).join('')}</div>`).join('');
}

function logLine(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 100);
}

function clearBattleFeedNow() {
  if (battleFeedClearHandle) {
    clearTimeout(battleFeedClearHandle);
    battleFeedClearHandle = null;
  }
  state.battleFeed = [];
}

function pushBattleFeed(text) {
  if (battleFeedClearHandle) {
    clearTimeout(battleFeedClearHandle);
    battleFeedClearHandle = null;
  }
  state.battleFeed = [text];
}

function scheduleBattleFeedClear(delay = 1600) {
  if (!state.battleFeed.length) return;
  if (battleFeedClearHandle) clearTimeout(battleFeedClearHandle);
  battleFeedClearHandle = setTimeout(() => {
    battleFeedClearHandle = null;
    state.battleFeed = [];
    render();
  }, delay);
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
    return `<div class="panel"><div class="label">Opponent</div><div class="empty"><strong>${state.link.connected ? state.link.remoteName : 'No opponent'}</strong><div>${state.link.remoteDraftCount}/${currentTeamSize()} picks locked</div><div>${state.link.remoteReady ? 'Ready to battle' : 'Not ready yet'}</div></div></div>`;
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
  const moves = draftMovePreview(species);
  return `<article class="draft-card draft-choice-card" style="background:${typeGradient(species.types)}">
    <div class="draft-choice-head">
      <div><div class="label">#${species.num}</div><h3>${species.name}</h3></div>
      <button class="info-chip" data-inspect="${species.name}">Info</button>
    </div>
    <div class="draft-choice-body">
      <div class="draft-choice-sprite">${spriteTag(species, 'front', 'lg')}</div>
      <div class="draft-choice-copy">
        <div class="types">${species.types.map((type) => moveTypeBadge(type)).join('')}</div>
        <div class="move-row">${moves.map((move) => `<span class="move-chip" style="--type-bg:${typeColors(move.type).bg};--type-fg:${typeColors(move.type).fg}">${move.name}</span>`).join('')}</div>
      </div>
    </div>
    <div class="draft-stat-grid">${renderDraftStatCells(species)}</div>
    <div class="card-actions"><button class="primary-btn" ${pickAttr}>Pick</button></div>
  </article>`;
}

function renderDraftTeamSlots(team) {
  return `<div class="draft-team-strip">${Array.from({length: currentTeamSize()}, (_, index) => {
    const member = team[index];
    if (!member) {
      return `<div class="draft-team-slot empty"><span class="draft-team-index">${index + 1}</span><div><strong>Empty slot</strong><div class="tiny">Your pick appears here.</div></div></div>`;
    }
    return `<div class="draft-team-slot filled" style="background:${typeGradient(member.types)}">
      <span class="draft-team-index">${index + 1}</span>
      ${spriteTag(member, 'front', 'sm')}
      <div class="draft-team-copy"><strong>${member.name}</strong><div class="tiny">${member.types.join(' / ')}${playerAssignedItemFor(member.name) ? ` | ${itemName(playerAssignedItemFor(member.name))}` : ''}</div></div>
      <button class="info-chip" data-inspect="${member.name}">Info</button>
    </div>`;
  }).join('')}</div>`;
}

function renderDraftStatusCard(mode, roundLabel) {
  const filled = state.playerDraft.length;
  const progress = `<div class="draft-status-progress">${Array.from({length: currentTeamSize()}, (_, index) => `<span class="${index < filled ? 'filled' : ''}">${index + 1}</span>`).join('')}</div>`;
  return `<div class="draft-status-card">
    <div class="label">${mode === 'link' ? 'Opponent status' : 'Draft progress'}</div>
    <strong>${filled}/${currentTeamSize()} picked</strong>
    ${progress}
    <div class="draft-status-list">
      <span>${state.link.connected ? 'Connection ready' : 'Waiting for connection'}</span>
      <span>${state.link.connected ? state.link.remoteName : 'No opponent connected'}</span>
      <span>${state.link.localPickLocked ? 'Pick locked' : 'Pick 1 of 3 now'}</span>
    </div>
  </div>`;
}

function renderDraftShell({mode, roundLabel, title, statusCopy, chips, action, cards, showStatusCard = mode === 'link'}) {
  return `<section class="draft-shell team-size-${currentTeamSize()}">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
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
    ${showStatusCard ? `<section class="draft-link-status">${renderDraftStatusCard(mode, roundLabel)}</section>` : ''}
    <section class="draft-team-panel">
      <div class="draft-section-head"><div><div class="label">Your Team</div><h3>${currentTeamSize()} draft slots</h3></div><p>Your picks appear here right away. Use Info to check stats and moves before you lock one in.</p></div>
      ${renderDraftTeamSlots(state.playerDraft)}
    </section>
    <section class="draft-board">
      <div class="draft-section-head"><div><div class="label">Selection</div><h3>Pick 1 of 3 Pokemon</h3></div><p>${action}</p></div>
      <div class="draft-mobile-swipe-hint"><span>&larr;</span><strong>Swipe for the next card</strong><em>&bull; &bull; &bull;</em></div>
      <section class="draft-choice-grid">${cards}</section>
    </section>
  </section>`;
}

function renderPreviewHeroGuide(mode) {
  const slots = Array.from({length: currentTeamSize()}, (_, index) => {
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
    ? 'Only check your lead and your switch options. The opposing team stays hidden until battle.'
    : 'Your order stays hidden until both sides are ready and the battle begins.';
  return `<aside class="preview-hero-guide">
    <div class="label">${mode === 'bot' ? 'Battle plan' : 'Hidden plan'}</div>
    <div class="preview-hero-slot-grid">${slots}</div>
    <div class="preview-hero-note">${note}</div>
  </aside>`;
}

function renderPreviewShell({mode, title, statusCopy, chips, actionLabel, playerPanelTitle, playerCards, asidePanel}) {
  return `<section class="preview-shell team-size-${currentTeamSize()}">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
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
    <div class="preview-copy"><strong>${member.name}</strong><div class="tiny">${moveSummaryText(member, currentTeamSize() === 6 ? 2 : 4)}${member.set?.item ? ` | ${itemName(member.set.item)}` : ''}</div></div>
    <div class="preview-actions"><button class="info-chip" data-inspect="${member.name}">Info</button>${controls ? `<button class="lead-chip" data-lead-index="${index}" ${index === 0 ? 'disabled' : ''}>Lead</button>` : ''}</div>
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
              <div class="types">${member.types.map((type) => moveTypeBadge(type)).join('')}</div>
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
            ${member.set?.item ? `<div class="inspect-held-item"><span class="label">Held item</span><div class="inspect-held-item-head">${itemIconTag(member.set.item)}<strong>${itemName(member.set.item)}</strong></div><div class="tiny">${itemDesc(member.set.item)}</div></div>` : ''}
          </div>
        </div>
        <div class="inspect-details">
          <div class="modal-moves inspect-move-panel">
            <strong>Moves</strong>
            <div class="inspect-move-list">${renderInspectMoveColumns(moves)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderLeaveConfirmModal() {
  if (!state.leaveConfirmAction) return '';
  return `<div class="modal-backdrop" data-close-leave="1">
    <div class="modal leave-confirm-modal" onclick="event.stopPropagation()">
      <div class="modal-head"><div><div class="label">Leave room</div><h3>Leave the Link Battle room?</h3></div><button class="ghost-btn" data-close-leave="1">Close</button></div>
      <div class="modal-body leave-confirm-body">
        <p>You are about to leave the room, are you sure?</p>
        <div class="actions leave-confirm-actions">
          <button class="primary-btn" data-action="confirm-leave-room">Yes</button>
          <button class="ghost-btn" data-action="cancel-leave-room">No</button>
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
        <div class="menu-stage-card menu-stage-card-foe menu-stage-card-gen5">
          <strong>${generation.label} Arena</strong>
          <span>Battle preview coming soon</span>
        </div>
        <div class="menu-stage-mon menu-stage-mon-foe menu-stage-mon-empty">${menuSpriteTag(null, 'front', 'foe')}</div>
        <div class="menu-stage-mon menu-stage-mon-player menu-stage-mon-empty">${menuSpriteTag(null, 'back', 'player')}</div>
        <div class="menu-stage-line menu-stage-line-top"></div>
        <div class="menu-stage-line menu-stage-line-bottom"></div>
        <div class="menu-stage-text">Choose a generation, pick a mode, then draft and battle. Gen 5 modes are still in development.</div>
      </div>`;
  return `<section class="menu-shell">
    <div class="menu-topbar">
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
        <div class="menu-project-note">Private non-commercial fan project. Pokemon rights remain with their respective owners.</div>
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
    <section class="menu-legal-note" aria-label="Project disclaimer">
      <div class="label">Private fan project</div>
      <p>This is a private, non-commercial Pokemon fan project. No ownership is claimed. Pokemon and all related names, characters, images, and trademarks belong to Nintendo, Game Freak, Creatures, The Pokemon Company, and their respective rights holders.</p>
    </section>
  </section>`;
}

function renderSettingCard(label, title, options, rowClass = '') {
  return `<article class="mode-settings-card">
    <div class="label">${label}</div>
    <h3>${title}</h3>
    <div class="mode-settings-toggle-row ${rowClass}">${options.join('')}</div>
  </article>`;
}

function renderSettingRow(label, title, options, note = '', rowClass = '') {
  return `<article class="mode-settings-row">
    <div class="mode-settings-row-copy">
      <div class="label">${label}</div>
      <h3>${title}</h3>
      ${note ? `<p>${note}</p>` : ''}
    </div>
    <div class="mode-settings-toggle-row ${rowClass}">${options.join('')}</div>
  </article>`;
}

function renderModeSettingsStage() {
  const settings = normalizedModeSettings();
  const modeLabel = state.pendingMode === 'bot' ? 'Bot Run' : 'Link Battle';
  const button = (action, text, active, extra = '') => `<button class="mode-settings-toggle ${active ? 'active' : ''} ${extra}" data-action="${action}">${text}</button>`;
  const rerollControls = `<div class="mode-settings-counter ${settings.attackReroll ? '' : 'disabled'}">
        <button class="mini-btn" data-action="mode-reroll-minus" ${!settings.attackReroll || settings.rerollCount <= 1 ? 'disabled' : ''}>-</button>
        <span>${settings.rerollCount}X</span>
        <button class="mini-btn" data-action="mode-reroll-plus" ${!settings.attackReroll || settings.rerollCount >= 9 ? 'disabled' : ''}>+</button>
      </div>`
  ;
  const summaryRows = [
    ['Attack rules', attackModeLabel()],
    ['Team size', `${settings.teamSize} Pokemon`],
    ['Rerolls', settings.attackReroll ? `${settings.rerollCount} total rerolls` : 'Off'],
    ['Held items', settings.itemDraft ? 'Gen 5 draft enabled' : 'Off'],
  ];
  const desktopControls = `
    <section class="mode-settings-grid">
      ${renderSettingCard('Attacks', 'Move generation', [
        button('mode-attack-fixed', 'Fixed attacks', settings.attackMode === 'fixed'),
        button('mode-attack-randomized', 'Randomized attacks', settings.attackMode === 'randomized'),
      ])}
      ${renderSettingCard('Rerolls', 'Attack reroll budget', [
        button('mode-reroll-off', 'Off', !settings.attackReroll),
        button('mode-reroll-on', 'On', settings.attackReroll),
        rerollControls,
      ], 'reroll-toggle-row')}
      ${renderSettingCard('Roster', 'Team size', [
        button('mode-team-3', '3 Pokemon', settings.teamSize === 3),
        button('mode-team-6', '6 Pokemon', settings.teamSize === 6),
      ])}
      ${renderSettingCard('Items', 'Held item draft', [
        button('mode-items-off', 'Off', !settings.itemDraft),
        button('mode-items-on', 'On', settings.itemDraft),
      ])}
    </section>`;
  const mobileControls = `
    <section class="mode-settings-mobile-panel">
      ${renderSettingRow('Attacks', 'Move generation', [
        button('mode-attack-fixed', 'Fixed', settings.attackMode === 'fixed'),
        button('mode-attack-randomized', 'Randomized', settings.attackMode === 'randomized'),
      ], 'Choose curated sets or fully random legal moves.')}
      ${renderSettingRow('Rerolls', 'Attack rerolls', [
        button('mode-reroll-off', 'Off', !settings.attackReroll),
        button('mode-reroll-on', 'On', settings.attackReroll),
        rerollControls,
      ], 'Spend rerolls after the Pokemon draft ends.', 'reroll-toggle-row')}
      ${renderSettingRow('Roster', 'Team size', [
        button('mode-team-3', '3', settings.teamSize === 3),
        button('mode-team-6', '6', settings.teamSize === 6),
      ], 'Pick a short run or a full 6-Pokemon run.')}
      ${renderSettingRow('Items', 'Held item draft', [
        button('mode-items-off', 'Off', !settings.itemDraft),
        button('mode-items-on', 'On', settings.itemDraft),
      ], 'Uses a curated pool of later-generation held items with live battle effects.')}
    </section>`;
  return `<section class="mode-settings-shell team-size-${settings.teamSize}">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>${modeLabel}</span></div>
    </div>
    <section class="draft-hero-panel mode-settings-hero">
      <div class="draft-hero-copy mode-settings-copy">
        <div class="draft-kicker-row"><span class="label">Mode setup</span><span class="draft-status-pill">${modeLabel}</span></div>
        <h2>Set the draft rules before the run starts.</h2>
        <p>Pick how moves are generated, how many Pokemon the run uses, whether rerolls are available, and whether held items are drafted after the team is locked.</p>
      </div>
      <aside class="mode-settings-summary">
        <div class="label">Current rules</div>
        <div class="mode-settings-summary-list">${summaryRows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
        <div class="mode-settings-summary-note">Gen 1 uses a curated later-generation held item pool only when item draft is enabled.</div>
      </aside>
    </section>
    <div class="mode-settings-desktop">${desktopControls}</div>
    <div class="mode-settings-mobile">${mobileControls}</div>
    <section class="mode-settings-notes">
      <div class="mode-settings-note"><strong>Randomized attacks</strong><span>Each Pokemon gets four random moves from its own legal learnset. If it runs out of legal moves, the remaining slots pull from the full Gen 1 move pool.</span></div>
      <div class="mode-settings-note"><strong>Attack rerolls</strong><span>After the Pokemon draft, you can reroll one move at a time across your team. The default budget is 3 whenever rerolls are enabled.</span></div>
      <div class="mode-settings-note"><strong>Held item draft</strong><span>Gen 1 had no held items, so this mode uses a compact curated pool of later-generation held items with real battle effects. After the Pokemon draft, you draft from three choices at a time and assign the items you want before battle.</span></div>
    </section>
    <div class="actions mode-settings-actions">
      <button class="primary-btn" data-action="confirm-mode-settings">Continue</button>
    </div>
  </section>`;
}

function renderDraftStage() {
  const round = Math.min(state.playerDraft.length + 1, currentTeamSize());
  return renderDraftShell({
    mode: 'bot',
    roundLabel: `Round ${round} of ${currentTeamSize()}`,
    title: 'Pick your next Pokemon',
    statusCopy: state.message,
    chips: [currentGenerationConfig().label, '3-card packs', `${state.playerDraft.length}/${currentTeamSize()} picked`, attackModeLabel()],
    action: 'These three cards are your full selection for this round.',
    cards: state.pack.map((species) => renderDraftCard(species, `data-draft-id="${species.id}"`)).join(''),
  });
}

function renderRerollMoveCard(member, memberIndex) {
  const rows = member.set.moves.map((moveId, moveIndex) => {
    const move = dex.moves.get(moveId);
    if (!move?.exists) return '';
    const tone = typeColors(move.type);
    return `<div class="reroll-move-tile">
      <div class="reroll-move-top">
        <span class="label">Slot ${moveIndex + 1}</span>
        <span class="move-chip" style="--type-bg:${tone.bg};--type-fg:${tone.fg}">${move.name}</span>
      </div>
      <button class="ghost-btn compact-btn reroll-move-btn" data-reroll-member="${memberIndex}" data-reroll-move="${moveIndex}" ${state.rerollsLeft <= 0 ? 'disabled' : ''}>Reroll</button>
    </div>`;
  }).join('');
  const accent = typeColors(member.types[0] || 'Normal');
  return `<article class="reroll-card" style="--reroll-accent:${accent.bg};--reroll-accent-fg:${accent.fg}">
    <div class="reroll-card-head">
      <div class="reroll-card-title">
        <div class="label">#${member.num}</div>
        <h3>${member.name}</h3>
      </div>
      <button class="info-chip" data-inspect="${member.name}">Info</button>
    </div>
    <div class="reroll-card-strip">
      <div class="reroll-card-sprite">${spriteTag(member, 'front', 'sm')}</div>
      <div class="reroll-card-meta">
        <div class="types">${member.types.map((type) => moveTypeBadge(type)).join('')}</div>
      </div>
    </div>
    <div class="reroll-move-list">${rows}</div>
  </article>`;
}

function renderRerollStage() {
  const modeLabel = state.playMode === 'bot' ? 'Bot Run' : 'Link Battle';
  const nextLabel = itemDraftEnabled() ? 'Continue to items' : 'Continue';
  const attackRuleText = state.modeSettings.attackMode === 'randomized' ? 'Randomized learnset mode' : 'Fixed curated sets';
  const nextStep = itemDraftEnabled() ? 'Held item draft' : 'Lead order';
  const focusIndex = Math.min(Math.max(0, state.rerollFocusMember || 0), Math.max(0, state.playerLoadout.length - 1));
  const focusedMember = state.playerLoadout[focusIndex] || state.playerLoadout[0];
  const selector = state.playerLoadout.map((member, index) => `
    <button class="reroll-team-tab ${index === focusIndex ? 'active' : ''}" data-reroll-focus="${index}">
      <span class="reroll-team-tab-sprite">${spriteTag(member, 'front', 'sm')}</span>
      <span class="reroll-team-tab-name">${member.name}</span>
    </button>
  `).join('');
  return `<section class="draft-shell team-size-${currentTeamSize()}">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>${modeLabel}</span></div>
    </div>
    <section class="reroll-toolbar">
      <div class="reroll-toolbar-copy">
        <div class="draft-kicker-row"><span class="label">Move workshop</span><span class="draft-status-pill">${state.rerollsLeft} rerolls left</span></div>
        <h2>Refine the moves you want to bring into battle.</h2>
        <p>Use each reroll on a single move slot. The updated set is saved immediately for the next step.</p>
      </div>
      <div class="reroll-toolbar-stats">
        <div class="reroll-stat-card"><span>Attack rules</span><strong>${attackRuleText}</strong></div>
        <div class="reroll-stat-card"><span>Next step</span><strong>${nextStep}</strong></div>
        <div class="reroll-stat-card"><span>Fallback rule</span><strong>Uses the full Gen 1 move pool if a Pokemon runs out of legal unused moves.</strong></div>
      </div>
    </section>
    <section class="reroll-desktop-only">
      <section class="reroll-grid reroll-workshop-grid">${state.playerLoadout.map((member, index) => renderRerollMoveCard(member, index)).join('')}</section>
    </section>
    <section class="reroll-mobile-only reroll-mobile-workshop">
      <div class="reroll-team-tabs" data-preserve-scroll="reroll-team-tabs">${selector}</div>
      ${focusedMember ? renderRerollMoveCard(focusedMember, focusIndex) : ''}
    </section>
    <div class="actions reroll-footer">
      <div class="reroll-footer-copy"><strong>${state.rerollsLeft}</strong><span>rerolls left</span></div>
      <button class="primary-btn" data-action="finish-rerolls">${nextLabel}</button>
    </div>
  </section>`;
}

function renderItemDraftCard(item) {
  return `<article class="item-draft-card">
    <div class="item-draft-head">
      ${itemIconTag(item.id)}
      <div><div class="label">Held item</div><h3>${item.name}</h3></div>
    </div>
    <div class="tiny">${item.shortDesc || item.desc || 'Held item effect'}</div>
    <div class="card-actions"><button class="primary-btn" data-item-pick="${item.id}">Pick item</button></div>
  </article>`;
}

function renderItemDraftStage() {
  const round = Math.min(state.itemDraftRound || 1, currentTeamSize());
  const draftedCount = state.draftedItems.length;
  const draftedPool = draftedCount
    ? `<div class="item-pool-strip">${state.draftedItems.map((entry) => `<span class="item-pill">${itemIconTag(entry.id, 'small')}${itemName(entry.id)}</span>`).join('')}</div>`
    : '<div class="item-draft-summary-empty">Each pick stays available for the assignment step.</div>';
  return `<section class="draft-shell item-draft-shell team-size-${currentTeamSize()}">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>${state.playMode === 'bot' ? 'Bot Run' : 'Link Battle'}</span></div>
    </div>
    <section class="draft-hero-panel">
      <div class="draft-hero-copy">
        <div class="draft-kicker-row"><span class="label">Held item draft</span><span class="draft-status-pill">Round ${round} of ${currentTeamSize()}</span></div>
        <h2>Pick one held item from this item pack.</h2>
        <p>Each round adds one item to your drafted item pool. After the item draft, you can assign any of your drafted items to your team.</p>
        <div class="draft-chip-row"><span>${currentGenerationConfig().label}</span><span>${state.draftedItems.length} of ${currentTeamSize()} items drafted</span><span>Curated held item pool</span></div>
      </div>
    </section>
    <section class="draft-team-panel">
      <div class="draft-section-head"><div><div class="label">Your lineup</div><h3>${currentTeamSize()} Pokemon waiting for items</h3></div><p>Use Info to check moves and stats while you draft held items.</p></div>
      <div class="draft-team-strip item-draft-team-strip">${state.playerLoadout.map((member) => `<div class="draft-team-slot filled compact" style="background:${typeGradient(member.types)}">
        <div class="draft-team-slot-head">${spriteTag(member, 'front', 'sm')}<div class="draft-team-slot-copy"><strong title="${member.name}">${member.name}</strong><div class="tiny">${moveSummaryText(member, 2)}</div></div></div>
        <button class="info-chip" data-inspect="${member.name}">Info</button>
      </div>`).join('')}</div>
      <div class="item-draft-summary">
        <div class="item-draft-summary-head">
          <strong>${draftedCount ? `${draftedCount} item${draftedCount === 1 ? '' : 's'} saved for later` : 'Drafted item pool'}</strong>
          <span>${draftedCount} of ${currentTeamSize()} item slots filled.</span>
        </div>
        ${draftedPool}
      </div>
    </section>
    <section class="draft-board">
        <div class="draft-section-head"><div><div class="label">Selection</div><h3>Pick 1 of 3 held items</h3></div><p>Choose the item that gives your team the best edge.</p></div>
        <section class="draft-choice-grid item-draft-grid">${state.itemPack.map((item) => renderItemDraftCard(item)).join('')}</section>
    </section>
  </section>`;
}

function renderItemAssignMemberCard(member, {compact = false} = {}) {
  const assignedItem = playerAssignedItemFor(member.name);
  return `<article class="item-assign-card ${compact ? 'compact' : ''}" style="background:${typeGradient(member.types)}">
    <div class="item-assign-head">${spriteTag(member, 'front', 'sm')}<div><strong>${member.name}</strong><div class="item-assign-type-row">${member.types.map((type) => moveTypeBadge(type, 'compact')).join('')}</div><div class="tiny">${moveSummaryText(member, currentTeamSize() === 6 ? 2 : 4)}</div></div><button class="info-chip" data-inspect="${member.name}">Info</button></div>
    <div class="item-assign-current">${assignedItem ? `<span class="item-pill assigned">${itemName(assignedItem)}</span>` : '<span class="item-pill empty">No held item</span>'}</div>
    <div class="card-actions"><button class="primary-btn" data-assign-item="${member.name}" ${state.selectedDraftItem ? '' : 'disabled'}>Assign selected</button><button class="ghost-btn compact-btn" data-clear-item="${member.name}" ${assignedItem ? '' : 'disabled'}>Clear</button></div>
  </article>`;
}

function renderItemAssignSelectorCard(member, index) {
  const assignedItem = playerAssignedItemFor(member.name);
  return `<button class="item-assign-team-tab ${index === state.itemAssignFocusMember ? 'active' : ''}" data-item-assign-focus="${index}">
    <span class="item-assign-team-tab-sprite">${spriteTag(member, 'front', 'sm')}</span>
    <span class="item-assign-team-tab-copy"><strong title="${member.name}">${member.name}</strong><span>${assignedItem ? itemName(assignedItem) : 'No item'}</span></span>
  </button>`;
}

function renderItemAssignPickerCard(entry, assignedItems, compact = false) {
  const selected = state.selectedDraftItem === entry.key;
  const assigned = assignedItems.has(entry.key);
  return `<button class="item-picker-card ${selected ? 'selected' : ''} ${assigned ? 'assigned' : ''} ${compact ? 'compact' : ''}" data-select-item="${entry.key}" data-carousel-option="1">
    <div class="item-picker-card-head">${itemIconTag(entry.id)}<div><strong>${itemName(entry.id)}</strong><span>${assigned ? 'Assigned' : 'Available'}</span></div></div>
  </button>`;
}

function renderItemAssignItemSlide(entry, assignedItems, compact = false) {
  const selected = state.selectedDraftItem === entry.key;
  const assigned = assignedItems.has(entry.key);
  return `<button class="item-assign-item-slide ${selected ? 'selected' : ''}" data-select-item="${entry.key}" data-carousel-option="1">
    ${renderItemInfoCard(entry.id, {selected, assigned, compact})}
  </button>`;
}

function renderItemAssignCarouselSlide(member, index) {
  return `<div class="item-assign-member-slide ${index === state.itemAssignFocusMember ? 'active' : ''}" data-item-assign-focus="${index}" data-carousel-option="1">
    ${renderItemAssignMemberCard(member, {compact: true})}
  </div>`;
}

function renderItemAssignProgressSlot(member, index) {
  const assignedItem = playerAssignedItemFor(member.name);
  return `<button class="item-assign-progress-slot ${index === state.itemAssignFocusMember ? 'active' : ''} ${assignedItem ? 'assigned' : ''}" data-item-assign-focus="${index}">
    <span class="item-assign-progress-sprite">${spriteTag(member, 'front', 'sm')}</span>
    <span class="item-assign-progress-state">${assignedItem ? itemIconTag(assignedItem, 'small') : '<span class="item-assign-progress-empty-dot"></span>'}</span>
  </button>`;
}

function renderItemAssignProgressCard() {
  const assignedCount = Object.values(state.itemAssignments).filter(Boolean).length;
  return `<div class="item-assign-progress-card">
    <div class="item-assign-progress-head">
      <div class="label">Assignment progress</div>
      <strong>${assignedCount}/${currentTeamSize()} set</strong>
    </div>
    <div class="item-assign-progress-strip">${state.playerLoadout.map((member, index) => renderItemAssignProgressSlot(member, index)).join('')}</div>
  </div>`;
}

function renderItemAssignStage() {
  const compactCopy = currentTeamSize() === 6;
  const assignedItems = new Set(Object.values(state.itemAssignments));
  const highlightedItemKey = state.selectedDraftItem || state.draftedItems.find((entry) => assignedItems.has(entry.key))?.key || state.draftedItems[0]?.key || '';
  const highlightedItem = draftedItemEntry(highlightedItemKey);
  const assignedCount = Object.values(state.itemAssignments).filter(Boolean).length;
  const focusIndex = Math.min(Math.max(0, state.itemAssignFocusMember || 0), Math.max(0, state.playerLoadout.length - 1));
  const focusedMember = state.playerLoadout[focusIndex] || state.playerLoadout[0];
  return `<section class="preview-shell item-assign-shell team-size-${currentTeamSize()}">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>${state.playMode === 'bot' ? 'Bot Run' : 'Link Battle'}</span></div>
    </div>
    <section class="draft-hero-panel preview-hero-panel">
      <div class="draft-hero-copy">
        <div class="draft-kicker-row"><span class="label">Item assign</span><span class="draft-status-pill">${state.draftedItems.length} drafted</span></div>
        <h2>Assign your held items to the team.</h2>
        ${compactCopy ? '' : '<p>Select an item from the pool, then click the Pokemon that should carry it. Each Pokemon can hold one item, and unassigned items can stay unused.</p>'}
        <div class="draft-chip-row"><span>${currentGenerationConfig().label}</span><span>${currentTeamSize()} Pokemon</span><span>${highlightedItem ? `Selected: ${itemName(highlightedItem.id)}` : 'Select an item to inspect or assign'}</span></div>
      </div>
    </section>
    <section class="item-assign-mobile-status item-assign-mobile-only">
      <div class="item-assign-status-card"><span>Selected item</span><strong>${highlightedItem ? itemName(highlightedItem.id) : 'Choose an item'}</strong></div>
      <div class="item-assign-status-card"><span>Assigned</span><strong>${assignedCount}/${currentTeamSize()} ready</strong></div>
    </section>
    <section class="draft-team-panel item-assign-pool-panel">
      <div class="draft-section-head"><div><div class="label">Drafted item pool</div><h3>Choose one to assign</h3></div><p>Click an item to arm it, then click a team card to place it.</p></div>
      <section class="item-assign-desktop-only">
        <div class="item-pool-strip item-assign-item-strip item-assign-item-carousel" data-preserve-scroll="item-assign-items" data-carousel-select="item" aria-label="Swipe held items">${state.draftedItems.map((entry) => renderItemAssignPickerCard(entry, assignedItems, currentTeamSize() === 6)).join('')}</div>
        ${highlightedItem ? renderItemInfoCard(highlightedItem.id, {selected: true, assigned: assignedItems.has(highlightedItemKey), compact: compactCopy}) : ''}
      </section>
      <section class="item-assign-mobile-only">
        <div class="item-assign-item-detail-carousel" data-preserve-scroll="item-assign-items" data-carousel-select="item" aria-label="Swipe held items">${state.draftedItems.map((entry) => renderItemAssignItemSlide(entry, assignedItems, currentTeamSize() === 6)).join('')}</div>
      </section>
    </section>
    <section class="draft-board item-assign-board">
      <div class="draft-section-head"><div><div class="label">Your team</div><h3>Place your held items</h3></div><p class="preview-order-note">Click a card while an item is selected to assign it. Use Clear to remove an item from a Pokemon.</p></div>
      <section class="item-assign-desktop-only"><div class="item-assign-list">${state.playerLoadout.map((member) => renderItemAssignMemberCard(member)).join('')}</div></section>
      <section class="item-assign-mobile-only">
        <div class="item-assign-member-carousel" data-preserve-scroll="item-assign-team" data-carousel-select="member" aria-label="Swipe team members">${state.playerLoadout.map((member, index) => renderItemAssignCarouselSlide(member, index)).join('')}</div>
        ${renderItemAssignProgressCard()}
      </section>
    </section>
    <div class="actions mode-settings-actions"><button class="primary-btn" data-action="finish-item-assign">Continue</button></div>
  </section>`;
}

function renderBotPreviewStage() {
  return renderPreviewShell({
    mode: 'bot',
    title: `Arrange your team for ${currentEnemyLabel()}`,
    statusCopy: state.message,
    chips: [currentGenerationConfig().label, `${currentTeamSize()} Pokemon picked`, 'Set your lead order', attackModeLabel(), itemDraftEnabled() ? 'Held items active' : 'No held items'],
    actionLabel: 'Your order decides your lead and your switch options.',
    playerPanelTitle: 'Your order',
    playerCards: state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join(''),
    asidePanel: `<div class="preview-panel preview-opponent-panel">
        <div class="draft-section-head"><div><div class="label">Arena ready</div><h3>${currentEnemyLabel()}</h3></div><p>Only set your lead and your remaining switch options now.</p></div>
        <div class="preview-status-stack">
          <div class="empty"><strong>Set your order</strong><div>Slot 1 starts the battle. Every later slot becomes a switch option.</div></div>
        </div>
        <div class="actions"><button class="primary-btn" data-action="start-battle">Start Battle</button><button class="ghost-btn" data-action="go-menu">Mode Select</button></div>
      </div>`,
  });
}

function renderLinkConnectionCard(kind) {
  if (kind === 'host') {
    const hostReady = state.link.role === 'host' && Boolean(state.link.peerId);
    return `<article class="link-setup-card">
      <div class="label">Host room</div>
      <h3>${hostReady ? 'Share the host code' : 'Set the rules and open a room'}</h3>
      <p>${hostReady ? 'The room is ready for one opponent. Share the 5-letter code. If nobody joins, it expires after 10 minutes.' : 'Choose the draft rules first. After Continue, this card returns with the live 5-letter host code.'}</p>
      <button class="primary-btn" data-action="host-link">${hostReady ? 'Host with new rules' : 'Set rules & host'}</button>
      <div class="code-box link-code-box">${state.link.peerId || '-----'}</div>
      ${hostReady ? `<div class="link-card-note">${attackModeLabel()} · ${currentTeamSize()} Pokemon · ${itemDraftEnabled() ? 'Held item draft on' : 'Held item draft off'}</div>` : ''}
    </article>`;
  }
  return `<article class="link-setup-card">
    <div class="label">Join room</div>
    <h3>Enter a 5-letter code</h3>
    <p>Join the hosted room. The host rules sync automatically, then both players move straight into the draft.</p>
    <input id="joinCodeInput" class="text-input" maxlength="5" placeholder="Enter room code" value="${state.hostJoinCode}">
    <button class="primary-btn" data-action="join-link">Connect</button>
    ${state.link.connected ? `<div class="link-card-note">Connected to ${state.link.remoteName}.</div>` : ''}
  </article>`;
}

function renderLinkSetupStage() {
  const roomPrepared = state.link.role === 'host' && Boolean(state.link.peerId);
  const chips = roomPrepared
    ? [currentGenerationConfig().label, '5-letter host code ready', attackModeLabel(), `${currentTeamSize()} Pokemon`, itemDraftEnabled() ? 'Held item draft on' : 'Held item draft off']
    : [currentGenerationConfig().label, 'Choose host or join', 'Rules chosen by the host'];
  return `<section class="link-setup-shell">
    <div class="draft-topbar">
      <button class="ghost-btn back" data-action="go-menu">Back to start page</button>
      <div class="draft-topbar-meta"><span>${currentGenerationConfig().label}</span><span>Link Battle</span></div>
    </div>
    <section class="link-setup-hero">
      <div class="link-setup-copy">
        <div class="draft-kicker-row"><span class="label">Link Terminal</span><span class="draft-status-pill">${state.link.connected ? 'Connected' : 'Setup'}</span></div>
        <h2>${roomPrepared ? 'Room open. Share the code, then jump into the draft.' : 'Choose whether to host or join a Link Battle room.'}</h2>
        <p>${state.link.status}</p>
        <div class="draft-chip-row">${chips.map((chip) => `<span>${chip}</span>`).join('')}</div>
      </div>
      <div class="link-setup-stage-card">
        <div class="label">How it works</div>
        <div class="link-setup-step-grid">
          <div class="link-setup-step"><span>1</span><strong>Host or join</strong><div>The host sets the rules, opens the room, and shares the 5-letter code.</div></div>
          <div class="link-setup-step"><span>2</span><strong>Draft like Bot Run</strong><div>Both players draft through the full flow without waiting between steps.</div></div>
          <div class="link-setup-step"><span>3</span><strong>Start together</strong><div>Only the final Start battle step waits for the other player.</div></div>
        </div>
      </div>
    </section>
    ${state.link.alert ? `<div class="link-setup-alert" role="alert">${state.link.alert}</div>` : ''}
    <section class="link-setup-grid">
      ${renderLinkConnectionCard('host')}
      ${renderLinkConnectionCard('guest')}
    </section>
    <div class="actions link-setup-actions"><button class="ghost-btn" data-action="go-menu">Mode Select</button></div>
  </section>`;
}

function renderLinkDraftStage() {
  return renderDraftShell({
    mode: 'link',
    roundLabel: `Round ${state.link.draftRound || 1} of ${currentTeamSize()}`,
    title: 'Pick your next Pokemon',
    statusCopy: 'Draft your link battle team with the same flow as Bot Run. The other player handles their own draft on their side.',
    chips: [currentGenerationConfig().label, 'Link Battle draft', `${state.playerDraft.length}/${currentTeamSize()} picked`, state.link.connected ? 'Room connected' : 'Waiting for connection', attackModeLabel()],
    action: 'Pick 1 of 3. After the draft, the reroll, item, and order steps continue without waiting.',
    cards: state.link.localPack.map((species) => renderDraftCard(species, `data-link-draft-id="${species.id}"`)).join(''),
    showStatusCard: false,
  });
}

function renderLinkPreviewStage() {
  const waiting = state.link.localReady && !state.link.remoteReady;
  const opponentReady = !state.link.localReady && state.link.remoteReady;
  return renderPreviewShell({
    mode: 'link',
    title: 'Arrange your team for Link Battle',
    statusCopy: 'Set your lead order now. The other player only sees the final battle once both of you hit Start battle.',
    chips: [currentGenerationConfig().label, 'Link Battle ready', `${state.playerPreview.length}/${currentTeamSize()} ready`, state.link.connected ? 'Room connected' : 'Connection needed', itemDraftEnabled() ? 'Held items active' : 'No held items'],
    actionLabel: 'Slot 1 starts the battle. Every later slot becomes a switch option.',
    playerPanelTitle: 'Your order',
    playerCards: state.playerPreview.map((member, index) => renderPreviewCard(member, index, true)).join(''),
    asidePanel: `<div class="preview-panel preview-opponent-panel">
        <div class="draft-section-head"><div><div class="label">Battle start</div><h3>Player versus player</h3></div><p>Only the final Start battle step waits for the other player.</p></div>
        <div class="preview-status-stack">
          <div class="empty"><strong>${waiting ? 'Waiting for player...' : opponentReady ? 'Player ready' : state.link.connected ? 'Set your order' : 'Connection needed'}</strong><div>${waiting ? 'Your order is locked in. The battle begins as soon as the other player starts too.' : opponentReady ? 'The other player is ready. You can start the battle now.' : state.link.connected ? 'Pick your lead and click Start battle when the order looks right.' : 'Reconnect before trying to start the battle.'}</div></div>
        </div>
        <div class="actions"><button class="primary-btn ${state.link.localReady ? 'link-ready-armed' : ''}" data-action="ready-link-battle" ${!state.link.connected || state.link.localReady ? 'disabled' : ''}>Start battle</button><button class="ghost-btn" data-action="link-rematch">Draft again</button></div>
      </div>`,
  });
}

function hpTone(percent) {
  if (percent <= 20) return 'hp-low';
  if (percent <= 50) return 'hp-mid';
  return 'hp-high';
}

function renderBattleBallRow(team, side) {
  const total = Math.max(team?.length || 0, currentTeamSize());
  if (!total) return '';
  return `<div class="battle-ball-row battle-ball-row-${side}" aria-hidden="true">${Array.from({length: total}, (_, index) => {
    const member = team?.[index];
    const fainted = !member || member.condition?.endsWith(' fnt') || member.status === 'fainted';
    return `<span class="battle-ball ${fainted ? 'fainted' : ''}"><img src="${POKEBALL_STATUS_PATH}" alt=""></span>`;
  }).join('')}</div>`;
}

function renderCombatant(mon, facing, sideKey, side, team = []) {
  if (!mon || mon.condition?.endsWith(' fnt')) return `<div class="combatant combatant-${side} empty"><div class="battle-status-shell battle-status-shell-${side}">${side === 'player' ? renderBattleBallRow(team, side) : ''}${side === 'foe' ? renderBattleBallRow(team, side) : ''}</div></div>`;
  const percent = conditionToPercent(mon.condition);
  const infoButton = side === 'player' ? `<button class="info-chip battle-status-info" data-inspect="${mon.name}" aria-label="Inspect ${mon.name}">Info</button>` : '';
  return `<div class="combatant combatant-${side} ${state.flash[sideKey]}">
    <div class="battle-status-shell battle-status-shell-${side}">
      ${side === 'player' ? renderBattleBallRow(team, side) : ''}
      <div class="battle-status battle-status-${side}">
        <div class="battle-status-top">
          <div class="battle-status-name"><div class="battle-status-name-row"><strong>${mon.name}</strong></div></div>
        </div>
        <div class="battle-status-meta"><span>Lv100</span>${infoButton}<span>${mon.status || 'OK'}</span></div>
        <div class="battle-hp-row"><span class="hp-label">HP</span><div class="hp battle-hp"><div class="hp-fill ${hpTone(percent)}" style="width:${percent}%"></div></div></div>
        <div class="tiny">${mon.condition}</div>
      </div>
      ${side === 'foe' ? renderBattleBallRow(team, side) : ''}
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
  const interactionLocked = state.actionLocked || state.battleAnimating || Boolean(state.pendingPlayerRequest);
  const allowSwitch = own && state.playerRequest && (state.playerRequest.forceSwitch || !state.playerRequest.active?.[0]?.trapped);
  const switchChoices = new Map(
    allowSwitch
      ? state.playerRequest.side.pokemon
        .map((mon, index) => ({mon, index}))
        .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'))
        .map(({mon, index}) => [mon.details.split(',')[0], `switch ${index + 1}`])
      : [],
  );
  return `<div class="bench-grid" data-preserve-scroll="${own ? 'battle-bench' : 'battle-bench-foe'}">${bench.map((member) => {
    const fainted = member.condition?.endsWith(' fnt') || member.status === 'fainted';
    const switchChoice = own ? switchChoices.get(member.name) || '' : '';
    const switchState = fainted
      ? 'Fainted'
      : own && switchChoice
        ? (state.playerRequest?.forceSwitch ? 'Forced switch' : 'Tap card to switch in')
        : '';
    const clickable = Boolean(switchChoice) && !interactionLocked;
    return `<div class="bench-card bench-card-switch ${clickable ? 'bench-card-actionable' : ''} ${fainted ? 'bench-card-fainted' : ''}" ${clickable ? `data-choice="${switchChoice}" data-choice-kind="switch"` : ''} style="background:${typeGradient(member.types || ['Normal'])}">
      <div class="bench-card-sprite">${spriteTag(member, 'front', 'sm')}</div>
      <div class="bench-card-copy"><strong>${member.name}</strong><div class="tiny">${member.condition}</div>${switchState ? `<div class="bench-card-switch-note">${switchState}</div>` : ''}</div>
      <button class="info-chip" data-inspect="${member.name}">Info</button>
    </div>`;
  }).join('')}</div>`;
}

function renderChoiceButtons() {
  if (!state.playerRequest) return '<div class="empty">Waiting for the next request.</div>';
  const interactionLocked = state.actionLocked || state.battleAnimating || Boolean(state.pendingPlayerRequest);
  if (state.playerRequest.forceSwitch) {
    return interactionLocked
      ? '<div class="empty battle-choice-note"><strong>Resolving turn.</strong><div>Your next switch will be available in a moment.</div></div>'
      : '<div class="empty battle-choice-note"><strong>Choose your next Pokemon.</strong><div>Tap one of the reserve cards below to send it in.</div></div>';
  }
  const moves = state.playerRequest.active?.[0]?.moves.map((move, index) => {
    const selected = state.selectedChoice === `move ${index + 1}` ? 'selected' : '';
    const moveData = dex.moves.get(move.id || move.move || '');
    const tone = typeColors(moveData?.type);
    const hasTrackedPp = Number.isFinite(move.pp);
    const disabled = interactionLocked || move.disabled || (hasTrackedPp && move.pp <= 0);
    const ppText = Number.isFinite(move.pp) && Number.isFinite(move.maxpp) ? `<span class="choice-btn-pp">${move.pp}/${move.maxpp} PP</span>` : '';
    return `<button class="choice-btn choice-btn-move ${selected}" style="--choice-type-bg:${tone.bg};--choice-type-fg:${tone.fg}" data-choice="move ${index + 1}" data-choice-kind="move" data-move-name="${move.move}" ${disabled ? 'disabled' : ''}><strong class="choice-btn-name">${move.move}</strong>${ppText}</button>`;
  }).join('') || '';
  return `<div class="choice-grid">${moves}</div>`;
}

function renderBattleStage() {
  const rematch = state.playMode === 'link' && state.battleFinished
    ? '<button class="primary-btn" data-action="link-rematch">Rematch</button>'
    : state.playMode === 'bot' && state.battleFinished
      ? '<button class="primary-btn" data-action="retry-bot">Retry</button>'
      : '';
  const latestFeed = state.battleFeed[0] || '';
  const streak = `Win Streak ${state.runWins}`;
  return `<section class="battle-ui team-size-${currentTeamSize()}">
    ${renderBattleDecor()}
    <div class="battle-frame-top">
      <button class="ghost-btn battle-mode-link" data-action="go-menu">Mode Select</button>
      <div class="battle-brand-logo"><img src="${BATTLE_LOGO_PATH}" alt="Pokemon logo"></div>
      <div class="battle-streak-badge"><span class="label">Run</span><strong>${streak}</strong></div>
      </div>
      <div class="battle-desktop-shell">
        <div class="battle-center">
          <div class="battle-header"><div><div class="label">Battle Phase</div><h2>Arena Battle</h2></div><p>${state.message}</p></div>
          <section class="battle-shell"><div class="battle-stage">${renderCombatant(foeActive(), 'front', foeSide(), 'foe', foeTeamState())}<div class="battle-field" data-battle-attack-field><canvas class="battle-layer" data-battle-attack-layer></canvas></div><div class="battle-feed"><div class="feed-line">${latestFeed}</div></div>${renderCombatant(ownActive(), 'back', ownSide(), 'player', ownTeamState())}</div></section>
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
  if (state.phase === 'mode-setup') return renderModeSettingsStage();
  if (state.phase === 'draft') return renderDraftStage();
  if (state.phase === 'reroll') return renderRerollStage();
  if (state.phase === 'item-draft') return renderItemDraftStage();
  if (state.phase === 'item-assign') return renderItemAssignStage();
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
  const draftView = ['mode-setup', 'draft', 'reroll', 'item-draft', 'item-assign', 'link-setup', 'link-draft', 'preview', 'link-preview'].includes(state.phase);
  const previewFlowView = state.phase === 'preview' || state.phase === 'link-preview';
  if (menuView) {
    app.innerHTML = `<div class="app-shell menu-view theme-${state.generation}">
      <main class="main menu-main">${renderStage()}</main>
      ${renderInspectModal()}
      ${renderLeaveConfirmModal()}
    </div>`;
  } else if (draftView) {
    app.innerHTML = `<div class="app-shell draft-view ${previewFlowView ? 'preview-flow-view' : ''} theme-${state.generation}">
      <main class="main draft-main">${renderStage()}</main>
      ${renderInspectModal()}
      ${renderLeaveConfirmModal()}
    </div>`;
  } else {
    app.innerHTML = `<div class="app-shell ${battleView ? 'battle-view' : ''} theme-${state.generation}">
      <aside class="side"><a class="ghost-btn back" href="../index.html#games">Back to home</a><div class="brand"><div class="label">Pokemon Battler</div><h1>Kanto Link Arena</h1><p>Gen 1 sprites, level 100 stats, RBY rules, and Link Battles with a hidden draft.</p></div><div class="panel metrics"><span>Mode ${state.playMode === 'bot' ? 'Bot Run' : 'Link Battle'}</span><span>151 Pokemon</span><span>Best Run ${state.bestRun}</span></div>${renderSidePanel('Your Team', ownTeam, true)}${renderOpponentPanel()}</aside>
      <main class="main">${renderStage()}</main>
      <aside class="side"><div class="panel"><div class="label">Notes</div><div class="empty">Rules follow the active generation.</div></div><div class="panel"><div class="label">Log</div>${state.logs.map((line) => `<div class="log-line">${line}</div>`).join('')}</div></aside>
      ${renderInspectModal()}
      ${renderLeaveConfirmModal()}
    </div>`;
  }
  bindEvents();
  restorePreservedScrollers();
  if (battleView) window.scrollTo({top: 0, left: 0, behavior: 'auto'});
}

function nearestScrollableChild(container) {
  const children = Array.from(container.querySelectorAll('[data-carousel-option], button'));
  if (!children.length) return null;
  const containerRect = container.getBoundingClientRect();
  const center = containerRect.left + (containerRect.width / 2);
  let best = children[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const child of children) {
    const rect = child.getBoundingClientRect();
    const childCenter = rect.left + (rect.width / 2);
    const distance = Math.abs(childCenter - center);
    if (distance < bestDistance) {
      best = child;
      bestDistance = distance;
    }
  }
  return best;
}

function syncCarouselSelection(container) {
  const mode = container.dataset.carouselSelect;
  if (!mode) return;
  const focused = nearestScrollableChild(container);
  if (!focused) return;
  if (mode === 'member' && focused.dataset.itemAssignFocus) {
    const nextIndex = Number(focused.dataset.itemAssignFocus);
    if (nextIndex !== state.itemAssignFocusMember) {
      state.itemAssignFocusMember = nextIndex;
      render();
    }
    return;
  }
  if (mode === 'item' && focused.dataset.selectItem) {
    const nextKey = focused.dataset.selectItem;
    if (nextKey !== state.selectedDraftItem) {
      state.selectedDraftItem = nextKey;
      render();
    }
  }
}

function restorePreservedScrollers() {
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-preserve-scroll]').forEach((container) => {
      const key = container.dataset.preserveScroll;
      const left = state.uiScrollLefts[key];
      if (typeof left === 'number') container.scrollLeft = left;
    });
  });
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => handleAction(button.dataset.action)));
  document.querySelectorAll('[data-draft-id]').forEach((button) => button.addEventListener('click', () => draftSpecies(button.dataset.draftId)));
  document.querySelectorAll('[data-link-draft-id]').forEach((button) => button.addEventListener('click', () => pickLinkDraft(button.dataset.linkDraftId)));
  document.querySelectorAll('[data-reroll-member]').forEach((button) => button.addEventListener('click', () => rerollLoadoutMove(Number(button.dataset.rerollMember), Number(button.dataset.rerollMove))));
  document.querySelectorAll('[data-reroll-focus]').forEach((button) => button.addEventListener('click', () => setRerollFocus(Number(button.dataset.rerollFocus))));
  document.querySelectorAll('[data-item-pick]').forEach((button) => button.addEventListener('click', () => pickDraftItem(button.dataset.itemPick)));
  document.querySelectorAll('[data-select-item]').forEach((button) => button.addEventListener('click', () => selectDraftItem(button.dataset.selectItem)));
  document.querySelectorAll('[data-assign-item]').forEach((button) => button.addEventListener('click', () => assignDraftItem(button.dataset.assignItem)));
  document.querySelectorAll('[data-clear-item]').forEach((button) => button.addEventListener('click', () => clearAssignedItem(button.dataset.clearItem)));
  document.querySelectorAll('[data-item-assign-focus]').forEach((button) => button.addEventListener('click', () => setItemAssignFocus(Number(button.dataset.itemAssignFocus))));
  document.querySelectorAll('[data-move-index]').forEach((button) => button.addEventListener('click', () => movePreviewMon(Number(button.dataset.moveIndex), Number(button.dataset.moveDir))));
  document.querySelectorAll('[data-lead-index]').forEach((button) => button.addEventListener('click', () => setPreviewLead(Number(button.dataset.leadIndex))));
  document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => handleChoiceClick(button.dataset.choice, button.dataset.choiceKind || '', button.dataset.moveName || '')));
  document.querySelectorAll('[data-inspect]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    openInspect(button.dataset.inspect);
  }));
  document.querySelectorAll('[data-close-inspect]').forEach((button) => button.addEventListener('click', closeInspect));
  document.querySelectorAll('[data-close-leave]').forEach((button) => button.addEventListener('click', () => {
    state.leaveConfirmAction = '';
    render();
  }));
  document.getElementById('joinCodeInput')?.addEventListener('input', (event) => {
    const value = String(event.target.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    state.hostJoinCode = value;
    event.target.value = value;
  });
  document.querySelectorAll('[data-preserve-scroll]').forEach((container) => {
    const key = container.dataset.preserveScroll;
    let scrollTimer = 0;
    container.addEventListener('scroll', () => {
      state.uiScrollLefts[key] = container.scrollLeft;
      if (container.dataset.carouselSelect) {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => syncCarouselSelection(container), 90);
      }
    }, {passive: true});
  });
}

function resetBattleState() {
  clearBattleFeedNow();
  state.battle = null;
  state.playerRequest = null;
  state.pendingPlayerRequest = null;
  state.actionLocked = false;
  state.selectedChoice = '';
  state.battleAnimating = false;
  state.battleFinished = false;
  state.teamStates = {p1: [], p2: []};
  state.active = {p1: null, p2: null};
  state.lastMove = {p1: '', p2: ''};
  state.flash = {p1: '', p2: ''};
}

function resetDraftProgress() {
  resetBattleState();
  state.logs = [];
  state.draftedIds = new Set();
  state.pack = [];
  state.playerDraft = [];
  state.opponentDraft = [];
  state.playerLoadout = [];
  state.opponentLoadout = [];
  state.playerPreview = [];
  state.opponentPreview = [];
  state.rerollsLeft = 0;
  state.rerollFocusMember = 0;
  state.draftedItems = [];
  state.opponentDraftedItems = [];
  state.itemPack = [];
  state.itemDraftRound = 0;
  state.itemAssignments = {};
  state.selectedDraftItem = '';
  state.itemAssignFocusMember = 0;
  state.itemDraftSequence = 0;
}

function selectedMoveChoice(request = state.playerRequest) {
  if (!request || request.forceSwitch || !state.selectedChoice?.startsWith('move ')) return '';
  const slot = Number(state.selectedChoice.split(' ')[1]) - 1;
  const move = request.active?.[0]?.moves?.[slot];
  if (!move || move.disabled) return '';
  if (Number.isFinite(move.pp) && move.pp <= 0) return '';
  return state.selectedChoice;
}

function maybeSubmitHeldMove(request = state.playerRequest) {
  const choice = selectedMoveChoice(request);
  if (!choice) {
    if (state.selectedChoice) state.selectedChoice = '';
    return false;
  }
  if (state.actionLocked || state.battleAnimating || !state.playerRequest) return false;
  state.selectedChoice = '';
  submitChoice(choice);
  return true;
}

function applyPendingPlayerRequest() {
  if (!state.pendingPlayerRequest || state.battleFinished || state.battleAnimating) return false;
  state.playerRequest = state.pendingPlayerRequest;
  state.pendingPlayerRequest = null;
  updateTeamStateFromRequest(ownSide(), state.playerRequest);
  state.actionLocked = false;
  if (!maybeSubmitHeldMove(state.playerRequest)) render();
    scheduleBattleFeedClear(1500);
  return true;
}

function queuePlayerRequest(request) {
  state.pendingPlayerRequest = request;
  if (!state.battleAnimating) applyPendingPlayerRequest();
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
  resetDraftProgress();
  state.playMode = 'bot';
  state.phase = 'draft';
  state.logs = [];
  state.message = 'Pick your first Pokemon for the Bot Run.';
  state.runWins = 0;
  state.enemyNumber = 1;
  state.enemyName = '';
  state.pack = drawConfiguredPack(state.draftedIds, 3);
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
  if (state.playerDraft.length === currentTeamSize()) {
    state.playerLoadout = buildLoadoutFromDraft(state.playerDraft);
    startPostDraftFlow();
    return;
  }
  state.pack = drawConfiguredPack(state.draftedIds, 3);
  render();
}

function buildOpponentLoadout() {
  const excluded = new Set(state.playerDraft.map((member) => member.id));
  const source = shuffle(POKEMON_POOL.filter((member) => !excluded.has(member.id)));
  const team = [];
  let index = 0;
  while (team.length < currentTeamSize() && index < source.length) {
    const slice = source.slice(index, index + 6);
    const choice = pickOpponentDraft(slice, team, state.playerLoadout, dex);
    if (choice && !team.some((entry) => entry.id === choice.id)) team.push(choice);
    index += 6;
  }
  let loadout = team.map(createLoadout);
  loadout = autoUseRerolls(loadout);
  const itemPlan = autoDraftItemsForTeam(loadout);
  state.opponentDraftedItems = itemPlan.items;
  return applyAssignedItems(loadout, itemPlan.assignments);
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

function prepareLinkPreview(message = 'Your team is ready. Set the order you want to reveal when the Link Battle starts.') {
  resetBattleState();
  state.phase = 'link-preview';
  state.playerLoadout = applyAssignedItems(state.playerLoadout, state.itemAssignments);
  state.playerPreview = chooseTeamOrder(state.playerLoadout);
  state.message = message;
  render();
}

function beginItemDraftPhase() {
  state.phase = 'item-draft';
  state.itemDraftRound = Math.max(1, state.draftedItems.length + 1);
  state.itemPack = buildItemPack(new Set(state.draftedItems.map((entry) => entry.id)), 3, state.playerLoadout);
  state.message = 'Draft one held item from this round.';
  render();
}

function finishPostDraftFlow() {
  state.playerLoadout = applyAssignedItems(state.playerLoadout, state.itemAssignments);
  if (state.playMode === 'bot') return prepareNextEnemy('Your team is ready. Arrange your lead now.');
  return prepareLinkPreview();
}

function startPostDraftFlow() {
  state.rerollsLeft = currentRerollBudget();
  state.rerollFocusMember = 0;
  state.draftedItems = [];
  state.itemPack = [];
  state.itemDraftRound = 0;
  state.itemAssignments = {};
  state.selectedDraftItem = '';
  state.itemAssignFocusMember = 0;
  state.itemDraftSequence = 0;
  if (state.rerollsLeft > 0) {
    state.phase = 'reroll';
    state.message = 'Spend your attack rerolls across the drafted team.';
    return render();
  }
  if (itemDraftEnabled()) return beginItemDraftPhase();
  return finishPostDraftFlow();
}

function rerollLoadoutMove(memberIndex, moveIndex) {
  if (state.rerollsLeft <= 0) return;
  const member = state.playerLoadout[memberIndex];
  if (!member) return;
  const moves = rerollMove(member, member.set.moves, moveIndex, dex);
  state.playerLoadout[memberIndex] = createLoadout(member, {moves, item: member.set.item || ''});
  state.rerollsLeft -= 1;
  if (state.rerollsLeft <= 0) state.message = 'Rerolls spent. Continue to the next step.';
  render();
}

function setRerollFocus(memberIndex) {
  if (!state.playerLoadout.length) return;
  state.rerollFocusMember = Math.min(Math.max(0, memberIndex), state.playerLoadout.length - 1);
  render();
}

function pickDraftItem(itemId) {
  if (!state.itemPack.some((item) => item.id === itemId)) return;
  state.draftedItems.push(createDraftedItemEntry(itemId));
  state.itemDraftRound += 1;
  if (state.draftedItems.length >= currentTeamSize()) {
    state.phase = 'item-assign';
    state.selectedDraftItem = state.draftedItems[0]?.key || '';
    state.itemAssignFocusMember = 0;
    return render();
  }
  state.itemPack = buildItemPack(new Set(state.draftedItems.map((entry) => entry.id)), 3, state.playerLoadout);
  render();
}

function selectDraftItem(itemKey) {
  state.selectedDraftItem = state.selectedDraftItem === itemKey ? '' : itemKey;
  render();
}

function assignDraftItem(memberName) {
  if (!state.selectedDraftItem) return;
  for (const [name, itemKey] of Object.entries(state.itemAssignments)) {
    if (itemKey === state.selectedDraftItem) delete state.itemAssignments[name];
  }
  state.itemAssignments[memberName] = state.selectedDraftItem;
  state.selectedDraftItem = '';
  render();
}

function clearAssignedItem(memberName) {
  delete state.itemAssignments[memberName];
  render();
}

function setPreviewLead(index) {
  if (index <= 0 || index >= state.playerPreview.length) return;
  const [member] = state.playerPreview.splice(index, 1);
  state.playerPreview.unshift(member);
  render();
}

function movePreviewMon(index, direction) {
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= state.playerPreview.length) return;
  [state.playerPreview[index], state.playerPreview[swapIndex]] = [state.playerPreview[swapIndex], state.playerPreview[index]];
  render();
}

function setItemAssignFocus(index) {
  state.itemAssignFocusMember = Math.min(Math.max(0, index), Math.max(0, state.playerLoadout.length - 1));
  render();
}

function leaveRoomPhases() {
  return new Set(['link-draft', 'reroll', 'item-draft', 'item-assign', 'link-preview', 'battle']);
}

function shouldConfirmLeaveRoom(action) {
  if (action !== 'go-menu') return false;
  if (state.playMode !== 'link') return false;
  if (!leaveRoomPhases().has(state.phase)) return false;
  return Boolean(state.link.connected || state.link.peerId || state.link.conn || state.link.peer);
}

function openLeaveConfirm(action) {
  state.leaveConfirmAction = action;
  render();
}

function returnToLinkSetupAfterDisconnect(alert, status = 'Connection closed.') {
  resetDraftProgress();
  resetBattleState();
  state.playMode = 'link';
  state.pendingMode = 'link';
  state.phase = 'link-setup';
  state.hostJoinCode = '';
  state.message = 'Choose whether to host a room or join one.';
  state.link = freshLinkState();
  state.link.status = status;
  state.link.alert = alert;
  render();
}

function leaveToMenu() {
  teardownLink(true);
  state.playMode = 'bot';
  state.phase = 'menu';
  state.message = 'Choose Bot Run or Link Battle.';
  resetBattleState();
  render();
}

function handleAction(action) {
  if (action === 'cancel-leave-room') {
    state.leaveConfirmAction = '';
    return render();
  }
  if (action === 'confirm-leave-room') {
    const nextAction = state.leaveConfirmAction;
    state.leaveConfirmAction = '';
    if (nextAction === 'go-menu') return leaveToMenu();
    if (nextAction) return handleAction(nextAction);
    return render();
  }
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
  if (action === 'start-link') {
    teardownLink();
    state.playMode = 'link';
    state.pendingMode = 'link';
    state.hostJoinCode = '';
    state.link = freshLinkState();
    state.phase = 'link-setup';
    state.message = 'Choose whether to host a room or join one.';
    return render();
  }
  if (action === 'start-bot') {
    state.pendingMode = 'bot';
    state.phase = 'mode-setup';
    state.message = 'Set the draft rules before the run starts.';
    return render();
  }
  if (action === 'mode-attack-fixed') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, attackMode: 'fixed'});
    return render();
  }
  if (action === 'mode-attack-randomized') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, attackMode: 'randomized'});
    return render();
  }
  if (action === 'mode-reroll-off') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, attackReroll: false});
    return render();
  }
  if (action === 'mode-reroll-on') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, attackReroll: true, rerollCount: 3});
    return render();
  }
  if (action === 'mode-reroll-minus') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, attackReroll: true, rerollCount: normalizedModeSettings().rerollCount - 1});
    return render();
  }
  if (action === 'mode-reroll-plus') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, attackReroll: true, rerollCount: normalizedModeSettings().rerollCount + 1});
    return render();
  }
  if (action === 'mode-team-3' || action === 'mode-team-6') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, teamSize: action === 'mode-team-6' ? 6 : 3});
    return render();
  }
  if (action === 'mode-items-off' || action === 'mode-items-on') {
    state.modeSettings = normalizedModeSettings({...state.modeSettings, itemDraft: action === 'mode-items-on'});
    return render();
  }
  if (action === 'confirm-mode-settings') {
    if (state.pendingMode === 'link') {
      state.playMode = 'link';
      state.pendingMode = '';
      state.phase = 'link-setup';
      state.message = 'Opening the private room.';
      if (state.link.setupIntent === 'host') {
        render();
        return startHosting();
      }
      state.message = 'Open a room or join one.';
      return render();
    }
    return resetDraft();
  }
  if (action === 'start-battle') return startBotBattle();
  if (action === 'retry-bot') return resetDraft();
  if (action === 'finish-rerolls') {
    if (itemDraftEnabled()) return beginItemDraftPhase();
    return finishPostDraftFlow();
  }
  if (action === 'finish-item-assign') return finishPostDraftFlow();
  if (action === 'host-link') {
    state.playMode = 'link';
    state.pendingMode = 'link';
    state.link.setupIntent = 'host';
    state.phase = 'mode-setup';
    state.message = 'Set the draft rules for the hosted room.';
    return render();
  }
  if (action === 'join-link') return joinHost();
  if (action === 'ready-link-battle') return readyLinkBattle();
  if (action === 'link-rematch') return beginLinkRematch(true);
  if (action === 'go-menu') {
    if (shouldConfirmLeaveRoom(action)) return openLeaveConfirm(action);
    return leaveToMenu();
  }
}

function teardownLink(suppressNotice = false) {
  clearLinkLobbyExpiryTimer();
  if (state.link.conn) state.link.conn.__suppressCloseNotice = suppressNotice;
  state.link.conn?.close?.();
  state.link.peer?.destroy?.();
  state.link = freshLinkState();
}

function sendLinkMessage(message) {
  if (state.link.conn?.open) state.link.conn.send(message);
}

async function waitForLinkBattleSceneReady(attempts = 18) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sceneReady = state.phase === 'battle'
      && (state.teamStates.p1.length > 0 || state.teamStates.p2.length > 0)
      && document.querySelector('.battle-stage')
      && document.querySelector('.combatant-player .sprite.battle')
      && document.querySelector('.combatant-foe .sprite.battle');
    if (sceneReady) return true;
    await nextPaint();
  }
  return false;
}

function clearLinkLobbyExpiryTimer() {
  if (state.link.lobbyExpiryTimer) {
    window.clearTimeout(state.link.lobbyExpiryTimer);
    state.link.lobbyExpiryTimer = 0;
  }
}

function scheduleHostLobbyExpiry() {
  clearLinkLobbyExpiryTimer();
  state.link.lobbyExpiryTimer = window.setTimeout(() => {
    const isStillWaitingRoom = state.playMode === 'link'
      && state.phase === 'link-setup'
      && state.link.role === 'host'
      && Boolean(state.link.peerId)
      && !state.link.connected;
    if (!isStillWaitingRoom) return;
    teardownLink(true);
    state.playMode = 'link';
    state.pendingMode = 'link';
    state.phase = 'link-setup';
    state.message = 'Choose whether to host a room or join one.';
    state.link = freshLinkState();
    state.link.status = 'No connection yet.';
    state.link.alert = 'Room expired.';
    render();
  }, HOST_ROOM_EXPIRY_MS);
}

function queueLinkBattleChunk(chunk) {
  state.link.battleChunkChain = (state.link.battleChunkChain || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await waitForLinkBattleSceneReady();
      return animateBattleChunk(chunk);
    });
  return state.link.battleChunkChain;
}

function setupLinkDraft() {
  resetDraftProgress();
  state.playMode = 'link';
  state.phase = 'link-draft';
  state.link.status = 'Connection ready. Draft locally and keep your picks hidden until battle.';
  state.link.draftRound = 1;
  state.link.localPack = drawConfiguredPack(state.draftedIds, 3);
  state.link.localReady = false;
  state.link.remoteReady = false;
  state.link.remoteRoster = null;
  state.message = 'Pick your first Pokemon for the Link Battle.';
  render();
}

function pickLinkDraft(id) {
  const picked = state.link.localPack.find((member) => member.id === id);
  if (!picked) return;
  state.playerDraft.push(picked);
  state.draftedIds.add(picked.id);
  if (state.playerDraft.length >= currentTeamSize()) {
    state.playerLoadout = buildLoadoutFromDraft(state.playerDraft);
    return startPostDraftFlow();
  }
  state.link.draftRound = state.playerDraft.length + 1;
  state.link.localPack = drawConfiguredPack(state.draftedIds, 3);
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
  state.playMode = 'link';
  state.phase = 'link-setup';
  state.link.status = 'Opening room...';
  const openRoom = (attempt = 0) => {
    const code = generateLobbyCode();
    const peer = new Peer(code);
    state.link.peer = peer;
    peer.on('open', () => {
      state.link.peerId = code;
      state.link.status = 'Room open for 10 minutes. Share the host code.';
      scheduleHostLobbyExpiry();
      render();
    });
    peer.on('error', (error) => {
      if (error?.type === 'unavailable-id' && attempt < 8) {
        peer.destroy?.();
        return openRoom(attempt + 1);
      }
      state.link.status = 'Room could not be opened. Try again.';
      render();
    });
    peer.on('connection', (conn) => {
      if (state.link.connected || state.link.conn?.open) {
        conn.on('open', () => conn.close());
        return;
      }
      attachConnection(conn, 'host');
    });
  };
  openRoom();
  render();
}

function joinHost() {
  const code = String(state.hostJoinCode || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  state.hostJoinCode = code;
  if (code.length !== 5) {
    state.link.status = 'Enter the full 5-letter host code.';
    return render();
  }
  teardownLink();
  state.link = freshLinkState();
  state.link.role = 'guest';
  state.playMode = 'link';
  state.phase = 'link-setup';
  state.link.status = 'Connecting to the host room...';
  const peer = new Peer();
  state.link.peer = peer;
  peer.on('open', () => attachConnection(peer.connect(code, {reliable: true}), 'guest'));
  peer.on('error', () => {
    state.link.status = 'Connection failed. Check the host code and try again.';
    render();
  });
  render();
}

function attachConnection(conn, role) {
  state.link.conn = conn;
  state.link.role = role;
  conn.on('open', () => {
    clearLinkLobbyExpiryTimer();
    state.link.connected = true;
    state.link.status = role === 'host' ? 'Player connected. Starting the shared draft flow.' : 'Connected. Syncing the host rules.';
    sendLinkMessage({type: 'hello', name: 'Opponent'});
    if (role === 'host') {
      sendLinkMessage({type: 'link-settings', settings: normalizedModeSettings()});
      setupLinkDraft();
    }
    render();
  });
  conn.on('data', handleLinkMessage);
  conn.on('close', () => {
    if (conn.__suppressCloseNotice) return;
    state.link.connected = false;
    returnToLinkSetupAfterDisconnect('Enemy left.');
  });
}

function handleLinkMessage(message) {
  if (message.type === 'hello') {
    state.link.status = 'Connection ready.';
    state.link.remoteName = message.name || 'Opponent';
  }
  if (message.type === 'link-settings') {
    state.modeSettings = normalizedModeSettings(message.settings || DEFAULT_MODE_SETTINGS);
    state.link.status = 'Connection ready. Host rules synced. Draft starting now.';
    if (state.link.role === 'guest') setupLinkDraft();
  }
  if (message.type === 'battle-ready') {
    state.link.remoteReady = true;
    state.link.remoteRoster = message.roster;
    if (state.phase === 'link-preview' && !state.link.localReady) state.message = 'The other player is ready. Start battle when your order is set.';
    maybeStartHostedBattle();
  }
  if (message.type === 'battle-start') {
    state.phase = 'battle';
    state.link.localSide = message.localSide;
    initialiseTeamStates(message.p1Roster, message.p2Roster);
    render();
  }
  if (message.type === 'battle-request') {
    queuePlayerRequest(message.request);
  }
  if (message.type === 'battle-choice' && state.link.role === 'host' && state.battle) state.battle.streams.p2.write(message.choice);
  if (message.type === 'battle-chunk') void queueLinkBattleChunk(message.chunk);
  if (message.type === 'link-rematch') beginLinkRematch(false);
  render();
}

function readyLinkBattle() {
  if (!state.link.connected || state.link.localReady) return;
  state.link.localReady = true;
  state.message = 'Waiting for player...';
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
  void ensureAttackAnimationAssets();
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  state.battle = {streams, multiplayer};

  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('|request|')) continue;
        const request = JSON.parse(line.slice(9));
        if (ownSide() === 'p1') {
          queuePlayerRequest(request);
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
  state.active[sideKey] = state.teamStates[sideKey].find((member) => member.active && !member.condition?.endsWith(' fnt')) || null;
}

function updateRosterState(sideKey, name, updater) {
  const target = state.teamStates[sideKey].find((member) => member.name === name);
  if (target) updater(target, state.teamStates[sideKey]);
  state.active[sideKey] = state.teamStates[sideKey].find((member) => member.active && !member.condition?.endsWith(' fnt')) || null;
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

function battleTagValue(parts, prefix) {
  const tag = parts.find((part) => typeof part === 'string' && part.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : '';
}

function battleText(parts) {
  const type = parts[1];
  const actor = parts[2]?.includes(': ') ? parts[2].split(': ').pop() : parts[2];
  const fromItem = battleTagValue(parts, '[from] item: ');
  if (type === 'move') return `${parts[2].split(': ').pop()} used ${parts[3]}.`;
  if (type === '-miss') return `${parts[2].split(': ').pop()} missed.`;
  if (type === '-supereffective') return "It's super effective.";
  if (type === '-resisted') return "It's not very effective.";
  if (type === '-crit') return 'A critical hit.';
  if (type === 'switch') return `${parts[2].split(': ').pop()} entered the battle.`;
  if (type === 'faint') return `${parts[2].split(': ').pop()} fainted.`;
  if (type === '-heal' && fromItem) {
    if (fromItem === 'Leftovers') return `${actor} restored a little HP using its Leftovers.`;
    if (fromItem === 'Black Sludge') return `${actor} restored HP using its Black Sludge.`;
    if (fromItem === 'Sitrus Berry') return `${actor} restored HP using its Sitrus Berry.`;
    return `${actor} restored HP using ${fromItem}.`;
  }
  if (type === '-damage' && fromItem) {
    if (fromItem === 'Life Orb') return `${actor} is hurt by its Life Orb.`;
    if (fromItem === 'Black Sludge') return `${actor} is hurt by the Black Sludge.`;
    return `${actor} is hurt by ${fromItem}.`;
  }
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
  if (type === '-item') {
    if (parts[3] === 'Air Balloon') return `${actor} floats with an Air Balloon.`;
    return `${parts[2].split(': ').pop()} uses ${parts[3]}.`;
  }
  if (type === '-enditem') return `${parts[2].split(': ').pop()} consumed its ${parts[3]}.`;
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

async function handleBattleLine(line, shouldAnimate = false) {
  if (!line.startsWith('|')) return 0;
  const parts = line.split('|');
  const type = parts[1];
  const fromItem = battleTagValue(parts, '[from] item: ');
  const text = battleText(parts);
  if (text) {
    pushBattleFeed(text);
    logLine(text);
  }
  if (type === 'move') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    state.lastMove[sideKey] = parts[3];
    render();
    await nextPaint();
    if (shouldAnimate) await playBattleMoveAnimation(parts[3], sideKey);
    return shouldAnimate ? 260 : 520;
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
    return 800;
  }
  if (type === '-damage' || type === '-heal') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => {
      target.condition = parts[3];
      target.status = statusFromCondition(parts[3]) || target.status || '';
    });
    flashSide(sideKey, type === '-damage' ? 'flash-hit' : 'flash-heal');
    return fromItem ? 760 : 980;
  }
  if (type === '-status' || type === '-curestatus' || type === '-clearstatus') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => { target.status = type === '-status' ? parts[3] : ''; });
    return 860;
  }
  if (type === 'faint') {
    const sideKey = parts[2].startsWith('p1') ? 'p1' : 'p2';
    updateRosterState(sideKey, parts[2].split(': ').pop(), (target) => {
      target.condition = '0 fnt';
      target.status = 'fainted';
      target.active = false;
    });
    flashSide(sideKey, 'flash-faint');
    return 1150;
  }
  if (type === 'turn') {
    state.message = `Turn ${parts[2]}.`;
    return 700;
  }
  if (type === 'win') {
    void finishBattle(parts[2]);
    return 1200;
  }
  if (text) {
    if (type === '-boost' || type === '-unboost' || type === '-setboost') return 760;
    if (type === '-item' || type === '-enditem') return 780;
    if (type === '-immune' || type === '-fail' || type === '-mustrecharge') return 820;
    return 900;
  }
  return 0;
}

async function animateBattleChunk(chunk) {
  state.battleAnimating = true;
  const lines = chunk.split('\n').filter(Boolean);
  const animationPlan = planBattleAnimations(lines);
  for (let index = 0; index < lines.length; index += 1) {
    const delay = await handleBattleLine(lines[index], animationPlan[index]);
    render();
    const endsAtNextTurnWithQueuedRequest = index === lines.length - 1 && lines[index].startsWith('|turn|') && state.pendingPlayerRequest;
    if (delay && !endsAtNextTurnWithQueuedRequest) {
      const acceleratedDelay = state.pendingPlayerRequest ? Math.max(420, Math.round(delay * 0.82)) : delay;
      await sleep(acceleratedDelay);
    }
  }
  state.battleAnimating = false;
  scheduleBattleFeedClear();
  applyPendingPlayerRequest();
}

async function finishBattle(winner) {
  if (state.battleFinished) return;
  state.battleFinished = true;
  state.playerRequest = null;
  state.pendingPlayerRequest = null;
  state.actionLocked = true;
  state.selectedChoice = '';
  state.battleAnimating = false;
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
  if (!state.playerRequest || state.actionLocked || state.battleAnimating || state.pendingPlayerRequest) return;
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
    html{
      -webkit-text-size-adjust:100%;
      text-size-adjust:100%;
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
    .ghost-btn,.mini-btn{
      background:rgba(255,255,255,.14);
      color:var(--text);
    }
    .lead-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:46px;
      min-height:32px;
      padding:8px 12px;
      border:none;
      border-radius:999px;
      background:linear-gradient(180deg,rgba(242,217,123,.96),rgba(198,165,72,.92));
      color:var(--ink);
      cursor:pointer;
      font-size:.78rem;
      font-weight:700;
      letter-spacing:.02em;
      transition:transform .14s ease, background .14s ease, color .14s ease;
      box-shadow:inset 0 0 0 1px rgba(116,92,32,.14),0 6px 16px rgba(0,0,0,.12);
    }
    .lead-chip:hover:not(:disabled){
      transform:translateY(-1px);
      background:linear-gradient(180deg,#f6e28d,#d2ae52);
    }
    .lead-chip:disabled{
      opacity:.42;
      cursor:default;
      transform:none;
    }
    .info-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:46px;
      min-height:32px;
      padding:8px 12px;
      border-radius:999px;
      background:rgba(18,29,22,.82);
      color:#f7f3e8;
      font-size:.78rem;
      font-weight:700;
      letter-spacing:.02em;
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), 0 6px 16px rgba(0,0,0,.12);
    }
    .info-chip:hover{
      background:rgba(42,66,52,.96);
      color:#fffdf7;
      box-shadow:inset 0 0 0 1px rgba(196,230,255,.48), 0 0 0 3px rgba(126,188,255,.18), 0 10px 20px rgba(0,0,0,.16);
    }
    .primary-btn,.choice-btn{
      background:linear-gradient(180deg,#f2d97b,#c6a548);
      color:var(--ink);
      font-weight:700;
    }
    .primary-btn.link-ready-armed{
      background:linear-gradient(180deg,#7fe0b5,#3c9f73);
      color:#10241a;
      box-shadow:0 0 0 2px rgba(127,224,181,.22), 0 14px 28px rgba(0,0,0,.16);
      opacity:1;
    }
    .primary-btn.link-ready-armed:disabled{
      opacity:1;
      cursor:default;
      filter:none;
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
    .type-badge,
    .move-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:0;
      background:var(--type-bg) !important;
      color:var(--type-fg) !important;
      border:1px solid rgba(0,0,0,.14);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.18);
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
    .link-setup-shell,.link-preview-shell{
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
    .link-setup-hero,.link-setup-grid,.link-preview-main{
      display:grid;
      gap:12px;
    }
    .link-setup-hero{
      grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);
    }
    .link-setup-copy,.link-setup-stage-card,.link-setup-card{
      border:1px solid var(--line);
      border-radius:28px;
      background:linear-gradient(180deg,rgba(21,31,24,.94),rgba(16,25,20,.9));
      box-shadow:0 28px 80px rgba(0,0,0,.22);
      padding:18px;
      display:grid;
      gap:14px;
      min-height:0;
    }
    .link-setup-copy{
      align-content:start;
    }
    .link-setup-copy h2,.link-setup-card h3{
      margin:0;
    }
    .link-setup-copy h2{
      font-size:clamp(2.4rem,4.5vw,4rem);
      line-height:.95;
      letter-spacing:-.03em;
    }
    .link-setup-copy p,.link-setup-card p,.link-card-note,.link-setup-step div{
      margin:0;
      color:var(--muted);
      line-height:1.5;
    }
    .link-setup-stage-card{
      align-content:start;
    }
    .link-setup-step-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
    }
    .link-setup-step{
      display:grid;
      gap:8px;
      padding:12px;
      border-radius:18px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
    }
    .link-setup-step span{
      width:30px;
      height:30px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:linear-gradient(180deg,var(--menu-accent-soft),var(--menu-accent));
      color:#16211a;
      font-weight:800;
      box-shadow:0 10px 24px var(--menu-glow);
    }
    .link-setup-step strong{
      color:var(--text);
      line-height:1.1;
    }
    .link-setup-grid{
      grid-template-columns:repeat(2,minmax(0,1fr));
      align-items:stretch;
    }
    .link-setup-card .primary-btn{
      justify-self:start;
    }
    .link-code-box{
      min-height:64px;
      display:grid;
      place-items:center;
      font-size:1rem;
      font-weight:700;
      letter-spacing:.01em;
    }
    .link-setup-actions{
      justify-content:flex-start;
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
    .preview-card-list{
      grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    }
    .preview-status-stack{
      grid-template-columns:1fr;
    }
    .preview-order-note{
      max-width:340px;
      padding:8px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
      text-align:right;
    }
    .link-preview-hero{
      grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);
    }
    .link-preview-main{
      grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);
      align-items:start;
    }
    .link-preview-order-panel,.link-preview-ready-panel{
      min-height:0;
    }
    .link-preview-ready-panel{
      align-content:start;
    }
    .link-preview-ready-notes{
      display:grid;
      gap:10px;
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
      justify-content:flex-end;
      gap:14px;
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
    .menu-stage-card-foe span{
      font-size:.78rem;
      line-height:1.15;
      opacity:.82;
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
        linear-gradient(180deg,#11172f 0%,#11172f 53%,#202750 53%,#202750 100%);
    }
    .menu-showcase-gen5 .menu-stage-line-top{background:rgba(173,227,255,.2)}
    .menu-showcase-gen5 .menu-stage-line-bottom{
      background:rgba(17,23,47,.88);
      border-color:rgba(154,229,255,.22);
      box-shadow:inset 0 0 0 2px rgba(154,229,255,.08);
    }
    .menu-showcase-gen5 .menu-stage-card{
      background:rgba(11,19,42,.9);
      border-color:rgba(113,219,255,.35);
      color:#edf7ff;
    }
    .menu-showcase-gen5 .menu-mon-placeholder{
      background:rgba(255,255,255,.04);
      border:1px dashed rgba(154,229,255,.22);
      color:rgba(237,247,255,.38);
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
      text-transform:none;
      letter-spacing:.02em;
      font-weight:600;
    }
    .menu-lower{
      display:grid;
      grid-template-columns:minmax(0,1.35fr) minmax(280px,.92fr);
      gap:16px;
      align-items:start;
    }
    .menu-legal-note{
      display:grid;
      gap:8px;
      padding:14px 18px;
      border-radius:22px;
      border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025));
      box-shadow:0 18px 36px rgba(0,0,0,.14);
    }
    .menu-legal-note p{
      margin:0;
      color:var(--muted);
      font-size:.82rem;
      line-height:1.5;
    }
    .menu-project-note{
      padding:8px 10px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:var(--muted);
      font-size:.74rem;
      line-height:1.4;
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
      gap:2px;
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
      gap:4px;
      min-width:0;
    }
    .battle-brand-logo{
      position:absolute;
      top:-2px;
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
    .team-size-6 .battle-stage{
      height:clamp(320px,23vw,380px);
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
    .battle-field{
      position:absolute;
      inset:0;
      z-index:3;
      pointer-events:none;
    }
    .battle-layer{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
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
      z-index:6;
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
      position:relative;
      padding:2% 2.35%;
      border:3px solid #151d11;
      border-radius:8px;
      background:#f8f5e8;
      color:#1e2b14;
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);
      pointer-events:auto;
      z-index:5;
    }
    .battle-status-shell{
      position:absolute;
      display:flex;
      flex-direction:column;
      align-items:stretch;
      gap:7px;
      z-index:5;
      pointer-events:none;
    }
    .battle-status-shell > *{
      pointer-events:auto;
    }
    .battle-status-shell-foe{
      top:var(--battle-pad-top);
      left:var(--battle-pad-x);
      width:clamp(152px,25%,186px);
      max-width:none;
    }
    .battle-status-shell-player{
      right:var(--battle-pad-x);
      bottom:calc(var(--battle-player-line) + 1.5%);
      width:clamp(168px,27%,208px);
      max-width:none;
    }
    .battle-status-foe,
    .battle-status-player{
      width:100%;
      max-width:none;
    }
    .battle-status-top,.battle-hp-row{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }
    .battle-status-top{
      position:relative;
      align-items:flex-start;
    }
    .battle-status-name{
      display:grid;
      gap:2px;
      min-width:0;
      flex:1 1 auto;
    }
    .battle-status-name-row{
      display:flex;
      align-items:center;
      gap:6px;
      min-width:0;
    }
    .battle-status .info-chip{
      position:relative;
      z-index:2;
      min-width:36px;
      min-height:22px;
      padding:4px 7px;
      font-size:.56rem;
      letter-spacing:.04em;
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.1), 0 8px 18px rgba(0,0,0,.16);
    }
    .battle-status .info-chip:hover{
      transform:translateY(-1px);
    }
    .battle-status-name-row strong{
      flex:1 1 auto;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .battle-status-meta{
      display:grid;
      grid-auto-flow:column;
      justify-content:start;
      align-items:center;
      gap:6px;
      margin-top:3px;
      color:#4d5b41;
      font-size:.77rem;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .battle-hp-row{margin-top:6px}
    .battle-ball-row{
      display:flex;
      gap:5px;
      align-items:center;
    }
    .battle-ball-row-player{
      justify-content:flex-end;
      margin-bottom:0;
    }
    .battle-ball-row-foe{
      justify-content:flex-start;
      margin-top:0;
    }
    .battle-status-info{
      position:relative !important;
      top:auto;
      right:auto;
      flex:0 0 auto;
      border-radius:999px;
    }
    .battle-ball{
      width:14px;
      height:14px;
      display:grid;
      place-items:center;
      filter:drop-shadow(0 1px 0 rgba(0,0,0,.18));
    }
    .battle-ball img{
      width:100%;
      height:100%;
      display:block;
      image-rendering:pixelated;
    }
    .battle-ball.fainted{
      opacity:.42;
      filter:grayscale(1) brightness(.72);
    }
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
      z-index:2;
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
    .team-size-6 .battle-footer{
      align-items:start;
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
    .bench-card-switch-note{
      font-size:.7rem;
      line-height:1.15;
      color:rgba(24,34,25,.74);
      font-weight:700;
    }
    .bench-card-actionable{
      cursor:pointer;
      box-shadow:inset 0 0 0 999px rgba(255,255,255,.18),0 12px 22px rgba(0,0,0,.12);
      transition:transform .14s ease, box-shadow .14s ease;
    }
    .bench-card-actionable:hover{
      transform:translateY(-1px);
      box-shadow:inset 0 0 0 999px rgba(255,255,255,.22),0 14px 24px rgba(0,0,0,.16);
    }
    .bench-card-fainted{
      position:relative;
      background:
        linear-gradient(180deg,rgba(49,28,30,.9),rgba(27,18,20,.94)) !important;
      border-color:rgba(221,115,115,.42);
      box-shadow:inset 0 0 0 999px rgba(33,18,20,.42), 0 12px 24px rgba(0,0,0,.14);
    }
    .bench-card-fainted::after{
      content:"";
      position:absolute;
      inset:0;
      border-radius:inherit;
      background:
        linear-gradient(135deg,transparent 44%,rgba(255,255,255,.08) 44%,rgba(255,255,255,.08) 48%,transparent 48%,transparent 52%,rgba(255,255,255,.08) 52%,rgba(255,255,255,.08) 56%,transparent 56%);
      pointer-events:none;
    }
    .bench-card-fainted .bench-card-sprite{
      filter:grayscale(1) brightness(.78) contrast(1.05);
      opacity:.82;
    }
    .bench-card-fainted strong,
    .bench-card-fainted .tiny,
    .bench-card-fainted .bench-card-switch-note{
      color:#f6d7d7 !important;
    }
    .bench-card-fainted .bench-card-switch-note{
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .battle-panel .bench-card strong{
      font-size:.9rem;
      line-height:1.1;
    }
    .battle-panel .bench-card .tiny{
      font-size:.76rem;
      line-height:1.15;
    }
    .battle-panel .bench-card .bench-card-switch-note{
      font-size:.7rem;
      line-height:1.15;
    }
    .battle-panel .bench-card .info-chip{
      justify-self:end;
      position:relative;
      z-index:3;
      min-width:56px;
      min-height:36px;
      padding:9px 14px;
      font-size:.72rem;
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.1), 0 8px 18px rgba(0,0,0,.14);
    }
    .team-size-6 .battle-panel .bench-grid{
      display:flex;
      gap:6px;
      overflow-x:auto;
      overflow-y:hidden;
      padding-bottom:2px;
    }
    .team-size-6 .battle-panel .bench-grid::-webkit-scrollbar{display:none}
    .team-size-6 .battle-panel .bench-card{
      flex:0 0 19%;
      min-height:84px;
      padding:8px;
    }
    .team-size-6 .battle-panel .bench-card-switch{
      grid-template-columns:1fr;
      justify-items:center;
      text-align:center;
      gap:4px;
    }
    .team-size-6 .battle-panel .bench-card-copy{
      justify-items:center;
    }
    .team-size-6 .battle-panel .bench-card .tiny,
    .team-size-6 .battle-panel .bench-card .bench-card-switch-note{
      display:none;
    }
    .team-size-6 .battle-panel .bench-card strong{
      font-size:.76rem;
    }
    .team-size-6 .battle-panel .bench-card .info-chip{
      justify-self:center;
      min-width:48px;
      min-height:30px;
      padding:6px 10px;
      font-size:.62rem;
    }
    .team-size-6 .battle-panel .sprite.sm{
      width:42px;
      height:42px;
    }
    .battle-choice-note{
      align-content:center;
      min-height:72px;
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
    .choice-btn-move{
      background:
        linear-gradient(180deg,color-mix(in srgb,var(--choice-type-bg) 92%, #ffffff 8%),color-mix(in srgb,var(--choice-type-bg) 76%, #2a2e25 24%));
      color:var(--choice-type-fg);
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.14), 0 10px 18px rgba(0,0,0,.12);
    }
    .choice-btn-name{
      color:var(--choice-type-fg);
      font-size:.92rem;
      line-height:1.05;
    }
    .choice-btn span{
      color:rgba(30,43,20,.76);
      font-size:.74rem;
      font-weight:700;
      white-space:nowrap;
    }
    .choice-btn-pp{
      color:color-mix(in srgb,var(--choice-type-fg) 78%, #263224 22%);
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
    .choice-btn.selected .choice-btn-name,
    .choice-btn.selected .choice-btn-pp{
      color:#dbeaff;
    }
    .choice-btn.alt.selected{
      border-color:transparent;
      background:linear-gradient(180deg,#cfdfab,#8ca85b);
      color:var(--ink);
    }
    .choice-btn:disabled{
      opacity:.62;
    }
    .choice-btn-move:disabled{
      filter:grayscale(.22) saturate(.7);
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
    .leave-confirm-modal{
      width:min(460px,100%);
      max-height:none;
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
    .leave-confirm-body{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
      overflow:visible;
      padding-right:0;
    }
    .leave-confirm-body p{
      margin:0;
      color:var(--text);
      line-height:1.5;
    }
    .leave-confirm-actions{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }
    .link-setup-alert{
      text-align:center;
      color:#ff8b8b;
      font-weight:700;
      font-size:clamp(1rem,2vw,1.3rem);
      letter-spacing:.02em;
      padding:6px 12px 2px;
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
    .inspect-move-column{
      display:grid;
      gap:12px;
      align-content:start;
      min-width:0;
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
    .inspect-move-tags .type-badge{
      background:var(--type-bg);
      color:var(--type-fg);
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
    .mode-settings-shell,.mode-settings-grid,.mode-settings-notes,.reroll-grid,.item-pool-strip,.item-assign-list,.mode-settings-summary-list{
      display:grid;
      gap:14px;
    }
    .mode-settings-desktop{
      display:block;
    }
    .mode-settings-mobile{
      display:none;
    }
    .mode-settings-grid{
      grid-template-columns:repeat(2,minmax(0,1fr));
    }
    .mode-settings-hero{
      grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);
      align-items:stretch;
    }
    .mode-settings-card,.mode-settings-note,.item-draft-card,.reroll-card,.item-assign-card{
      padding:16px;
      border-radius:22px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.05);
    }
    .mode-settings-summary{
      display:grid;
      gap:12px;
      padding:18px;
      border-radius:22px;
      border:1px solid var(--line);
      background:linear-gradient(180deg,rgba(28,40,31,.94),rgba(19,28,22,.9));
    }
    .mode-settings-summary-list div{
      display:grid;
      gap:4px;
      padding:10px 12px;
      border-radius:16px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.06);
    }
    .mode-settings-summary-list span{
      color:var(--muted);
      font-size:.72rem;
      font-weight:700;
      letter-spacing:.06em;
      text-transform:uppercase;
    }
    .mode-settings-summary-note{
      font-size:.82rem;
      line-height:1.4;
      color:var(--muted);
    }
    .item-draft-head,.item-info-head,.inspect-held-item-head{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
    }
    .item-icon{
      width:28px;
      height:28px;
      object-fit:contain;
      image-rendering:pixelated;
      flex:0 0 auto;
      filter:drop-shadow(0 4px 10px rgba(0,0,0,.16));
    }
    .item-icon.small{
      width:20px;
      height:20px;
    }
    .item-icon-fallback{
      display:inline-grid;
      width:28px;
      height:28px;
      border-radius:8px;
      background:rgba(255,255,255,.12);
    }
    .mode-settings-card,.item-draft-card,.mode-settings-note{
      display:grid;
      gap:12px;
    }
    .mode-settings-row{
      display:grid;
      gap:10px;
      padding:12px;
      border-radius:18px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.08);
    }
    .mode-settings-row-copy{
      display:grid;
      gap:6px;
    }
    .mode-settings-row-copy h3{
      margin:0;
      font-size:1.05rem;
    }
    .mode-settings-row-copy p{
      margin:0;
      color:var(--muted);
      font-size:.8rem;
      line-height:1.35;
    }
    .mode-settings-card h3,.item-draft-card h3,.mode-settings-note strong{
      margin:0;
    }
    .mode-settings-toggle-row{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }
    .mode-settings-toggle-row.reroll-toggle-row{
      grid-template-columns:repeat(2,minmax(0,1fr)) auto;
      align-items:center;
    }
    .mode-settings-counter{
      display:flex;
      align-items:center;
      justify-content:flex-end;
      gap:8px;
      min-height:38px;
      min-width:0;
    }
    .reroll-toggle-row .mode-settings-counter{
      grid-column:auto;
    }
    .mode-settings-counter span{
      min-width:42px;
      text-align:center;
      padding:6px 8px;
      border-radius:12px;
      background:rgba(255,255,255,.08);
      color:var(--text);
      font-weight:800;
    }
    .mode-settings-counter.disabled{
      opacity:.62;
    }
    .mode-settings-counter.disabled span{
      background:rgba(255,255,255,.04);
      color:rgba(238,243,232,.68);
    }
    .mode-settings-counter .mini-btn[disabled]{
      opacity:.45;
      cursor:default;
    }
    .mode-settings-toggle{
      padding:12px;
      border:none;
      border-radius:16px;
      background:rgba(255,255,255,.08);
      color:var(--text);
      font-weight:700;
      cursor:pointer;
    }
    .mode-settings-toggle.active{
      background:linear-gradient(180deg,#f2d97b,#c6a548);
      color:var(--ink);
    }
    .mode-settings-actions{
      justify-content:flex-end;
    }
    .reroll-desktop-only{
      display:block;
    }
    .reroll-mobile-only{
      display:none;
    }
    .reroll-toolbar{
      display:grid;
      grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);
      gap:14px;
      align-items:stretch;
      padding:16px;
      border:1px solid var(--line);
      border-radius:24px;
      background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));
      box-shadow:0 20px 50px rgba(0,0,0,.16);
    }
    .reroll-toolbar-copy{
      display:grid;
      gap:10px;
      align-content:start;
    }
    .reroll-toolbar-copy h2{
      margin:0;
      font-size:clamp(1.85rem,2.9vw,2.75rem);
      line-height:.96;
    }
    .reroll-toolbar-copy p{
      margin:0;
      max-width:58ch;
      color:var(--muted);
      font-size:.96rem;
      line-height:1.42;
    }
    .reroll-toolbar-stats{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      align-content:start;
    }
    .reroll-stat-card{
      display:grid;
      gap:6px;
      padding:14px;
      border-radius:18px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.045);
      min-height:0;
    }
    .reroll-stat-card:last-child{
      grid-column:1 / -1;
    }
    .reroll-stat-card span{
      color:var(--muted);
      font-size:.72rem;
      letter-spacing:.12em;
      text-transform:uppercase;
    }
    .reroll-stat-card strong{
      font-size:1rem;
      line-height:1.35;
    }
    .reroll-grid{
      grid-template-columns:repeat(auto-fit,minmax(270px,1fr));
    }
    .reroll-workshop-grid{
      align-items:start;
    }
    .reroll-card{
      color:var(--text);
      display:grid;
      gap:14px;
      padding:16px;
      border-radius:24px;
      background:
        linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.03)),
        linear-gradient(135deg,color-mix(in srgb,var(--reroll-accent) 18%, transparent),transparent 42%);
      border:1px solid color-mix(in srgb,var(--reroll-accent) 30%, rgba(255,255,255,.08));
      box-shadow:0 18px 36px rgba(0,0,0,.16);
    }
    .reroll-card-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }
    .reroll-card-title{
      display:grid;
      gap:4px;
      min-width:0;
    }
    .reroll-card-title h3{
      margin:0;
      line-height:1.02;
    }
    .reroll-card-strip{
      display:flex;
      align-items:center;
      gap:12px;
      min-height:0;
    }
    .reroll-card-sprite{
      width:64px;
      height:64px;
      display:grid;
      place-items:center;
      border-radius:18px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      flex:0 0 auto;
    }
    .reroll-card-meta{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      min-width:0;
    }
    .item-assign-head{
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      gap:12px;
      align-items:start;
    }
    .reroll-move-list,.item-assign-list{
      display:grid;
      gap:10px;
    }
    .item-assign-list{
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    }
    .item-info-card{
      display:grid;
      gap:10px;
      padding:14px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.05);
    }
    .item-info-card.selected{
      border-color:rgba(242,217,123,.55);
      box-shadow:0 0 0 1px rgba(242,217,123,.22) inset;
    }
    .item-info-card.assigned{
      background:linear-gradient(180deg,rgba(54,112,86,.26),rgba(31,71,57,.2));
      border-color:rgba(111,197,145,.28);
    }
    .item-info-card.compact{
      padding:12px;
      gap:8px;
    }
    .item-info-desc{
      line-height:1.35;
    }
    .item-assign-type-row{
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin-top:4px;
    }
    .type-badge.compact{
      padding:4px 8px;
      border-radius:999px;
      font-size:.62rem;
    }
    .reroll-move-row{
      display:flex;
      gap:10px;
      align-items:center;
      justify-content:space-between;
    }
    .reroll-move-list{
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }
    .reroll-move-tile{
      display:grid;
      gap:10px;
      padding:12px;
      border-radius:18px;
      background:rgba(7,11,9,.18);
      border:1px solid rgba(255,255,255,.08);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
    }
    .reroll-move-top{
      display:grid;
      gap:6px;
    }
    .reroll-move-top .move-chip{
      justify-self:start;
      max-width:100%;
    }
    .reroll-move-btn{
      width:100%;
      justify-content:center;
    }
    .reroll-mobile-workshop{
      display:none;
      gap:10px;
    }
    .reroll-team-tabs{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding:2px 0 2px;
      scrollbar-width:none;
    }
    .reroll-team-tabs::-webkit-scrollbar{
      display:none;
    }
    .reroll-team-tab{
      display:grid;
      grid-template-columns:auto minmax(0,1fr);
      align-items:center;
      justify-items:start;
      gap:8px;
      min-width:104px;
      padding:8px 10px;
      border-radius:18px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.04);
      color:var(--text);
      cursor:pointer;
    }
    .reroll-team-tab.active{
      background:linear-gradient(180deg,rgba(242,217,123,.96),rgba(198,165,72,.92));
      color:var(--ink);
      border-color:rgba(242,217,123,.72);
    }
    .reroll-team-tab-sprite{
      width:34px;
      height:34px;
      display:grid;
      place-items:center;
    }
    .reroll-team-tab-sprite .sprite.sm{
      width:26px;
      height:26px;
    }
    .reroll-team-tab-name{
      display:block;
      width:100%;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-size:.72rem;
      font-weight:700;
      line-height:1.15;
      text-align:left;
    }
    .reroll-footer{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:0 4px;
    }
    .reroll-footer-copy{
      display:grid;
      gap:2px;
    }
    .reroll-footer-copy strong{
      font-size:1.3rem;
      line-height:1;
    }
    .reroll-footer-copy span{
      color:var(--muted);
      font-size:.82rem;
      text-transform:uppercase;
      letter-spacing:.12em;
    }
    .compact-btn{
      padding:8px 10px;
      border-radius:14px;
    }
    .item-pool-strip{
      grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
    }
    .item-assign-item-strip{
      display:flex;
      gap:10px;
      overflow-x:auto;
      overflow-y:hidden;
      padding:2px 0 4px;
      scroll-snap-type:x mandatory;
      scrollbar-width:none;
    }
    .item-assign-item-strip::-webkit-scrollbar{
      display:none;
    }
    .item-picker-card{
      flex:0 0 220px;
      display:grid;
      align-content:start;
      gap:8px;
      padding:12px 14px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.05);
      color:var(--text);
      text-align:left;
      scroll-snap-align:center;
      cursor:pointer;
    }
    .item-picker-card.selected{
      background:linear-gradient(180deg,#f2d97b,#c6a548);
      color:var(--ink);
      border-color:rgba(242,217,123,.72);
    }
    .item-picker-card.assigned:not(.selected){
      background:linear-gradient(180deg,rgba(111,197,145,.22),rgba(54,112,86,.24));
      border-color:rgba(111,197,145,.28);
    }
    .item-picker-card-head{
      display:grid;
      grid-template-columns:auto minmax(0,1fr);
      align-items:center;
      gap:10px;
      min-width:0;
    }
    .item-picker-card-head strong{
      display:block;
      font-size:1rem;
      line-height:1.05;
    }
    .item-picker-card-head span{
      display:block;
      opacity:.72;
      font-size:.7rem;
      margin-top:3px;
    }
    .item-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      padding:10px 12px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.08);
      color:var(--text);
      font-weight:700;
      text-align:center;
    }
    button.item-pill{
      cursor:pointer;
    }
    .item-pill.selected,.item-pill.assigned{
      background:linear-gradient(180deg,#f2d97b,#c6a548);
      color:var(--ink);
    }
    .item-pill.assigned:not(.selected){
      background:linear-gradient(180deg,rgba(111,197,145,.9),rgba(54,112,86,.94));
      color:#f3fff8;
    }
    .item-pill.empty{
      background:rgba(255,255,255,.05);
      color:var(--muted);
    }
    .item-draft-grid{
      grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    }
    .item-draft-card{
      display:grid;
      grid-template-rows:auto minmax(0,1fr) auto;
      align-content:start;
      min-height:180px;
    }
    .item-draft-card > .tiny{
      display:-webkit-box;
      overflow:hidden;
      -webkit-box-orient:vertical;
      -webkit-line-clamp:4;
    }
    .item-draft-card .card-actions{
      margin-top:auto;
    }
    .item-draft-card .card-actions .primary-btn{
      width:100%;
      justify-content:center;
    }
    .item-assign-grid{
      grid-template-columns:minmax(0,1fr);
    }
    .item-assign-list{
      grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
    }
    .item-assign-desktop-only{
      display:block;
    }
    .item-assign-mobile-only{
      display:none;
    }
    .item-assign-team-tabs{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding:2px 0 2px;
      scroll-snap-type:x mandatory;
      scrollbar-width:none;
    }
    .item-assign-team-tabs::-webkit-scrollbar{
      display:none;
    }
    .item-assign-team-tab{
      display:grid;
      grid-template-columns:auto minmax(0,1fr);
      align-items:center;
      gap:8px;
      min-width:132px;
      padding:8px 10px;
      border-radius:18px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.04);
      color:var(--text);
      text-align:left;
      cursor:pointer;
      scroll-snap-align:center;
    }
    .item-assign-team-tab.active{
      background:linear-gradient(180deg,rgba(242,217,123,.96),rgba(198,165,72,.92));
      color:var(--ink);
      border-color:rgba(242,217,123,.72);
    }
    .item-assign-team-tab-sprite{
      width:34px;
      height:34px;
      display:grid;
      place-items:center;
    }
    .item-assign-team-tab-sprite .sprite.sm{
      width:26px;
      height:26px;
    }
    .item-assign-team-tab-copy{
      display:grid;
      gap:2px;
      min-width:0;
    }
    .item-assign-team-tab-copy strong,
    .draft-team-slot-copy strong{
      display:block;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .item-assign-team-tab-copy span{
      display:block;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-size:.66rem;
      opacity:.74;
    }
    .item-assign-member-carousel{
      display:flex;
      gap:10px;
      overflow-x:auto;
      overflow-y:hidden;
      padding:2px 0 4px;
      scrollbar-width:none;
      scroll-behavior:auto;
    }
    .item-assign-member-carousel::-webkit-scrollbar{
      display:none;
    }
    .item-assign-member-slide{
      flex:0 0 84%;
    }
    .item-assign-member-slide .item-assign-card.compact{
      min-height:0;
    }
    .item-assign-progress-card{
      display:grid;
      gap:8px;
      padding:8px 10px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.035);
    }
    .item-assign-progress-head{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:10px;
    }
    .item-assign-progress-head strong{
      font-size:.84rem;
      line-height:1;
    }
    .item-assign-progress-strip{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(42px,1fr));
      gap:6px;
    }
    .item-assign-progress-slot{
      display:grid;
      justify-items:center;
      gap:5px;
      padding:6px 4px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:var(--muted);
      cursor:pointer;
    }
    .item-assign-progress-slot.assigned{
      border-color:rgba(111,197,145,.32);
      background:linear-gradient(180deg,rgba(111,197,145,.18),rgba(54,112,86,.18));
      color:#f3fff8;
    }
    .item-assign-progress-slot.active{
      border-color:rgba(242,217,123,.42);
      background:linear-gradient(180deg,rgba(242,217,123,.18),rgba(198,165,72,.14));
      color:var(--text);
    }
    .item-assign-progress-sprite .sprite.sm{
      width:24px;
      height:24px;
    }
    .item-assign-progress-state{
      min-height:18px;
      display:grid;
      place-items:center;
    }
    .item-assign-progress-state .item-icon.small{
      width:18px;
      height:18px;
    }
    .item-assign-progress-empty-dot{
      width:8px;
      height:8px;
      border-radius:50%;
      background:rgba(255,255,255,.26);
      display:block;
    }
    .item-assign-item-detail-carousel{
      display:flex;
      gap:10px;
      overflow-x:auto;
      overflow-y:hidden;
      padding:2px 0 4px;
      scrollbar-width:none;
      scroll-behavior:auto;
    }
    .item-assign-item-detail-carousel::-webkit-scrollbar{
      display:none;
    }
    .item-assign-item-slide{
      flex:0 0 84%;
      padding:0;
      border:none;
      background:none;
      color:inherit;
      text-align:left;
      cursor:pointer;
    }
    .item-assign-item-slide .item-info-card{
      min-height:0;
    }
    .item-assign-mobile-hint{
      display:grid;
      gap:2px;
      padding:8px 10px;
      border-radius:14px;
      border:1px dashed rgba(242,217,123,.22);
      background:rgba(255,255,255,.03);
      color:var(--muted);
    }
    .item-assign-mobile-hint strong{
      color:var(--text);
      font-size:.72rem;
      letter-spacing:.12em;
      text-transform:uppercase;
    }
    .item-assign-mobile-hint span{
      font-size:.72rem;
      line-height:1.25;
    }
    .item-assign-card{
      color:var(--ink);
      box-shadow:inset 0 0 0 999px rgba(255,255,255,.14);
      display:grid;
      gap:12px;
    }
    .item-assign-current{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }
    .inspect-held-item{
      display:grid;
      gap:6px;
      padding:10px 12px;
      border-radius:16px;
      background:rgba(255,255,255,.16);
      color:var(--ink);
    }
    .inspect-held-item strong{
      font-size:1rem;
    }
    .item-draft-team-strip{
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
    }
    .item-draft-summary{
      display:grid;
      gap:8px;
      margin-top:2px;
      padding:10px 12px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
    }
    .item-draft-summary-head{
      display:grid;
      gap:2px;
    }
    .item-draft-summary-head strong{
      font-size:.92rem;
      line-height:1.1;
    }
    .item-draft-summary-head span{
      color:var(--muted);
      font-size:.72rem;
      line-height:1.25;
    }
    .item-draft-summary-empty{
      padding:9px 10px;
      border-radius:14px;
      border:1px dashed rgba(255,255,255,.08);
      background:rgba(255,255,255,.03);
      color:var(--muted);
      font-size:.72rem;
      line-height:1.28;
    }
    .item-assign-mobile-status{
      display:none;
    }
    .item-assign-status-card{
      display:grid;
      gap:4px;
      padding:10px 12px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
    }
    .item-assign-status-card span{
      color:var(--muted);
      font-size:.66rem;
      letter-spacing:.12em;
      text-transform:uppercase;
    }
    .item-assign-status-card strong{
      font-size:.92rem;
      line-height:1.18;
    }
    .item-draft-shell .draft-board{
      grid-template-rows:auto 1fr;
    }
    .draft-team-slot.compact{
      grid-template-columns:minmax(0,1fr) auto;
      align-items:center;
    }
    .draft-team-slot-head{
      display:grid;
      grid-template-columns:auto minmax(0,1fr);
      align-items:center;
      gap:10px;
      min-width:0;
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
      .battle-brand-logo{
        top:6px;
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
        padding:2px 0 0;
      }
      .battle-starter-art img{
        width:min(28vw,360px);
        height:auto;
        display:block;
        filter:drop-shadow(0 18px 24px rgba(0,0,0,.18));
      }
      .item-assign-shell .preview-hero-panel{
        grid-template-columns:minmax(0,1fr);
      }
      .preview-shell .draft-hero-copy h2{
        font-size:clamp(2rem,3.6vw,3.2rem);
      }
      .mode-settings-copy h2{
        font-size:clamp(1.9rem,3.3vw,2.9rem);
      }
      .inspect-move-column .inspect-move-card{
        min-height:0;
      }
      .team-size-6 .preview-hero-slot{
        padding:10px;
      }
      .team-size-6 .preview-hero-slot strong{
        font-size:.88rem;
      }
      .team-size-6 .preview-card{
        min-height:86px;
        padding:10px 12px;
      }
      .team-size-6 .preview-card .sprite.sm{
        width:46px;
        height:46px;
      }
      .team-size-6 .preview-copy strong{
        font-size:1rem;
      }
      .team-size-6 .preview-copy .tiny{
        font-size:.74rem;
      }
      .team-size-6 .reroll-grid{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
      }
      .team-size-6 .reroll-card{
        padding:10px;
        gap:8px;
      }
      .team-size-6 .reroll-card-body{
        grid-template-columns:56px minmax(0,1fr);
        gap:8px;
      }
      .team-size-6 .reroll-card-sprite .sprite.sm{
        width:42px;
        height:42px;
      }
      .team-size-6 .reroll-move-row{
        gap:6px;
      }
      .item-assign-card{
        padding:12px;
        gap:10px;
      }
      .item-draft-team-strip .draft-team-slot{
        min-height:0;
        padding:10px 12px;
      }
      .item-assign-head .sprite.sm{
        width:42px;
        height:42px;
      }
      .team-size-6 .item-assign-card{
        padding:9px;
        gap:7px;
      }
      .team-size-6 .item-assign-head .tiny{
        display:none;
      }
      .team-size-6 .item-assign-head{
        gap:8px;
      }
      .team-size-6 .item-assign-current .item-pill{
        padding:6px 9px;
        font-size:.74rem;
      }
      .team-size-6 .item-assign-card .card-actions .primary-btn,
      .team-size-6 .item-assign-card .card-actions .ghost-btn{
        padding:7px 9px;
        font-size:.74rem;
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
        grid-template-columns:repeat(2,minmax(0,auto));
        gap:6px;
      }
      .preview-actions .lead-chip{
        box-shadow:inset 0 0 0 1px rgba(116,92,32,.14),0 6px 16px rgba(0,0,0,.12);
      }
      .preview-actions .lead-chip:disabled{
        opacity:.35;
      }
      .battle-stage{
        --battle-foe-line:11.5%;
        --battle-player-line:20.5%;
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
      .link-setup-hero,.link-preview-hero,.link-preview-main{
        grid-template-columns:minmax(0,1fr) minmax(280px,.9fr);
      }
      .preview-panel,.preview-side-panel{
        border-radius:24px;
        padding:14px;
      }
      .link-setup-copy,.link-setup-stage-card,.link-setup-card{
        border-radius:24px;
        padding:14px;
      }
      .link-setup-step-grid{
        gap:8px;
      }
      .link-setup-step{
        padding:10px;
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
      .mode-settings-shell{
        gap:8px;
        padding:8px 0 4px;
      }
      .link-setup-shell,.link-preview-shell{
        gap:10px;
        padding:8px 0 4px;
      }
      .draft-hero-panel,.draft-team-panel,.draft-board{
        border-radius:24px;
      }
      .mode-settings-summary{
        padding:10px 12px;
        border-radius:20px;
      }
      .mode-settings-hero .draft-hero-copy{
        padding:10px 12px;
      }
      .mode-settings-hero .draft-hero-copy p{
        font-size:.82rem;
        line-height:1.28;
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
      .team-size-6 .draft-hero-copy p{
        display:none;
      }
      .draft-section-head p{
        display:none;
      }
      .draft-topbar-meta span,.draft-chip-row span,.draft-status-list span,.draft-role-row span{
        padding:6px 10px;
        font-size:.78rem;
      }
      .mode-settings-grid{
        gap:8px;
      }
      .mode-settings-card,.mode-settings-note{
        padding:10px 12px;
      }
      .mode-settings-card h3{
        font-size:1.12rem;
      }
      .mode-settings-notes{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      .mode-settings-note{
        gap:4px;
      }
      .mode-settings-note span{
        font-size:.74rem;
        line-height:1.22;
      }
      .draft-team-panel,.draft-board{
        padding:14px;
        gap:10px;
      }
      .team-size-6 .draft-shell{
        gap:6px;
      }
      .team-size-6.preview-shell{
        gap:6px;
        padding:6px 0 2px;
      }
      .team-size-6 .draft-hero-panel,
      .team-size-6 .draft-team-panel,
      .team-size-6 .draft-board{
        padding:10px;
      }
      .team-size-6 .draft-topbar .back{
        padding:8px 12px;
      }
      .team-size-6 .item-assign-shell .draft-hero-copy h2{
        font-size:clamp(1.7rem,3vw,2.4rem);
      }
      .team-size-6 .item-assign-shell .item-pool-strip{
        gap:10px;
      }
      .team-size-6 .item-assign-shell .item-info-card{
        padding:10px 12px;
      }
      .team-size-6 .item-assign-shell .draft-board{
        gap:8px;
      }
      .team-size-6 .mode-settings-actions .primary-btn{
        padding:8px 14px;
      }
      .team-size-6 .item-draft-team-strip{
        grid-template-columns:repeat(3,minmax(0,1fr));
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
      .draft-hero-panel,.draft-team-strip,.draft-choice-grid,.link-setup-hero,.link-setup-grid,.link-preview-main,.link-preview-hero{grid-template-columns:1fr}
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
      .draft-view.preview-flow-view{
        height:auto;
        min-height:calc(100svh - 20px);
      }
      .draft-view.preview-flow-view .main{
        height:auto;
        overflow:visible;
      }
      .mode-settings-shell{
        gap:8px;
        padding:4px 0 2px;
        min-height:calc(100svh - 20px);
      }
      .menu-shell{gap:10px;padding:6px 0 8px}
      .menu-topbar{
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
      .menu-copy,.menu-modes,.menu-info-panel,.menu-legal-note{
        padding:14px;
        gap:12px;
      }
      .menu-project-note{
        padding:7px 9px;
        font-size:.68rem;
        line-height:1.32;
      }
      .draft-shell{
        gap:8px;
        padding:4px 0 2px;
        min-height:0;
        height:100%;
        grid-template-rows:auto auto auto 1fr;
        overflow:hidden;
      }
      .draft-shell.team-size-6:not(.item-draft-shell){
        height:auto;
        min-height:calc(100svh - 20px);
        grid-template-rows:auto auto auto auto;
        overflow:visible;
      }
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-hero-panel,
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-team-panel,
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-board{
        padding:9px;
      }
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-section-head p{
        display:none;
      }
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-team-strip{
        display:flex;
        grid-template-columns:none;
        gap:6px;
        min-height:0;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
        scrollbar-width:none;
      }
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-team-strip::-webkit-scrollbar{
        display:none;
      }
      .draft-shell.team-size-6:not(.item-draft-shell) .draft-team-slot{
        flex:0 0 18%;
      }
      .link-setup-shell{
        gap:8px;
        padding:4px 0 2px;
        height:100%;
        grid-template-rows:auto auto 1fr auto;
        overflow:hidden;
      }
      .preview-shell{
        gap:8px;
        padding:4px 0 2px;
        height:auto;
        min-height:calc(100svh - 20px);
        grid-template-rows:auto auto auto;
        overflow:visible;
      }
      .item-assign-shell{
        height:auto;
        min-height:calc(100svh - 20px);
        grid-template-rows:auto auto auto 1fr auto;
        align-content:start;
      }
      .team-size-6.item-assign-shell{
        grid-template-rows:auto auto auto auto auto;
      }
      .link-preview-shell{
        gap:8px;
        padding:4px 0 2px;
        height:auto;
        min-height:calc(100svh - 20px);
        grid-template-rows:auto auto auto;
        overflow:visible;
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
        grid-template-rows:auto auto;
        gap:8px;
        min-height:0;
        overflow:visible;
      }
      .item-assign-board{
        min-height:0;
        align-content:stretch;
      }
      .team-size-6 .item-assign-board{
        align-content:start;
      }
      .item-assign-member-carousel{
        height:100%;
        align-items:stretch;
      }
      .item-assign-member-slide{
        display:flex;
      }
      .item-assign-member-slide .item-assign-card.compact{
        height:100%;
      }
      .link-setup-hero{
        grid-template-columns:1fr;
        gap:8px;
      }
      .link-setup-grid{
        grid-template-columns:1fr;
        gap:8px;
        min-height:0;
      }
      .link-setup-copy,.link-setup-stage-card,.link-setup-card{
        padding:10px;
        gap:8px;
        border-radius:20px;
      }
      .link-setup-copy h2{
        font-size:clamp(1.5rem,7vw,2.05rem);
        line-height:.98;
      }
      .link-setup-copy p,.link-setup-card p,.link-card-note,.link-setup-step div{
        font-size:.84rem;
        line-height:1.35;
      }
      .link-setup-shell .draft-chip-row span:nth-child(n+3){
        display:none;
      }
      .link-setup-step-grid{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:6px;
      }
      .link-setup-step{
        padding:8px 6px;
        gap:6px;
      }
      .link-setup-step span{
        width:26px;
        height:26px;
      }
      .link-setup-step strong{
        font-size:.72rem;
        line-height:1.15;
      }
      .link-setup-step div{
        display:none;
      }
      .link-code-box{
        min-height:46px;
        font-size:.84rem;
      }
      .link-setup-actions{
        justify-content:stretch;
      }
      .link-setup-actions .ghost-btn{
        width:100%;
      }
      .link-setup-shell .draft-topbar{
        grid-template-columns:minmax(0,1fr);
      }
      .link-setup-shell .draft-topbar-meta{
        display:none;
      }
      .mode-settings-hero{
        grid-template-columns:1fr;
        gap:8px;
      }
      .reroll-desktop-only{
        display:none;
      }
      .reroll-mobile-only{
        display:block;
      }
      .reroll-toolbar{
        grid-template-columns:1fr;
        gap:8px;
        padding:10px;
        border-radius:20px;
      }
      .reroll-toolbar-copy{
        gap:8px;
      }
      .reroll-toolbar-copy h2{
        font-size:clamp(1.5rem,7vw,2rem);
      }
      .reroll-toolbar-copy p{
        font-size:.82rem;
        line-height:1.3;
      }
      .reroll-toolbar-stats{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:8px;
      }
      .reroll-stat-card{
        padding:10px;
        border-radius:16px;
      }
      .reroll-stat-card span{
        font-size:.64rem;
      }
      .reroll-stat-card strong{
        font-size:.84rem;
      }
      .reroll-stat-card:last-child{
        display:none;
      }
      .mode-settings-summary{
        display:none;
      }
      .mode-settings-desktop{
        display:none;
      }
      .mode-settings-mobile{
        display:block;
      }
      .mode-settings-mobile-panel{
        display:grid;
        gap:8px;
        padding:10px;
        border-radius:20px;
        border:1px solid var(--line);
        background:rgba(255,255,255,.04);
      }
      .mode-settings-row{
        padding:10px;
        gap:8px;
      }
      .mode-settings-row-copy{
        gap:4px;
      }
      .mode-settings-row-copy h3{
        font-size:.98rem;
      }
      .mode-settings-row-copy p{
        font-size:.72rem;
        line-height:1.25;
      }
      .mode-settings-toggle-row{
        gap:8px;
      }
      .mode-settings-toggle-row.reroll-toggle-row{
        grid-template-columns:repeat(2,minmax(0,1fr)) auto;
        gap:6px;
      }
      .mode-settings-toggle{
        padding:10px 8px;
        font-size:.9rem;
      }
      .mode-settings-counter{
        justify-content:flex-start;
        min-height:34px;
      }
      .reroll-toggle-row .mode-settings-counter span{
        min-width:38px;
        padding:6px 6px;
      }
      .mode-settings-notes{
        display:none;
      }
      .mode-settings-actions{
        margin-top:auto;
      }
      .mode-settings-actions .primary-btn{
        width:100%;
        justify-content:center;
        padding:10px 14px;
      }
      .mode-settings-shell .draft-topbar{
        grid-template-columns:minmax(0,1fr);
      }
      .mode-settings-shell .draft-topbar-meta{
        display:none;
      }
      .reroll-card{
        padding:10px;
        gap:10px;
      }
      .reroll-card-strip{
        gap:10px;
      }
      .reroll-card-sprite{
        width:54px;
        height:54px;
        border-radius:16px;
      }
      .reroll-card-sprite .sprite.sm{
        width:42px;
        height:42px;
      }
      .reroll-move-list{
        grid-template-columns:1fr 1fr;
        gap:6px;
      }
      .reroll-move-tile{
        padding:8px;
        gap:6px;
        border-radius:16px;
      }
      .reroll-move-btn{
        min-height:32px;
        padding:5px 6px;
        font-size:.72rem;
      }
      .reroll-mobile-workshop{
        display:grid;
      }
      .reroll-team-tab{
        min-width:112px;
        padding:7px 8px;
        border-radius:16px;
      }
      .reroll-team-tab-sprite{
        width:28px;
        height:28px;
      }
      .reroll-team-tab-name{
        font-size:.68rem;
      }
      .reroll-footer{
        display:grid;
        grid-template-columns:1fr auto 1fr;
        align-items:center;
        padding:0;
        gap:8px;
      }
      .reroll-footer-copy{
        grid-column:2;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        text-align:center;
        white-space:nowrap;
      }
      .reroll-footer .primary-btn{
        grid-column:3;
        justify-self:end;
      }
      .reroll-footer .primary-btn{
        min-width:0;
        padding:10px 14px;
      }
      .reroll-footer-copy strong{
        font-size:1.02rem;
        line-height:1;
      }
      .reroll-footer-copy span{
        font-size:.74rem;
        line-height:1;
      }
      .link-setup-shell .link-setup-actions{
        display:none;
      }
      .preview-panel,.preview-side-panel{
        border-radius:20px;
        padding:10px;
        gap:8px;
      }
      .preview-hero-panel{
        grid-template-columns:1fr;
      }
      .link-preview-hero{
        grid-template-columns:1fr;
        gap:8px;
      }
      .preview-hero-guide{
        padding:8px;
        gap:6px;
      }
      .team-size-6 .preview-hero-guide{
        display:none;
      }
      .preview-hero-slot-grid{
        gap:5px;
      }
      .preview-hero-slot{
        padding:6px;
        border-radius:14px;
      }
      .team-size-6 .preview-hero-slot{
        padding:5px;
      }
      .preview-hero-slot strong{
        font-size:.78rem;
      }
      .team-size-6 .preview-hero-slot strong{
        font-size:.72rem;
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
        overflow:visible;
      }
      .team-size-6 .preview-panel,.team-size-6 .preview-side-panel{
        padding:8px;
        gap:6px;
      }
      .team-size-6.preview-shell .draft-chip-row span:nth-child(n+3),
      .team-size-6.link-preview-shell .draft-chip-row span:nth-child(n+3){
        display:none;
      }
      .inspect-move-list{
        grid-template-columns:1fr;
      }
      .link-preview-main{
        grid-template-columns:1fr;
        grid-template-rows:auto auto;
        gap:8px;
        min-height:0;
        overflow:visible;
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
      .mode-settings-copy h2{
        font-size:clamp(1.3rem,6.5vw,1.9rem);
      }
      .mode-settings-copy p{
        font-size:.78rem;
        line-height:1.26;
      }
      .team-size-6 .draft-hero-copy h2{
        font-size:clamp(1.25rem,6.2vw,1.7rem);
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
      .item-draft-team-strip{
        grid-template-columns:1fr 1fr;
        gap:6px;
      }
      .team-size-6.item-draft-shell .draft-hero-copy p,
      .team-size-6.item-draft-shell .draft-section-head p{
        display:none;
      }
      .team-size-6.item-draft-shell{
        height:auto;
        min-height:calc(100svh - 20px);
        grid-template-rows:auto auto auto;
        overflow:visible;
      }
      .team-size-6.item-draft-shell .item-draft-team-strip{
        display:flex;
        grid-template-columns:none;
        overflow-x:auto;
        overflow-y:hidden;
        gap:6px;
        min-height:0;
        padding-bottom:2px;
        scrollbar-width:none;
      }
      .team-size-6.item-draft-shell .item-draft-team-strip::-webkit-scrollbar{
        display:none;
      }
      .team-size-6.item-draft-shell .item-draft-team-strip .draft-team-slot{
        flex:0 0 31%;
        min-width:0;
        min-height:68px;
        height:68px;
      }
      .item-draft-team-strip .draft-team-slot{
        grid-template-columns:1fr;
        justify-items:center;
        text-align:center;
        padding:8px 6px;
        gap:6px;
        min-height:92px;
        height:92px;
        align-content:start;
      }
      .item-draft-team-strip .draft-team-slot-head{
        grid-template-columns:1fr;
        justify-items:center;
        gap:4px;
      }
      .item-draft-team-strip .draft-team-slot-copy{
        width:100%;
        min-width:0;
      }
      .item-draft-team-strip .draft-team-slot-copy strong{
        font-size:.72rem;
      }
      .item-draft-team-strip .draft-team-slot-copy .tiny{
        display:none;
      }
      .item-draft-team-strip .draft-team-slot .info-chip{
        display:inline-flex;
        min-height:28px;
        padding:4px 9px;
        font-size:.64rem;
      }
      .item-draft-card{
        min-height:166px;
      }
      .item-draft-card > .tiny{
        -webkit-line-clamp:3;
      }
      .item-draft-shell .draft-board{
        grid-template-rows:auto auto;
        align-content:start;
      }
      .team-size-6.item-draft-shell .draft-board{
        align-content:start;
        align-self:start;
      }
      .team-size-6.item-draft-shell .item-draft-grid{
        align-items:start;
        grid-auto-columns:78%;
      }
      .team-size-6.item-draft-shell .item-draft-grid .item-draft-card{
        min-height:112px;
        height:auto;
        align-self:start;
      }
      .team-size-6.item-draft-shell .item-draft-grid .item-draft-card > .tiny{
        -webkit-line-clamp:2;
        min-height:2.2em;
      }
      .team-size-6.item-draft-shell .item-draft-grid .item-draft-card .card-actions .primary-btn{
        min-height:32px;
        padding:5px 8px;
      }
      .item-assign-desktop-only{
        display:none;
      }
      .item-assign-mobile-status{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:8px;
      }
      .item-assign-mobile-only{
        display:grid;
        gap:8px;
      }
      .item-assign-item-carousel{
        gap:8px;
      }
      .item-assign-item-detail-carousel{
        gap:8px;
        padding-right:12%;
      }
      .item-assign-item-slide{
        flex-basis:88%;
        min-height:128px;
      }
      .item-picker-card{
        flex-basis:78%;
        padding:10px 12px;
      }
      .item-picker-card.compact{
        flex-basis:74%;
      }
      .item-picker-card-head{
        gap:8px;
      }
      .item-picker-card-head strong{
        font-size:.94rem;
      }
      .item-picker-card-head span{
        font-size:.64rem;
      }
      .item-assign-member-carousel{
        gap:8px;
        padding-right:12%;
      }
      .team-size-6.item-assign-shell .item-assign-member-carousel{
        height:auto;
      }
      .item-assign-member-slide{
        flex-basis:88%;
        min-height:148px;
      }
      .team-size-6.item-assign-shell .item-assign-member-slide{
        min-height:130px;
      }
      .item-assign-card.compact{
        padding:10px;
        gap:8px;
        min-height:148px;
        align-content:start;
      }
      .team-size-6.item-assign-shell .item-assign-card.compact{
        min-height:130px;
      }
      .item-assign-card.compact .item-assign-head{
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:8px;
        align-items:center;
      }
      .item-assign-card.compact .item-assign-head .tiny{
        display:none;
      }
      .item-assign-card.compact .item-assign-head .sprite.sm{
        width:38px;
        height:38px;
      }
      .item-assign-card.compact .card-actions{
        grid-template-columns:1fr 1fr;
      }
      .item-draft-summary{
        padding:8px 10px;
      }
      .team-size-6.item-assign-shell .item-assign-progress-strip{
        margin-top:4px;
      }
      .item-draft-summary-head strong{
        font-size:.82rem;
      }
      .item-draft-summary-head span{
        font-size:.66rem;
      }
      .preview-card-list,.preview-status-stack{
        gap:8px;
      }
      .team-size-6 .preview-card-list{
        gap:5px;
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
      .team-size-6 .preview-card{
        min-height:60px;
        padding:6px 7px;
      }
      .team-size-6 .preview-card .sprite.sm{
        width:34px;
        height:34px;
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
      .team-size-6 .preview-copy strong{
        font-size:.79rem;
      }
      .team-size-6 .preview-panel .draft-section-head p,
      .team-size-6 .preview-opponent-panel .preview-status-stack{
        display:none;
      }
      .team-size-6 .preview-card{
        min-height:54px;
        padding:5px 6px;
        gap:6px;
      }
      .team-size-6 .preview-actions{
        gap:3px;
      }
      .team-size-6 .preview-actions .info-chip,
      .team-size-6 .preview-actions .lead-chip{
        padding:4px 5px;
        font-size:.56rem;
      }
      .team-size-6 .preview-side-panel .empty{
        padding:8px;
      }
      .team-size-6 .preview-side-panel .empty div{
        font-size:.68rem;
        line-height:1.2;
      }
      .preview-actions{
        width:auto;
        display:grid;
        grid-template-columns:repeat(2,minmax(0,auto));
        justify-content:end;
        gap:4px;
      }
      .preview-actions .info-chip,.preview-actions .lead-chip{
        justify-content:center;
        padding:5px 7px;
        font-size:.62rem;
      }
      .team-size-6 .preview-actions .info-chip,.team-size-6 .preview-actions .lead-chip{
        padding:4px 6px;
        font-size:.58rem;
      }
      .team-size-6 .preview-side-panel .actions .primary-btn,
      .team-size-6 .preview-side-panel .actions .ghost-btn{
        padding:7px 8px;
        font-size:.72rem;
      }
      .item-pill{
        padding:8px 10px;
        font-size:.76rem;
      }
      .item-pool-strip{
        display:flex;
        flex-wrap:nowrap;
        gap:8px;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
        scrollbar-width:none;
      }
      .item-pool-strip::-webkit-scrollbar{
        display:none;
      }
      .item-pool-strip .item-pill{
        flex:0 0 auto;
        white-space:nowrap;
      }
      .draft-team-panel .item-pool-strip{
        min-height:44px;
        align-items:center;
        padding-bottom:4px;
      }
      .draft-team-panel .item-pool-strip .item-pill{
        padding:6px 9px;
        font-size:.7rem;
      }
      .item-assign-item-strip{
        gap:8px;
      }
      .item-picker-card{
        flex-basis:78%;
        padding:10px 12px;
      }
      .item-picker-card.compact{
        flex-basis:74%;
      }
      .item-assign-shell .preview-hero-panel{
        display:none;
      }
      .item-assign-shell .draft-team-panel,
      .item-assign-shell .draft-board{
        padding:10px;
      }
      .item-assign-pool-panel .draft-section-head p,
      .item-assign-board .draft-section-head p{
        display:none;
      }
      .item-assign-item-detail-carousel .item-info-card{
        padding:12px;
        min-height:128px;
        align-content:start;
      }
      .item-assign-item-detail-carousel .item-info-head strong{
        font-size:.94rem;
      }
      .item-assign-item-detail-carousel .item-info-desc{
        font-size:.74rem;
        line-height:1.28;
      }
      .item-picker-card-head{
        gap:8px;
      }
      .item-picker-card-head strong{
        font-size:.94rem;
      }
      .item-picker-card-head span{
        font-size:.64rem;
      }
      .item-icon.small{
        width:18px;
        height:18px;
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
      .link-preview-ready-panel .actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:6px;
      }
      .link-preview-ready-panel .actions .primary-btn,.link-preview-ready-panel .actions .ghost-btn{
        width:100%;
        padding:8px 10px;
        font-size:.78rem;
      }
      .link-preview-ready-notes{
        gap:8px;
      }
      .link-preview-order-panel .preview-card-list{
        gap:6px;
      }
      .link-preview-order-panel .preview-card{
        min-height:58px;
        padding:6px 8px;
      }
      .link-preview-order-panel .preview-card .sprite.sm{
        width:34px;
        height:34px;
      }
      .link-preview-order-panel .preview-copy strong{
        font-size:.8rem;
      }
      .link-preview-ready-panel{
        padding:8px;
        gap:6px;
      }
      .link-preview-ready-panel .draft-section-head p{
        display:none;
      }
      .link-preview-ready-panel .empty{
        padding:10px;
      }
      .link-preview-ready-notes .empty:nth-child(2){
        display:none;
      }
      .battle-brand-logo{
        display:none;
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
      .item-draft-shell .draft-hero-panel{
        padding:8px 10px;
      }
      .item-draft-shell .draft-hero-copy h2{
        font-size:clamp(1.82rem,8.6vw,2.38rem);
        line-height:.94;
      }
      .team-size-6.item-draft-shell .draft-hero-copy h2{
        font-size:clamp(1.34rem,6.6vw,1.72rem);
      }
      .team-size-6.item-draft-shell .draft-hero-copy h2{
        font-size:clamp(1.54rem,7.6vw,2rem);
      }
      .item-draft-shell .draft-chip-row span:last-child{
        display:none;
      }
      .item-draft-shell .draft-team-panel,
      .item-draft-shell .draft-board{
        padding:8px;
        gap:6px;
      }
      .item-draft-shell .item-draft-team-strip{
        gap:5px;
      }
      .team-size-6.item-draft-shell .draft-section-head{
        gap:4px;
      }
      .team-size-6.item-draft-shell .draft-section-head h3{
        font-size:.88rem;
      }
      .item-draft-shell .draft-board{
        grid-template-rows:auto 1fr;
        align-content:start;
      }
      .item-draft-summary{
        padding:8px 10px;
        gap:6px;
      }
      .item-draft-summary .item-pool-strip{
        display:flex;
        gap:6px;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
        scrollbar-width:none;
      }
      .item-draft-summary .item-pool-strip::-webkit-scrollbar{
        display:none;
      }
      .item-draft-summary .item-pill{
        flex:0 0 auto;
      }
      .item-draft-shell .item-draft-card{
        min-height:132px;
        padding:9px;
        gap:6px;
        grid-template-rows:auto auto auto;
        align-content:start;
      }
      .item-draft-shell .item-draft-card > .tiny{
        -webkit-line-clamp:2;
        font-size:.68rem;
        line-height:1.22;
        min-height:2.7em;
      }
      .item-draft-shell .item-draft-card .card-actions .primary-btn{
        min-height:34px;
        padding:6px 10px;
      }
      .item-draft-shell .item-draft-card .card-actions{
        margin-top:0;
      }
      .item-assign-shell .draft-team-panel,
      .item-assign-shell .draft-board{
        grid-template-rows:auto auto;
        align-content:start;
        padding:8px;
        gap:6px;
      }
      .item-assign-shell .draft-section-head{
        gap:4px;
      }
      .item-assign-shell .draft-section-head h3{
        font-size:.92rem;
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
        padding:7px 9px;
        border-width:2px;
        border-radius:6px;
      }
      .battle-status-shell{
        gap:5px;
      }
      .battle-status-shell-foe{top:var(--battle-pad-top);left:var(--battle-pad-x);width:clamp(120px,36%,154px);max-width:none}
      .battle-status-shell-player{right:var(--battle-pad-x);bottom:var(--battle-player-line);width:clamp(136px,40%,176px);max-width:none}
      .battle-status .info-chip{
        min-width:34px;
        min-height:20px;
        padding:4px 6px;
        font-size:.54rem;
      }
      .battle-status-name-row{
        gap:6px;
      }
      .battle-status-player .info-chip{
        min-width:32px;
        min-height:20px;
        padding:4px 6px;
        font-size:.54rem;
      }
      .battle-status-info{
        top:auto;
        right:auto;
      }
      .battle-status-meta{
        font-size:.68rem;
        letter-spacing:.05em;
      }
      .battle-ball{
        width:12px;
        height:12px;
      }
      .battle-ball-row{
        gap:4px;
      }
      .battle-hp{height:12px}
      .battle-sprite-foe{
        top:calc(var(--battle-foe-line) - 5.5%);
        right:6%;
        width:29%;
        height:35%;
      }
      .battle-sprite-player{
        left:7%;
        bottom:calc(var(--battle-feed-bottom) + var(--battle-feed-height) - 1.2%);
        width:26%;
        height:30%;
      }
      .battle-shadow{width:72%;height:14%;bottom:6%}
      .sprite.battle{width:100%;height:100%}
      .battle-sprite-foe .sprite.battle.front{
        transform:translateX(4%) translateY(-2%);
      }
      .battle-sprite-player .sprite.battle.back{
        transform:translateX(-4%) translateY(6%);
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
      .team-size-6 .battle-header p{
        display:none;
      }
      .team-size-6 .battle-stage{
        height:300px;
        min-height:300px;
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
      .battle-panel .bench-card .bench-card-switch-note{
        font-size:.62rem;
      }
      .battle-panel .bench-card .info-chip{
        min-width:50px;
        min-height:32px;
        padding:7px 11px;
        font-size:.66rem;
      }
      .battle-panel .sprite.sm{width:54px;height:54px}
      .team-size-6 .battle-footer{
        gap:5px;
      }
      .team-size-6 .battle-panel{
        padding:5px;
      }
      .team-size-6 .battle-panel .bench-grid{
        display:flex;
        gap:4px;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
      }
      .team-size-6 .battle-panel .bench-grid::-webkit-scrollbar{display:none}
      .team-size-6 .battle-panel .bench-card{
        flex:0 0 31%;
        min-height:66px;
        padding:5px 4px;
      }
      .team-size-6 .battle-panel .bench-card-switch{
        grid-template-columns:1fr;
        justify-items:center;
        text-align:center;
        gap:4px;
      }
      .team-size-6 .battle-panel .bench-card-copy{
        justify-items:center;
      }
      .team-size-6 .battle-panel .bench-card .tiny,
      .team-size-6 .battle-panel .bench-card .bench-card-switch-note{
        display:none;
      }
      .team-size-6 .battle-panel .bench-card strong{
        font-size:.7rem;
      }
      .team-size-6 .battle-panel .bench-card .info-chip{
        min-width:44px;
        min-height:28px;
        padding:5px 8px;
        font-size:.6rem;
      }
      .team-size-6 .battle-panel .sprite.sm{
        width:38px;
        height:38px;
      }
      .team-size-6 .battle-actions-panel{
        padding:5px;
      }
      .team-size-6 .choice-grid{
        gap:4px;
      }
      .team-size-6 .choice-btn{
        min-height:34px;
        padding:4px 6px;
      }
      .choice-grid{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:6px;
      }
      .choice-btn{
        min-height:36px;
        padding:5px 8px;
        gap:3px;
      }
      .battle-actions-panel .actions{
        display:grid;
        grid-template-columns:1fr;
        gap:6px;
        margin-top:6px;
      }
      .battle-mobile-menu{
        width:100%;
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
      .draft-view{
        height:auto;
        min-height:calc(100svh - 16px);
      }
      .draft-view .main{
        height:auto;
        overflow:visible;
      }
      .draft-shell{
        gap:6px;
        padding:2px 0 0;
        height:auto;
        min-height:calc(100svh - 16px);
        overflow:visible;
      }
      .mode-settings-shell{
        gap:6px;
        padding:2px 0 0;
        min-height:0;
        height:100%;
        grid-template-rows:auto auto 1fr auto;
        overflow:hidden;
      }
      .mode-settings-hero{
        padding:8px;
      }
      .mode-settings-copy{
        gap:6px;
      }
      .mode-settings-copy h2{
        font-size:clamp(1.35rem,7vw,1.9rem);
        line-height:.96;
      }
      .mode-settings-copy p{
        display:none;
      }
      .mode-settings-mobile-panel{
        padding:8px;
        gap:6px;
      }
      .mode-settings-row{
        padding:8px;
        gap:6px;
      }
      .mode-settings-row-copy p{
        font-size:.74rem;
        line-height:1.24;
      }
      .mode-settings-actions{
        padding-top:0;
      }
      .link-setup-shell,.link-preview-shell{
        gap:6px;
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
      .link-setup-copy,.link-setup-stage-card,.link-setup-card{
        padding:8px;
        gap:6px;
      }
      .link-setup-copy h2{
        font-size:clamp(1.3rem,6.4vw,1.8rem);
      }
      .link-setup-step-grid{
        gap:4px;
      }
      .link-setup-step{
        padding:6px 5px;
      }
      .link-setup-step span{
        width:22px;
        height:22px;
      }
      .link-setup-step strong{
        font-size:.66rem;
      }
      .draft-hero-panel,.draft-team-panel,.draft-board{
        padding:8px;
        border-radius:18px;
      }
      .team-size-6 .draft-hero-panel{
        padding:7px;
      }
      .draft-hero-copy{
        padding:8px;
        gap:6px;
      }
      .draft-hero-copy h2{
        font-size:clamp(1.18rem,6vw,1.55rem);
      }
      .team-size-6 .draft-hero-copy{
        padding:7px;
        gap:5px;
      }
      .team-size-6 .draft-hero-copy h2{
        font-size:clamp(1.08rem,5.6vw,1.4rem);
      }
      .draft-team-strip{
        gap:5px;
        min-height:64px;
      }
      .team-size-6 .draft-team-strip{
        display:flex;
        grid-template-columns:none;
        gap:5px;
        min-height:0;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
        scrollbar-width:none;
      }
      .team-size-6 .draft-team-strip::-webkit-scrollbar{display:none}
      .draft-team-slot{
        padding:6px 4px;
        gap:4px;
        min-height:64px;
        height:64px;
      }
      .team-size-6 .draft-team-slot{
        flex:0 0 16.5%;
        padding:4px 3px;
        gap:3px;
        min-height:52px;
        height:52px;
      }
      .draft-team-index{
        width:28px;
        height:28px;
      }
      .team-size-6 .draft-team-index{
        width:22px;
        height:22px;
        font-size:.62rem;
      }
      .team-size-6 .draft-team-slot .sprite.sm{
        width:24px;
        height:24px;
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
        grid-auto-columns:80%;
        gap:8px;
        padding-right:20%;
        align-items:start;
      }
      .draft-choice-card{
        padding:7px;
        gap:5px;
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
        grid-template-columns:60px 1fr;
        gap:5px;
      }
      .draft-choice-sprite{
        min-width:60px;
      }
      .draft-choice-sprite .sprite.lg{
        width:60px;
        height:60px;
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
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .draft-choice-copy .types{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:4px;
        min-height:0;
      }
      .draft-choice-copy .move-row{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:4px;
        overflow:visible;
        max-height:none;
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
      .item-draft-shell{
        min-height:calc(100svh - 16px);
      }
      .team-size-6.item-draft-shell{
        grid-template-rows:auto auto auto;
      }
      .item-draft-shell .draft-team-panel{
        gap:5px;
      }
      .item-draft-shell .draft-section-head{
        gap:4px;
      }
      .item-draft-shell .draft-section-head h3{
        font-size:.88rem;
      }
      .item-draft-summary{
        padding:7px 8px;
      }
      .item-draft-summary-empty{
        padding:7px 8px;
        font-size:.68rem;
      }
      .item-assign-shell{
        min-height:calc(100svh - 16px);
        grid-template-rows:auto auto auto 1fr auto;
      }
      .team-size-6.item-assign-shell{
        grid-template-rows:auto auto auto auto auto;
      }
      .item-assign-status-card{
        padding:8px 10px;
      }
      .item-assign-status-card strong{
        font-size:.82rem;
      }
      .item-assign-item-slide{
        min-height:118px;
      }
      .item-assign-item-slide .item-info-card{
        min-height:118px;
      }
      .item-assign-board{
        min-height:0;
        align-content:stretch;
      }
      .team-size-6 .item-assign-board{
        align-content:start;
      }
      .item-assign-member-carousel{
        height:100%;
        align-items:stretch;
      }
      .team-size-6 .item-assign-member-carousel{
        height:auto;
      }
      .item-assign-member-slide{
        min-height:138px;
        display:flex;
      }
      .team-size-6 .item-assign-member-slide{
        min-height:126px;
      }
      .item-assign-member-slide .item-assign-card.compact{
        min-height:138px;
        height:100%;
      }
      .team-size-6 .item-assign-member-slide .item-assign-card.compact{
        min-height:126px;
      }
      .link-preview-order-panel .preview-card{
        min-height:52px;
        padding:5px 7px;
      }
      .link-preview-order-panel .preview-card .sprite.sm{
        width:30px;
        height:30px;
      }
      .link-preview-order-panel .preview-copy strong{
        font-size:.76rem;
      }
      .link-preview-ready-panel{
        padding:7px;
      }
      .link-preview-ready-panel .empty{
        padding:8px;
      }
      .team-size-6 .item-draft-team-strip{
        grid-template-columns:none;
        gap:5px;
      }
      .team-size-6 .item-draft-team-strip .draft-team-slot{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:center;
        justify-items:stretch;
        text-align:left;
        padding:6px 8px;
        min-height:56px;
        height:56px;
      }
      .team-size-6 .item-draft-grid{
        display:grid;
        grid-auto-flow:column;
        grid-auto-columns:76%;
        grid-template-columns:none;
        gap:6px;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
        scroll-snap-type:x proximity;
        align-items:start;
      }
      .team-size-6 .item-draft-grid::-webkit-scrollbar{display:none}
      .team-size-6 .item-draft-grid .item-draft-card{
        scroll-snap-align:start;
        min-width:0;
        min-height:106px;
        height:auto;
        align-self:start;
        padding:8px;
        gap:5px;
        grid-template-rows:auto auto auto;
      }
      .team-size-6 .item-draft-grid .item-draft-card > .tiny{
        -webkit-line-clamp:2;
        min-height:2.2em;
      }
      .team-size-6 .item-draft-grid .item-draft-card .card-actions .primary-btn{
        min-height:32px;
        padding:5px 8px;
      }
      .team-size-6.item-draft-shell .draft-team-slot-head{
        grid-template-columns:auto minmax(0,1fr);
        justify-items:start;
        gap:6px;
      }
      .team-size-6.item-draft-shell .draft-team-slot-copy{
        width:100%;
      }
      .team-size-6.item-draft-shell .draft-team-slot-copy strong{
        display:block;
        font-size:.68rem;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .team-size-6 .reroll-toolbar{
        padding:8px;
        gap:6px;
      }
      .team-size-6 .reroll-toolbar-copy{
        gap:6px;
      }
      .team-size-6 .reroll-toolbar-copy h2{
        font-size:clamp(1.24rem,6.4vw,1.7rem);
      }
      .team-size-6 .reroll-toolbar-copy p{
        display:none;
      }
      .team-size-6 .reroll-toolbar-stats{
        gap:6px;
      }
      .team-size-6 .reroll-stat-card{
        padding:8px;
      }
      .team-size-6 .reroll-stat-card:last-child{
        display:none;
      }
      .team-size-6 .reroll-team-tabs{
        gap:6px;
      }
      .team-size-6 .reroll-team-tab{
        min-width:104px;
        padding:6px 7px;
      }
      .team-size-6 .reroll-team-tab-sprite{
        width:24px;
        height:24px;
      }
      .team-size-6 .reroll-team-tab-name{
        font-size:.62rem;
      }
      .team-size-6 .reroll-footer{
        gap:6px;
      }
      .team-size-6 .reroll-footer .primary-btn{
        padding:9px 12px;
      }
      .team-size-6 .reroll-grid{
        grid-template-columns:1fr;
        gap:6px;
      }
      .team-size-6 .reroll-card{
        padding:8px;
        gap:6px;
      }
      .team-size-6 .reroll-card h3{
        font-size:.92rem;
      }
      .team-size-6 .reroll-card-body{
        grid-template-columns:46px minmax(0,1fr);
        gap:6px;
      }
      .team-size-6 .reroll-card-sprite .sprite.sm{
        width:38px;
        height:38px;
      }
      .team-size-6 .reroll-move-list{
        grid-template-columns:1fr 1fr;
        gap:5px;
      }
      .team-size-6 .reroll-move-tile{
        padding:7px;
        gap:6px;
      }
      .team-size-6 .reroll-move-btn{
        min-height:30px;
        padding:5px 6px;
        font-size:.7rem;
      }
      .team-size-6 .item-assign-item-carousel{
        gap:6px;
      }
      .team-size-6 .item-assign-item-detail-carousel{
        gap:6px;
      }
      .team-size-6 .item-picker-card{
        flex-basis:76%;
        padding:8px 10px;
      }
      .team-size-6 .item-draft-summary{
        padding:7px 9px;
        gap:6px;
      }
      .team-size-6 .item-draft-summary-head strong{
        font-size:.76rem;
      }
      .team-size-6 .item-draft-summary-head span{
        font-size:.62rem;
      }
      .team-size-6 .item-picker-card-head strong{
        font-size:.88rem;
      }
      .team-size-6 .item-assign-member-carousel{
        gap:6px;
      }
      .team-size-6 .item-assign-member-slide{
        flex-basis:80%;
      }
      .team-size-6 .item-assign-card.compact{
        padding:8px;
        gap:6px;
      }
      .team-size-6 .item-assign-card.compact .item-assign-head .sprite.sm{
        width:34px;
        height:34px;
      }
      .team-size-6 .item-assign-card.compact .item-assign-current .item-pill{
        padding:5px 7px;
        font-size:.68rem;
      }
      .team-size-6 .item-assign-card.compact .card-actions .primary-btn,
      .team-size-6 .item-assign-card.compact .card-actions .ghost-btn{
        padding:6px 8px;
        font-size:.72rem;
      }
      .team-size-6 .item-assign-item-detail-carousel .item-info-card{
        padding:9px 10px;
        gap:7px;
        min-height:116px;
      }
      .team-size-6 .item-assign-item-slide{
        flex-basis:80%;
      }
      .team-size-6 .item-assign-item-detail-carousel .item-info-head strong{
        font-size:.82rem;
      }
      .team-size-6 .item-assign-item-detail-carousel .item-info-desc{
        font-size:.68rem;
        line-height:1.22;
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
      .battle-panel .bench-card .bench-card-switch-note{
        font-size:.58rem;
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
    @media (max-width:380px) and (max-height:760px){
      .draft-view{
        height:auto;
        min-height:calc(100svh - 16px);
      }
      .team-size-6 .draft-shell{
        gap:4px;
      }
      .draft-view .main{
        height:auto;
        overflow:visible;
      }
      .link-setup-copy,.link-setup-stage-card,.link-setup-card{
        padding:7px;
        gap:5px;
      }
      .link-setup-copy h2{
        font-size:clamp(1.18rem,6vw,1.55rem);
        line-height:.96;
      }
      .link-setup-copy p,.link-setup-card p{
        font-size:.78rem;
        line-height:1.28;
      }
      .link-card-note{
        display:none;
      }
      .link-setup-step-grid{
        gap:3px;
      }
      .link-setup-step{
        padding:5px 4px;
        gap:4px;
        text-align:center;
      }
      .link-setup-step span{
        width:20px;
        height:20px;
        justify-self:center;
      }
      .link-setup-step strong{
        font-size:.6rem;
        line-height:1.08;
        letter-spacing:-.01em;
      }
      .link-code-box{
        min-height:40px;
        font-size:.8rem;
      }
      .preview-hero-slot{
        padding:5px;
      }
      .preview-hero-slot strong{
        font-size:.72rem;
        line-height:1.06;
      }
      .preview-hero-slot div{
        display:none;
      }
      .link-preview-order-panel .preview-card{
        min-height:50px;
        padding:5px 6px;
      }
      .link-preview-order-panel .preview-card .sprite.sm{
        width:28px;
        height:28px;
      }
      .link-preview-order-panel .preview-actions{
        gap:3px;
      }
      .link-preview-order-panel .preview-actions .info-chip,
      .link-preview-order-panel .preview-actions .lead-chip{
        padding:4px 5px;
        font-size:.58rem;
      }
      .link-preview-ready-panel{
        padding:6px;
        gap:5px;
      }
      .link-preview-ready-panel .draft-section-head h3{
        font-size:.98rem;
        line-height:1.02;
      }
      .link-preview-ready-panel .empty{
        padding:7px;
      }
      .link-preview-ready-panel .actions .primary-btn,
      .link-preview-ready-panel .actions .ghost-btn{
        padding:7px 8px;
        font-size:.74rem;
      }
      .reroll-card{
        padding:8px;
        gap:6px;
      }
      .reroll-card-body{
        grid-template-columns:46px minmax(0,1fr);
        gap:6px;
      }
      .reroll-card-sprite .sprite.sm{
        width:36px;
        height:36px;
      }
      .reroll-move-list{
        gap:5px;
      }
      .reroll-move-tile{
        padding:6px;
        gap:5px;
      }
      .reroll-move-btn{
        min-height:28px;
        padding:4px 5px;
        font-size:.66rem;
      }
      .team-size-6 .item-draft-team-strip{
        grid-template-columns:none;
        gap:4px;
      }
      .team-size-6 .item-draft-team-strip .draft-team-slot{
        padding:5px 7px;
        min-height:52px;
        height:52px;
      }
      .team-size-6 .item-draft-team-strip .draft-team-slot .sprite.sm{
        width:22px;
        height:22px;
      }
      .team-size-6 .item-draft-team-strip .draft-team-slot .info-chip{
        min-height:24px;
        padding:3px 7px;
        font-size:.56rem;
      }
      .team-size-6 .draft-team-panel .item-pool-strip .item-pill{
        padding:4px 7px;
        font-size:.62rem;
      }
      .team-size-6 .item-draft-grid{
        grid-auto-columns:74%;
        gap:5px;
      }
      .team-size-6 .item-draft-card{
        min-height:98px;
        height:auto;
        align-self:start;
      }
      .team-size-6 .item-draft-card > .tiny{
        font-size:.64rem;
        line-height:1.16;
        min-height:2.1em;
      }
      .team-size-6 .draft-team-panel .item-pool-strip .item-pill{
        padding:5px 8px;
        font-size:.66rem;
      }
      .team-size-6.item-draft-shell .item-draft-team-strip .draft-team-slot{
        flex-basis:48%;
        min-height:58px;
        height:58px;
      }
      .team-size-6.item-assign-shell .preview-hero-panel,
      .team-size-6.preview-shell .preview-hero-panel,
      .team-size-6.link-preview-shell .draft-hero-panel{
        display:none;
      }
      .team-size-6 .item-assign-item-carousel{
        gap:5px;
      }
      .team-size-6 .item-picker-card{
        flex-basis:74%;
      }
      .team-size-6 .item-assign-card.compact{
        padding:6px;
        gap:5px;
      }
      .team-size-6 .item-assign-card.compact .item-assign-head{
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:5px;
      }
      .team-size-6 .item-assign-card.compact .item-assign-head .sprite.sm{
        width:32px;
        height:32px;
      }
      .team-size-6 .item-assign-card.compact .item-assign-head .info-chip{
        justify-self:end;
      }
      .team-size-6 .item-assign-card.compact .item-assign-current .item-pill{
        padding:4px 6px;
        font-size:.62rem;
      }
      .team-size-6 .item-assign-card.compact .card-actions{
        grid-template-columns:1fr 1fr;
        gap:4px;
      }
      .team-size-6 .item-assign-card.compact .card-actions .primary-btn,
      .team-size-6 .item-assign-card.compact .card-actions .ghost-btn{
        min-height:30px;
        padding:5px 6px;
        font-size:.66rem;
      }
      .team-size-6 .item-assign-item-detail-carousel .item-info-card{
        padding:8px;
        gap:6px;
        min-height:98px;
      }
      .team-size-6 .item-assign-item-detail-carousel .item-info-head strong{
        font-size:.76rem;
      }
      .team-size-6 .item-assign-item-detail-carousel .item-info-desc{
        font-size:.64rem;
      }
      .team-size-6 .item-assign-progress-strip{
        margin-top:2px;
      }
      .team-size-6 .preview-card-list{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:4px;
      }
      .team-size-6 .preview-card{
        grid-template-columns:34px minmax(0,1fr);
        gap:4px;
        min-height:0;
        padding:5px;
      }
      .team-size-6 .preview-card .sprite.sm{
        width:26px;
        height:26px;
      }
      .team-size-6 .preview-rank{
        width:20px;
        height:20px;
        font-size:.62rem;
      }
      .team-size-6 .preview-copy strong{
        font-size:.7rem;
      }
      .team-size-6 .preview-actions{
        grid-column:1 / -1;
        justify-content:start;
      }
      .team-size-6 .preview-side-panel .actions .primary-btn,
      .team-size-6 .preview-side-panel .actions .ghost-btn{
        min-height:32px;
        padding:6px 8px;
        font-size:.68rem;
      }
      .team-size-6 .battle-header p{
        display:none;
      }
      .team-size-6 .battle-stage{
        height:250px;
        min-height:250px;
      }
      .team-size-6 .battle-panel .bench-grid{
        display:flex;
        gap:4px;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
      }
      .team-size-6 .battle-panel .bench-grid::-webkit-scrollbar{display:none}
      .team-size-6 .battle-panel .bench-card{
        flex:0 0 31%;
        min-height:58px;
        padding:4px;
      }
      .team-size-6 .battle-panel .bench-card-switch{
        grid-template-columns:1fr;
        justify-items:center;
        text-align:center;
        gap:3px;
      }
      .team-size-6 .battle-panel .bench-card-copy{
        justify-items:center;
      }
      .team-size-6 .battle-panel .bench-card .tiny,
      .team-size-6 .battle-panel .bench-card .bench-card-switch-note{
        display:none;
      }
      .team-size-6 .battle-panel .bench-card strong{
        font-size:.66rem;
      }
      .team-size-6 .battle-panel .bench-card .info-chip{
        min-width:42px;
        min-height:26px;
        padding:4px 7px;
        font-size:.58rem;
      }
      .team-size-6 .battle-panel .sprite.sm{
        width:34px;
        height:34px;
      }
      .team-size-6 .battle-actions-panel{
        padding:5px;
      }
      .team-size-6 .choice-grid{
        gap:4px;
      }
      .team-size-6 .choice-btn{
        min-height:32px;
        padding:4px 6px;
        font-size:.72rem;
      }
    }
  `;
  document.head.appendChild(style);
}

injectStyles();
render();
window.__pokemonBattlerDebug = {
  state,
  render,
  battleText,
  ensureAttackAnimationAssets,
  playBattleMoveAnimation,
  startBattleSimulation,
  shouldAnimateMove,
  planBattleAnimations,
  buildAttackTimeline,
  resolveAttackPreviewMove,
};

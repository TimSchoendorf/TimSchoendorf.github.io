const DATA_PATH = './pokemon-attack-preview-data.json';
const SHEET_PATH = '../assets/pokemon-attack-spritesheet.png';
const PLAYER_SPRITE = '../assets/pokemon-rby-clean/red-green/back/6.png';
const FOE_SPRITE = '../assets/pokemon-rby-clean/red-green/9.png';

const SAMPLE = {
  attacker: {name: 'Charizard', sprite: PLAYER_SPRITE},
  defender: {name: 'Blastoise', sprite: FOE_SPRITE},
};

const ATLAS = {
  star: {x: 72, y: 16, w: 16, h: 16},
  spark: {x: 96, y: 16, w: 16, h: 16},
  slash: {x: 24, y: 0, w: 16, h: 16},
  horn: {x: 168, y: 0, w: 16, h: 16},
  coin: {x: 192, y: 16, w: 16, h: 16},
};

const FAMILY = {
  impact: {duration: 1450, hitAt: 0.48, attackerMotion: 'lunge', targetMotion: 'shake', effect: {type: 'burst'}},
  slash: {duration: 1320, hitAt: 0.45, attackerMotion: 'lunge', targetMotion: 'shake', effect: {type: 'slash'}},
  horn: {duration: 1480, hitAt: 0.58, attackerMotion: 'lunge', targetMotion: 'shake', effect: {type: 'spikes'}},
  coin: {duration: 1580, hitAt: 0.64, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'coins'}},
  kick: {duration: 1360, hitAt: 0.52, attackerMotion: 'lunge', targetMotion: 'shake', effect: {type: 'burst'}},
  wind: {duration: 1560, hitAt: 0.62, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'wind'}},
  vine: {duration: 1640, hitAt: 0.68, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'vine'}},
  bind: {duration: 1680, hitAt: 0.62, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'rings'}},
  sand: {duration: 1500, hitAt: 0.58, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'dust'}},
  fang: {duration: 1320, hitAt: 0.46, attackerMotion: 'lunge', targetMotion: 'shake', effect: {type: 'fang'}},
  fire: {duration: 1650, hitAt: 0.7, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'fire'}},
  fireblast: {duration: 1760, hitAt: 0.74, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'fireblast'}},
  water: {duration: 1540, hitAt: 0.62, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'rain'}},
  bubble: {duration: 1560, hitAt: 0.66, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'bubbles'}},
  surf: {duration: 1710, hitAt: 0.72, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'surf'}},
  hydropump: {duration: 1720, hitAt: 0.66, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'hydro'}},
  ice: {duration: 1600, hitAt: 0.68, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'ice'}},
  electric: {duration: 1580, hitAt: 0.66, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'electric'}},
  beam: {duration: 1560, hitAt: 0.62, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'beam'}},
  rock: {duration: 1520, hitAt: 0.68, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'rocks'}},
  seismic: {duration: 1730, hitAt: 0.72, attackerMotion: 'lunge', targetMotion: 'toss', effect: {type: 'seismic'}},
  leech: {duration: 1780, hitAt: 0.44, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'drain'}},
  petal: {duration: 1680, hitAt: 0.7, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'petal'}},
  string: {duration: 1620, hitAt: 0.66, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'string'}},
  transform: {duration: 1780, hitAt: 0.46, attackerMotion: 'vanish', targetMotion: 'none', effect: {type: 'self'}},
  barrier: {duration: 1450, hitAt: 0.42, attackerMotion: 'none', targetMotion: 'none', effect: {type: 'barrier'}},
  minimize: {duration: 1450, hitAt: 0.42, attackerMotion: 'none', targetMotion: 'none', effect: {type: 'ringSelf'}},
  defensecurl: {duration: 1450, hitAt: 0.42, attackerMotion: 'curl', targetMotion: 'none', effect: {type: 'ringSelf'}},
  selfdestruct: {duration: 1880, hitAt: 0.72, attackerMotion: 'none', targetMotion: 'shake', effect: {type: 'explode'}},
  smog: {duration: 1650, hitAt: 0.72, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'cloud', color: '#7b7a89'}},
  swift: {duration: 1650, hitAt: 0.76, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'swift'}},
  heal: {duration: 1450, hitAt: 0.4, attackerMotion: 'none', targetMotion: 'none', effect: {type: 'heal'}},
  kiss: {duration: 1500, hitAt: 0.72, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'kiss'}},
  triattack: {duration: 1650, hitAt: 0.74, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'tri'}},
  substitute: {duration: 1600, hitAt: 0.44, attackerMotion: 'none', targetMotion: 'none', effect: {type: 'substitute'}},
  confusion: {duration: 1660, hitAt: 0.72, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'confusion'}},
  sleep: {duration: 1500, hitAt: 0.66, attackerMotion: 'hop', targetMotion: 'none', effect: {type: 'sleep'}},
  poison: {duration: 1500, hitAt: 0.68, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'cloud', color: '#8456bf'}},
  sound: {duration: 1450, hitAt: 0.58, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'sound'}},
  'status-self': {duration: 1380, hitAt: 0.36, attackerMotion: 'none', targetMotion: 'none', effect: {type: 'self'}},
  'status-target': {duration: 1460, hitAt: 0.62, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'statusTarget'}},
  dig: {duration: 1650, hitAt: 0.74, attackerMotion: 'dig', targetMotion: 'shake', effect: {type: 'rocks'}},
  fly: {duration: 1750, hitAt: 0.78, attackerMotion: 'fly', targetMotion: 'shake', effect: {type: 'swoop'}},
  skullbash: {duration: 1820, hitAt: 0.82, attackerMotion: 'charge', targetMotion: 'shake', effect: {type: 'burst'}},
  teleport: {duration: 1550, hitAt: 0.48, attackerMotion: 'vanish', targetMotion: 'none', effect: {type: 'self'}},
  psywave: {duration: 1650, hitAt: 0.72, attackerMotion: 'hop', targetMotion: 'shake', effect: {type: 'psywave'}},
};

const STYLES = `
  :root{color-scheme:dark;--bg:#07120d;--panel:#0f211a;--line:rgba(173,209,188,.16);--text:#eef6ee;--muted:#b7cfbe;--gold:#e5c965;--accent:#8fd1ff}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;font-family:Georgia,"Times New Roman",serif;background:radial-gradient(circle at top left, rgba(206,175,86,.18), transparent 26%),radial-gradient(circle at top right, rgba(60,126,110,.2), transparent 24%),linear-gradient(180deg, #08140f 0%, #0d1914 100%);color:var(--text)}
  .label{font-size:.74rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(235,241,231,.74)}
  .attack-preview-shell{width:min(1420px,calc(100vw - 28px));margin:0 auto;padding:22px 0 30px;display:grid;gap:18px}
  .attack-preview-header,.attack-preview-controls,.attack-preview-panel,.attack-preview-move-list{background:linear-gradient(180deg, rgba(19,37,31,.96), rgba(12,25,20,.98));border:1px solid var(--line);border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.25)}
  .attack-preview-header{padding:24px 26px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}
  .attack-preview-header h1,.attack-preview-current h3,.attack-preview-panel-head h2{margin:4px 0 0;font-size:clamp(1.8rem,2vw + 1rem,3rem);line-height:.95}
  .attack-preview-header p,.attack-preview-current p{margin:10px 0 0;max-width:72ch;color:var(--muted);line-height:1.4}
  .attack-preview-meta{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .attack-preview-meta span,.attack-preview-status{padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#e3eedf;font-size:.92rem}
  .attack-preview-stage-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(300px,.82fr);gap:16px;align-items:start}
  .attack-preview-panel{padding:18px;display:grid;gap:14px;overflow:hidden}
  .attack-preview-panel-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
  .attack-preview-stage{border-radius:24px;padding:14px;background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.06)}
  .attack-preview-stage.desktop{aspect-ratio:16/10}
  .attack-preview-stage.mobile{aspect-ratio:430/932;max-width:300px;width:100%;margin:0 auto}
  .attack-preview-stage-field{position:relative;width:100%;height:100%;overflow:hidden;border-radius:22px;background:radial-gradient(circle at 68% 20%, rgba(255,255,255,.16), transparent 28%),linear-gradient(180deg, #e7edd8 0%, #dce0c8 56%, #bcc7a5 56.4%, #b7c29f 100%);box-shadow:inset 0 0 0 2px rgba(10,18,14,.12)}
  .attack-preview-stage-field::before{content:"";position:absolute;left:50%;bottom:15%;width:32%;height:11%;border-radius:50%;transform:translateX(-50%);background:radial-gradient(circle, rgba(39,57,32,.28), rgba(39,57,32,.06) 62%, transparent 75%)}
  .attack-preview-stage-field::after{content:"";position:absolute;left:16%;bottom:28%;width:34%;height:13%;border-radius:50%;background:radial-gradient(circle, rgba(39,57,32,.3), rgba(39,57,32,.06) 60%, transparent 76%)}
  .attack-preview-hud{position:absolute;z-index:3;display:grid;gap:6px;min-width:182px;padding:12px 14px 10px;background:rgba(243,247,232,.96);color:#223126;border:3px solid #233323;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.14)}
  .attack-preview-hud.foe{top:6%;left:5%}
  .attack-preview-hud.player{right:5%;bottom:28%}
  .attack-preview-hud-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
  .attack-preview-hud-name{font-size:1.08rem;font-weight:700;line-height:1}
  .attack-preview-hud-level{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#4a5d47}
  .attack-preview-hp-row{display:flex;align-items:center;gap:10px}
  .attack-preview-hp-label{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:#556850}
  .attack-preview-hp-bar{position:relative;flex:1;height:12px;background:#607154;border:2px solid #203120;border-radius:999px;overflow:hidden}
  .attack-preview-hp-fill{position:absolute;inset:0 auto 0 0;width:100%;background:linear-gradient(90deg, #68d973 0%, #d6eb78 52%, #f2cb58 100%);transition:width 60ms linear}
  .attack-preview-hp-value{font-size:.78rem;font-weight:700;color:#33452f}
  .attack-preview-mon{position:absolute;display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
  .attack-preview-mon img{width:100%;height:100%;object-fit:contain;object-position:center bottom;image-rendering:pixelated;filter:drop-shadow(0 12px 0 rgba(255,255,255,.18)) drop-shadow(0 20px 18px rgba(0,0,0,.22));transition:transform 70ms linear, opacity 90ms linear, filter 80ms linear}
  .attack-preview-mon.foe{top:14%;right:7%;width:27%;height:30%}
  .attack-preview-mon.player{left:6%;bottom:17%;width:30%;height:34%}
  .attack-preview-mon img.hurt{filter:brightness(1.8) contrast(1.3) drop-shadow(0 0 10px rgba(255,255,255,.75))}
  .attack-preview-log{position:absolute;left:4%;right:4%;bottom:4%;min-height:80px;display:grid;place-items:center;padding:12px 16px;background:rgba(249,249,240,.93);color:#213123;border:3px solid #243525;border-radius:20px;text-align:center;font-size:1rem;line-height:1.3;box-shadow:0 10px 28px rgba(0,0,0,.16);z-index:4}
  .attack-preview-stage canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .attack-preview-controls{padding:18px 22px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
  .attack-preview-buttons{display:flex;flex-wrap:wrap;gap:10px}
  .primary-btn,.ghost-btn,.attack-move-chip{border:none;cursor:pointer;font:inherit}
  .primary-btn,.ghost-btn{padding:12px 18px;border-radius:999px;font-weight:700}
  .primary-btn{background:linear-gradient(180deg, #f0d56f, #d8bb57);color:#223125}
  .ghost-btn{background:rgba(255,255,255,.06);color:var(--text);border:1px solid rgba(255,255,255,.08)}
  .attack-preview-move-list{padding:16px;display:grid;grid-template-columns:repeat(auto-fit, minmax(165px, 1fr));gap:10px;max-height:42vh;overflow:auto}
  .attack-move-chip{display:grid;gap:4px;text-align:left;padding:12px;border-radius:18px;background:rgba(255,255,255,.04);color:var(--text);border:1px solid rgba(255,255,255,.07)}
  .attack-move-chip strong{font-size:.78rem;letter-spacing:.14em;color:#f2d977}
  .attack-move-chip span{font-size:1rem;font-weight:700}
  .attack-move-chip em{font-style:normal;font-size:.8rem;color:var(--muted)}
  .attack-move-chip.active{border-color:rgba(143,209,255,.6);box-shadow:0 0 0 1px rgba(143,209,255,.24);background:rgba(143,209,255,.08)}
  @media (max-width:1080px){.attack-preview-stage-grid{grid-template-columns:1fr}.attack-preview-header,.attack-preview-controls{grid-template-columns:1fr}.attack-preview-meta{justify-content:flex-start}}
  @media (max-width:720px){.attack-preview-shell{width:min(100vw - 16px, 440px);padding:12px 0 20px;gap:12px}.attack-preview-header,.attack-preview-controls,.attack-preview-panel{padding:14px}.attack-preview-header h1,.attack-preview-current h3,.attack-preview-panel-head h2{font-size:1.55rem}.attack-preview-stage.desktop{aspect-ratio:430/350}.attack-preview-log{min-height:68px;font-size:.92rem}.attack-preview-stage.mobile{max-width:252px}.attack-preview-move-list{grid-template-columns:repeat(2,minmax(0,1fr));max-height:36vh}.attack-preview-hud{min-width:122px;padding:8px 10px 8px;gap:4px;border-width:2px;border-radius:14px}.attack-preview-hud.foe{top:5%;left:4%}.attack-preview-hud.player{right:4%;bottom:24%}.attack-preview-hud-name{font-size:.82rem}.attack-preview-hud-level{font-size:.6rem}.attack-preview-hp-label{font-size:.58rem}.attack-preview-hp-row{gap:6px}.attack-preview-hp-bar{height:9px;border-width:1px}.attack-preview-hp-value{font-size:.64rem}.attack-preview-mon.foe{top:16%;right:6%;width:31%;height:26%}.attack-preview-mon.player{left:4%;bottom:18%;width:34%;height:31%}}
`;

const FIXED_DAMAGE_MOVES = new Set(['bide', 'counter', 'dragonrage', 'nightshade', 'psywave', 'seismictoss', 'sonicboom', 'superfang']);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + ((b - a) * t);
const easeOutQuad = (t) => 1 - ((1 - t) * (1 - t));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
const damagesMove = (move) => move.power > 0 || FIXED_DAMAGE_MOVES.has(move.id);

function estimateDamage(move) {
  if (!damagesMove(move)) return 0;
  if (move.id === 'superfang') return 0.5;
  if (move.id === 'sonicboom') return 0.22;
  if (move.id === 'dragonrage') return 0.28;
  if (FIXED_DAMAGE_MOVES.has(move.id)) return 0.34;
  return clamp(0.18 + (Math.max(20, move.power || 40) / 240), 0.2, 0.62);
}

function describeWindup(move) {
  switch (move.variant) {
    case 'thunder': return 'A heavy bolt starts to form overhead.';
    case 'thunderbolt': return 'Electric charge spikes across the field.';
    case 'thundershock': return 'A short electric pulse snaps forward.';
    case 'thunderwave': return 'Paralyzing waves spread outward.';
    case 'watergun': return 'Water gathers high above the target.';
    case 'bubblebeam': return 'A tight stream of bubbles rushes in.';
    case 'hydropump': return 'Water pressure builds below the target.';
    case 'surf': return 'A wave rises across the arena.';
    case 'ember': return 'Small flames spit forward.';
    case 'flamethrower': return 'A stream of fire surges ahead.';
    case 'firespin': return 'A ring of fire begins to tighten.';
    case 'fireblast': return 'Flames gather into a blazing crest.';
    case 'hypnosis': return 'A hypnotic ring forms around the target.';
    case 'sing': return 'A note drifts softly toward the target.';
    case 'lovelykiss': return 'A kiss floats toward the target.';
    case 'powder-sleep': return 'Sleep powder drifts across the field.';
    case 'powder-poison': return 'Poison powder starts to fall.';
    case 'powder-spore': return 'Heavy spores rain down on the target.';
    case 'rest': return 'The user settles into rest.';
    case 'doubleteam': return 'Afterimages begin to split apart.';
    case 'minimize': return 'The user compresses into a smaller outline.';
    case 'transform': return 'The user starts to copy the opposing form.';
    case 'selfdestruct': return 'The user swells with unstable energy.';
    case 'explosion': return 'Energy compresses into a massive blast point.';
    case 'reflect': return 'A reflective wall flashes into place.';
    case 'lightscreen': return 'A light screen shimmers into place.';
    case 'haze': return 'A cold haze spreads over the field.';
    case 'disable': return 'A sealing mark forms around the target.';
    case 'wrap': return 'The target is about to be wrapped tight.';
    case 'clamp': return 'The trap closes from both sides.';
  }
  switch (move.family) {
    case 'beam': return 'Energy focuses into a straight beam.';
    case 'sleep': return 'Drowsy powder drifts toward the target.';
    case 'confusion': return 'Psychic rings start to spiral.';
    case 'barrier': return 'A defensive wall flashes into place.';
    case 'substitute': return 'A stand-in begins to appear.';
    case 'string': return 'Sticky thread races across the field.';
    case 'swift': return 'Stars line up around the user.';
    default: return damagesMove(move) ? 'The strike closes in.' : 'Status energy gathers around the target.';
  }
}

function describeResolution(move, attacker, defender) {
  if (!damagesMove(move)) {
    if (move.family === 'sleep') return `${defender} is lulled by the effect.`;
    if (move.family === 'poison') return `${defender} is left in a toxic cloud.`;
    if (move.family === 'barrier') return `${attacker} is covered by a barrier.`;
    if (move.family === 'substitute') return `${attacker} hides behind a substitute.`;
    if (move.variant === 'doubleteam') return `${attacker} is surrounded by afterimages.`;
    if (move.variant === 'minimize') return `${attacker} becomes harder to pin down.`;
    if (move.variant === 'transform') return `${attacker} takes on the opposing shape.`;
    if (move.variant === 'selfdestruct' || move.variant === 'explosion') return `${attacker} is engulfed in the blast.`;
    if (move.variant === 'rest') return `${attacker} drifts into sleep.`;
    return `${move.name} finishes its status animation.`;
  }
  return `${defender} reels from ${move.name}.`;
}

function buildFrameState(move, side, progress) {
  const family = FAMILY[move.family] || FAMILY.impact;
  const attacker = side === 'player' ? SAMPLE.attacker.name : SAMPLE.defender.name;
  const defender = side === 'player' ? SAMPLE.defender.name : SAMPLE.attacker.name;
  const hitAt = family.hitAt ?? 0.6;
  const impactEnd = Math.min(0.94, hitAt + (damagesMove(move) ? 0.16 : 0.08));
  const damageProgress = clamp((progress - hitAt) / Math.max(0.05, impactEnd - hitAt), 0, 1);
  const hpLoss = estimateDamage(move) * damageProgress;
  const playerHp = side === 'foe' ? 1 - hpLoss : 1;
  const foeHp = side === 'player' ? 1 - hpLoss : 1;
  let logText = `${attacker} used ${move.name}!`;
  if (progress >= 0.18 && progress < hitAt) logText = describeWindup(move);
  if (progress >= hitAt && progress < impactEnd) logText = damagesMove(move) ? `${move.name} hits ${defender}!` : describeWindup(move);
  if (progress >= impactEnd) logText = describeResolution(move, attacker, defender);
  return {logText, playerHp, foeHp, hitActive: damagesMove(move) && progress >= hitAt && progress <= impactEnd};
}

class BattleViewport {
  constructor(root, mode, sheetImage) {
    this.root = root;
    this.mode = mode;
    this.sheetImage = sheetImage;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.playerSprite = root.querySelector('.attack-preview-player');
    this.foeSprite = root.querySelector('.attack-preview-foe');
    this.playerHpFill = root.querySelector('[data-player-hp-fill]');
    this.foeHpFill = root.querySelector('[data-foe-hp-fill]');
    this.playerHpValue = root.querySelector('[data-player-hp-value]');
    this.foeHpValue = root.querySelector('[data-foe-hp-value]');
    this.log = root.querySelector('.attack-preview-log');
  }

  metrics() {
    const mobile = this.mode === 'mobile';
    return {attacker: mobile ? {x: 0.24, y: 0.73} : {x: 0.22, y: 0.72}, defender: mobile ? {x: 0.76, y: 0.27} : {x: 0.78, y: 0.29}, scale: mobile ? 2.2 : 2.6};
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(bounds.width * devicePixelRatio);
    this.canvas.height = Math.round(bounds.height * devicePixelRatio);
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  setLog(text) { this.log.textContent = text; }

  updateHud(state) {
    const playerHp = Math.max(0, Math.round(state.playerHp * 100));
    const foeHp = Math.max(0, Math.round(state.foeHp * 100));
    this.playerHpFill.style.width = `${playerHp}%`;
    this.foeHpFill.style.width = `${foeHp}%`;
    this.playerHpValue.textContent = `${playerHp}/100`;
    this.foeHpValue.textContent = `${foeHp}/100`;
  }

  clearMotion() {
    this.playerSprite.classList.remove('hurt');
    this.foeSprite.classList.remove('hurt');
    this.playerSprite.style.transform = '';
    this.foeSprite.style.transform = '';
    this.playerSprite.style.opacity = '';
    this.foeSprite.style.opacity = '';
  }

  drawMonGhost(side, x, y, width, height, alpha = 0.4) {
    const image = side === 'player' ? this.playerSprite : this.foeSprite;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(image, x - (width / 2), y - height, width, height);
    this.ctx.restore();
  }

  drawSprite(name, x, y, scale, {alpha = 1, rotation = 0, flipX = false} = {}) {
    const sprite = ATLAS[name];
    if (!sprite) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.scale(flipX ? -1 : 1, 1);
    this.ctx.drawImage(this.sheetImage, sprite.x, sprite.y, sprite.w, sprite.h, -(sprite.w * scale) / 2, -(sprite.h * scale) / 2, sprite.w * scale, sprite.h * scale);
    this.ctx.restore();
  }

  drawCircle(x, y, radius, fill, {alpha = 1, stroke = '', lineWidth = 0} = {}) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }
    if (stroke && lineWidth) {
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = stroke;
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawRect(x, y, width, height, fill, {alpha = 1, rotation = 0, stroke = '', lineWidth = 0} = {}) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(-width / 2, -height / 2, width, height);
    if (stroke && lineWidth) {
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = stroke;
      this.ctx.strokeRect(-width / 2, -height / 2, width, height);
    }
    this.ctx.restore();
  }

  drawEllipse(x, y, radiusX, radiusY, fill, {alpha = 1, rotation = 0, stroke = '', lineWidth = 0} = {}) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }
    if (stroke && lineWidth) {
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = stroke;
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawStar(x, y, radius, fill, {alpha = 1, rotation = 0, stroke = '', lineWidth = 0} = {}) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const angle = (-Math.PI / 2) + ((Math.PI / 5) * index);
      const pointRadius = index % 2 === 0 ? radius : radius * 0.45;
      const px = Math.cos(angle) * pointRadius;
      const py = Math.sin(angle) * pointRadius;
      if (index === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }
    if (stroke && lineWidth) {
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = stroke;
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawPolyline(points, color, lineWidth, {alpha = 1} = {}) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) this.ctx.lineTo(points[index][0], points[index][1]);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawBurst(centerX, centerY, count, spread, time, color = '#fff0a8') {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + (time * 5);
      const radius = spread * easeOutQuad(clamp((time - 0.08) / 0.72, 0, 1));
      this.drawCircle(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 4 + (Math.sin(index + time) * 1.5), color, {alpha: 1 - time});
    }
  }

  applySpriteState(state) {
    const {progress, side, family, hitActive} = state;
    const profile = FAMILY[family.family];
    if (!profile) return;
    const attacker = side === 'player' ? this.playerSprite : this.foeSprite;
    const target = side === 'player' ? this.foeSprite : this.playerSprite;
    const local = clamp(progress / (profile.hitAt || 0.5), 0, 1);
    let tx = 0;
    let ty = 0;

    if (profile.attackerMotion === 'lunge') {
      tx = (side === 'player' ? 1 : -1) * Math.sin(local * Math.PI) * 30;
      ty = -Math.sin(local * Math.PI) * 8;
    } else if (profile.attackerMotion === 'hop') {
      ty = -Math.sin(local * Math.PI) * 18;
    } else if (profile.attackerMotion === 'fly') {
      tx = (side === 'player' ? 1 : -1) * Math.sin(local * Math.PI) * 18;
      ty = -Math.sin(local * Math.PI) * 44;
    } else if (profile.attackerMotion === 'dig') {
      ty = Math.sin(local * Math.PI) * 32;
      attacker.style.opacity = progress > 0.24 && progress < 0.62 ? '0.1' : '';
    } else if (profile.attackerMotion === 'charge') {
      tx = (side === 'player' ? 1 : -1) * Math.max(0, progress - 0.55) * 98;
      ty = -Math.sin(Math.min(progress, 0.55) / 0.55 * Math.PI) * 14;
    } else if (profile.attackerMotion === 'vanish') {
      attacker.style.opacity = String(progress < 0.52 ? 1 - (progress * 1.8) : 0.15 + ((progress - 0.52) * 1.6));
    } else if (profile.attackerMotion === 'curl') {
      attacker.style.transform = 'scale(0.92)';
    }

    if (profile.attackerMotion !== 'curl') attacker.style.transform = `translate(${tx}px, ${ty}px)`;

    const hitAt = profile.hitAt ?? 0.6;
    const hurtWindow = hitActive && progress >= hitAt && progress <= Math.min(hitAt + 0.18, 1);
    target.classList.toggle('hurt', hurtWindow && Math.floor(progress * 24) % 2 === 0);

    if (profile.targetMotion === 'shake' && hurtWindow) {
      const shakeX = (Math.floor(progress * 70) % 2 === 0 ? 1 : -1) * 8;
      target.style.transform = `translate(${shakeX}px, 0px)`;
    } else if (profile.targetMotion === 'toss' && hurtWindow) {
      const toss = Math.sin(((progress - hitAt) / 0.18) * Math.PI) * 22;
      target.style.transform = `translate(0px, ${-toss}px)`;
    } else {
      target.style.transform = '';
    }
  }

  renderEffect(state) {
    const {family, side, progress} = state;
    const profile = FAMILY[family.family];
    if (!profile) return;
    const effect = profile.effect;
    const variant = family.variant || family.id || family.family;
    const metrics = this.metrics();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const attacker = side === 'player' ? metrics.attacker : metrics.defender;
    const defender = side === 'player' ? metrics.defender : metrics.attacker;
    const ax = attacker.x * width;
    const ay = attacker.y * height;
    const dx = defender.x * width;
    const dy = defender.y * height;
    const dir = side === 'player' ? 1 : -1;
    const hitAt = profile.hitAt ?? 0.6;
    const localToHit = clamp(progress / hitAt, 0, 1);
    const p = easeInOut(localToHit);

    if (variant === 'thunder') {
      const strikeX = dx + (Math.sin(progress * Math.PI * 10) * 4);
      const strikeY = dy - 14;
      this.drawPolyline([[strikeX - 6, strikeY - 82], [strikeX + 8, strikeY - 48], [strikeX - 5, strikeY - 20], [strikeX + 10, strikeY + 8], [strikeX - 2, strikeY + 38]], '#fff6a0', 8, {alpha: 0.98});
      this.drawPolyline([[strikeX + 16, strikeY - 70], [strikeX + 4, strikeY - 36], [strikeX + 18, strikeY - 6]], '#ffe056', 5, {alpha: 0.88});
      if (progress > hitAt) this.drawBurst(dx, dy, 10, 30, (progress - hitAt) / (1 - hitAt), '#fff685');
      return;
    }
    if (variant === 'thundershock') {
      const x = lerp(ax, dx, p);
      const y = lerp(ay, dy, p);
      this.drawPolyline([[x - 12, y - 20], [x + 2, y - 8], [x - 6, y + 6], [x + 8, y + 18]], '#fff18b', 4, {alpha: 0.95});
      return;
    }
    if (variant === 'thunderwave' || variant === 'stunspore') {
      for (let index = 0; index < 3; index += 1) {
        const t = clamp(progress - (index * 0.08), 0, 1);
        const radius = 12 + (t * 20);
        const color = variant === 'stunspore' ? '#f2e97a' : '#c6d8ff';
        this.drawCircle(dx, dy, radius, '', {alpha: 1 - t, stroke: color, lineWidth: 3});
      }
      if (variant === 'stunspore') {
        for (let index = 0; index < 6; index += 1) {
          const t = clamp(progress * 1.1 - (index * 0.05), 0, 1);
          this.drawCircle(lerp(ax, dx, t) + ((index - 3) * 6), lerp(ay - 14, dy, t), 3, '#efe48a', {alpha: 0.9});
        }
      }
      return;
    }
    if (variant === 'watergun') {
      for (let index = 0; index < 4; index += 1) {
        const t = clamp(localToHit - (index * 0.05), 0, 1);
        const x = dx + ((index - 1) * 8);
        const y = lerp(dy - 96 - (index * 8), dy, easeOutQuad(t));
        this.drawPolyline([[x, y - 14], [x, y + 12]], '#d8f7ff', 7, {alpha: 0.96});
        this.drawPolyline([[x, y - 14], [x, y + 12]], '#7fd7ff', 3, {alpha: 0.96});
      }
      if (progress > hitAt) this.drawBurst(dx, dy, 6, 18, (progress - hitAt) / (1 - hitAt), '#d8f7ff');
      return;
    }
    if (variant === 'bubblebeam') {
      for (let index = 0; index < 7; index += 1) {
        const t = clamp(progress * 1.16 - (index * 0.05), 0, 1);
        const x = lerp(ax, dx, t) + (Math.sin(index + t * Math.PI * 2) * 10);
        const y = lerp(ay, dy, t) + ((index - 3) * 4);
        this.drawCircle(x, y, 7, '', {alpha: 1 - (t * 0.32), stroke: '#bceeff', lineWidth: 3});
      }
      return;
    }
    if (variant === 'waterfall') {
      const baseY = dy + 70;
      for (let index = -1; index <= 1; index += 1) {
        const x = dx + (index * 10);
        const top = lerp(baseY, dy - 20, easeOutQuad(localToHit));
        this.drawPolyline([[x, baseY], [x, top]], '#dff9ff', 8, {alpha: 0.9});
      }
      return;
    }
    if (variant === 'ember' || variant === 'firepunch') {
      for (let index = 0; index < 3; index += 1) {
        const t = clamp(progress * 1.06 - (index * 0.08), 0, 1);
        const x = lerp(ax, dx, t);
        const y = lerp(ay, dy, t) + ((index - 1) * 10);
        this.drawCircle(x, y, 8, '#f49a36', {alpha: 0.94, stroke: '#ffe58b', lineWidth: 2});
      }
      return;
    }
    if (variant === 'flamethrower' || variant === 'dragonrage') {
      const ex = lerp(ax, dx, easeOutQuad(localToHit));
      const ey = lerp(ay, dy, easeOutQuad(localToHit));
      const outer = variant === 'dragonrage' ? '#ffd36b' : '#ffb14c';
      const inner = variant === 'dragonrage' ? '#9f5fff' : '#ff6f2d';
      this.drawPolyline([[ax, ay], [ex, ey]], outer, 12, {alpha: 0.92});
      this.drawPolyline([[ax, ay], [ex, ey]], inner, 6, {alpha: 0.96});
      return;
    }
    if (variant === 'firespin') {
      for (let index = 0; index < 7; index += 1) {
        const angle = (Math.PI * 2 * index) / 7 + (progress * Math.PI * 2.2);
        const radius = 18 + (progress * 22);
        this.drawCircle(dx + Math.cos(angle) * radius, dy + Math.sin(angle) * (radius * 0.8), 7, '#ff9e3e', {alpha: 0.9, stroke: '#ffe27e', lineWidth: 2});
      }
      return;
    }
    if (variant === 'hypnosis') {
      for (let index = 0; index < 4; index += 1) {
        const t = clamp(progress - (index * 0.08), 0, 1);
        this.drawCircle(dx, dy, 10 + (t * 22), '', {alpha: 1 - t, stroke: '#d6b0ff', lineWidth: 3});
      }
      return;
    }
    if (variant === 'sing') {
      for (let index = 0; index < 3; index += 1) {
        const t = clamp(progress - (index * 0.08), 0, 1);
        const x = lerp(ax, dx, t);
        const y = lerp(ay - 10, dy - 10, t) + (Math.sin((t * 8) + index) * 12);
        this.drawPolyline([[x - 8, y + 10], [x - 8, y - 10], [x + 6, y - 5]], '#f3f3f0', 3, {alpha: 1 - t});
        this.drawCircle(x + 7, y + 3, 5, '#f3f3f0', {alpha: 1 - t});
      }
      return;
    }
    if (variant === 'lovelykiss') {
      for (let index = 0; index < 4; index += 1) {
        const t = clamp(progress * 1.08 - (index * 0.07), 0, 1);
        const x = lerp(ax, dx, t);
        const y = lerp(ay, dy, t) + ((index - 1.5) * 10);
        this.drawCircle(x, y, 8, '#ff8dc7', {alpha: 0.92, stroke: '#ffd2eb', lineWidth: 2});
      }
      return;
    }
    if (variant === 'rest') {
      for (let index = 0; index < 3; index += 1) {
        const t = clamp(progress - (index * 0.12), 0, 1);
        const x = ax + 10 + (index * 8);
        const y = ay - 18 - (t * 32);
        this.ctx.save();
        this.ctx.globalAlpha = 1 - t;
        this.ctx.fillStyle = '#f6f6f4';
        this.ctx.font = this.mode === 'mobile' ? 'bold 14px Georgia' : 'bold 18px Georgia';
        this.ctx.fillText('Z', x, y);
        this.ctx.restore();
      }
      return;
    }
    if (variant === 'powder-sleep' || variant === 'powder-poison' || variant === 'powder-spore') {
      const color = variant === 'powder-poison' ? '#c7a1f0' : variant === 'powder-spore' ? '#efe8a1' : '#f3f3f0';
      for (let index = 0; index < 10; index += 1) {
        const t = clamp(progress * 1.05 - (index * 0.04), 0, 1);
        const x = dx + (((index % 5) - 2) * 9);
        const y = lerp(dy - 76 - Math.floor(index / 5) * 18, dy + 18, easeOutQuad(t));
        this.drawCircle(x, y, 3 + (index % 2), color, {alpha: 0.9 - (t * 0.35)});
      }
      return;
    }
    if (variant === 'poisongas' || variant === 'sludge' || variant === 'smokescreen') {
      const color = variant === 'sludge' ? '#5d5068' : variant === 'smokescreen' ? '#8a8795' : '#7c63a4';
      for (let index = 0; index < 5; index += 1) {
        const t = clamp(progress - (index * 0.06), 0, 1);
        const x = lerp(ax, dx, t) + (index * 6 * dir);
        const y = lerp(ay, dy, t) - (index * 5);
        this.drawCircle(x, y, 11 + (index * 2), color, {alpha: 0.86 - (t * 0.4)});
      }
      return;
    }
    if (variant === 'confuseray') {
      for (let index = 0; index < 4; index += 1) {
        const t = clamp(progress - (index * 0.05), 0, 1);
        this.drawCircle(dx, dy, 10 + (t * 20), '', {alpha: 1 - t, stroke: '#f2f6ff', lineWidth: 2});
      }
      return;
    }
    if (variant === 'psychic' || variant === 'nightshade') {
      for (let index = 0; index < 5; index += 1) {
        const y = dy - 36 + (index * 18);
        const amp = 10 + (index * 2);
        const phase = progress * Math.PI * 4 + index;
        this.drawPolyline([[dx - 34, y + Math.sin(phase) * amp], [dx, y - Math.sin(phase) * amp], [dx + 34, y + Math.sin(phase + 1.2) * amp]], variant === 'nightshade' ? '#9c79ff' : '#d4b7ff', 3, {alpha: 0.78});
      }
      if (variant === 'psychic') {
        this.drawCircle(dx, dy, 20 + (Math.sin(progress * Math.PI) * 8), '', {alpha: 0.55, stroke: '#f0dcff', lineWidth: 2});
        this.drawEllipse(dx, dy, 48, 22, '', {alpha: 0.45, stroke: '#edd8ff', lineWidth: 2});
      }
      if (variant === 'nightshade') this.drawEllipse(dx, dy, 42, 18, 'rgba(92, 48, 142, .18)', {alpha: 0.6, stroke: '#7f61c9', lineWidth: 2});
      return;
    }
    if (variant === 'psybeam') {
      const ex = lerp(ax, dx, easeOutQuad(localToHit));
      const ey = lerp(ay, dy, easeOutQuad(localToHit));
      this.drawPolyline([[ax, ay], [ex, ey]], '#ff8fd7', 10, {alpha: 0.88});
      this.drawPolyline([[ax, ay], [ex, ey]], '#7be2ff', 5, {alpha: 0.92});
      return;
    }
    if (variant === 'psywave') {
      for (let index = 0; index < 4; index += 1) {
        const t = clamp(progress - (index * 0.08), 0, 1);
        const x = lerp(ax, dx, t);
        const y = lerp(ay, dy, t) + (Math.sin((t * Math.PI * 4) + index) * 14);
        this.drawCircle(x, y, 9 + (t * 10), '', {alpha: 1 - t, stroke: '#b78cff', lineWidth: 3});
      }
      return;
    }
    if (variant === 'doubleteam') {
      const ghosts = [
        {x: ax - 34, y: ay + 8, alpha: 0.42},
        {x: ax + 34, y: ay + 2, alpha: 0.38},
        {x: ax + 6, y: ay - 18, alpha: 0.3},
      ];
      for (const ghost of ghosts) {
        this.drawMonGhost(side, ghost.x, ghost.y + 14, this.mode === 'mobile' ? 40 : 56, this.mode === 'mobile' ? 40 : 56, ghost.alpha);
      }
      this.drawBurst(ax, ay - 10, 5, 16, progress, '#f3fbff');
      return;
    }
    if (variant === 'minimize') {
      const pulse = 0.55 + (Math.sin(progress * Math.PI) * 0.12);
      this.drawCircle(ax, ay - 10, 16 + (progress * 10), '', {alpha: 0.8, stroke: '#eef7ff', lineWidth: 3});
      this.drawRect(ax, ay - 10, 26 * pulse, 26 * pulse, 'rgba(225,245,255,.18)', {alpha: 0.5, stroke: '#eef7ff', lineWidth: 2});
      return;
    }
    if (variant === 'transform') {
      const t = progress < 0.5 ? progress / 0.5 : (progress - 0.5) / 0.5;
      if (progress < 0.5) {
        this.drawBurst(ax, ay - 6, 8, 22, progress * 2, '#d9f6ff');
        this.drawCircle(ax, ay - 8, 18 + (progress * 16), '', {alpha: 0.9 - progress, stroke: '#d9f6ff', lineWidth: 3});
      } else {
        this.drawBurst(ax, ay - 6, 8, 22, t, '#d9f6ff');
        this.drawMonGhost(side === 'player' ? 'foe' : 'player', ax, ay + 10, this.mode === 'mobile' ? 42 : 58, this.mode === 'mobile' ? 42 : 58, 0.35 + (t * 0.25));
      }
      return;
    }
    if (variant === 'substitute') {
      const x = ax;
      const y = ay - 20;
      this.drawRect(x, y, 46, 56, 'rgba(127,215,144,.3)', {stroke: '#c4ffd0', lineWidth: 3, alpha: 0.9});
      this.drawMonGhost(side, x, y + 12, this.mode === 'mobile' ? 30 : 42, this.mode === 'mobile' ? 30 : 42, 0.24);
      return;
    }
    if (variant === 'reflect' || variant === 'lightscreen') {
      const x = ax;
      const y = ay - 28;
      const color = variant === 'reflect' ? '#dff5ff' : '#fff2a8';
      const fill = variant === 'reflect' ? 'rgba(201, 241, 255, .32)' : 'rgba(255, 237, 147, .28)';
      this.drawRect(x, y, 92, 102, fill, {stroke: color, lineWidth: 4, alpha: 0.84});
      this.drawRect(x, y, 76, 88, 'rgba(255,255,255,.12)', {stroke: color, lineWidth: 2, alpha: 0.5});
      this.drawPolyline([[x - 34, y - 38], [x - 10, y + 6], [x + 14, y - 36]], color, 2, {alpha: 0.48});
      this.drawPolyline([[x - 10, y - 42], [x + 14, y + 4], [x + 38, y - 36]], color, 2, {alpha: 0.34});
      if (variant === 'lightscreen') {
        this.drawPolyline([[x - 36, y - 34], [x, y - 50], [x + 36, y - 34]], '#fff8b8', 3, {alpha: 0.96});
        this.drawPolyline([[x - 36, y + 34], [x, y + 50], [x + 36, y + 34]], '#fff8b8', 3, {alpha: 0.76});
      }
      if (variant === 'reflect') {
        this.drawPolyline([[x - 30, y - 22], [x, y - 40], [x + 30, y - 22]], '#e6fbff', 3, {alpha: 0.92});
        this.drawPolyline([[x - 30, y + 22], [x, y + 40], [x + 30, y + 22]], '#e6fbff', 3, {alpha: 0.78});
      }
      return;
    }
    if (variant === 'wrap' || variant === 'bind' || variant === 'clamp' || variant === 'constrict') {
      const baseX = dx;
      const baseY = dy - 2;
      const stroke = variant === 'clamp' ? '#eef7ff' : variant === 'bind' ? '#c6f2bf' : variant === 'wrap' ? '#f0f0d2' : '#b6efb0';
      for (let index = 0; index < 3; index += 1) {
        const t = clamp(progress - (index * 0.06), 0, 1);
        const alpha = 0.9 - (index * 0.14);
        const radiusX = variant === 'constrict' ? 30 - (index * 3) : variant === 'clamp' ? 34 - (index * 2) : 38 - (index * 4);
        const radiusY = variant === 'wrap' ? 18 + (index * 5) : variant === 'clamp' ? 30 + (index * 4) : 22 + (index * 4);
        this.drawEllipse(baseX, baseY, radiusX + (t * 2), radiusY, '', {alpha, stroke, lineWidth: 4});
        if (variant === 'wrap') {
          this.drawPolyline([[baseX - radiusX, baseY - radiusY + 6], [baseX, baseY], [baseX + radiusX, baseY + radiusY - 6]], stroke, 4, {alpha: alpha - 0.08});
        } else if (variant === 'bind') {
          this.drawPolyline([[baseX - radiusX + 6, baseY - radiusY], [baseX - 3, baseY + 4], [baseX + radiusX - 6, baseY - radiusY]], stroke, 4, {alpha: alpha - 0.05});
        } else if (variant === 'constrict') {
          this.drawPolyline([[baseX - radiusX, baseY + 4], [baseX, baseY - radiusY], [baseX + radiusX, baseY + 4]], stroke, 4, {alpha: alpha - 0.06});
          this.drawPolyline([[baseX - radiusX + 8, baseY - 6], [baseX, baseY + radiusY], [baseX + radiusX - 8, baseY - 6]], stroke, 3, {alpha: alpha - 0.1});
        }
      }
      if (variant === 'clamp') {
        this.drawPolyline([[baseX - 42, baseY - 34], [baseX - 8, baseY], [baseX - 42, baseY + 34]], '#f5f5ee', 6, {alpha: 0.96});
        this.drawPolyline([[baseX + 42, baseY - 34], [baseX + 8, baseY], [baseX + 42, baseY + 34]], '#f5f5ee', 6, {alpha: 0.96});
        this.drawCircle(baseX, baseY, 12, '', {alpha: 0.72, stroke: '#f5f5ee', lineWidth: 3});
      }
      return;
    }
    if (variant === 'haze') {
      for (let index = 0; index < 8; index += 1) {
        const t = clamp(progress - (index * 0.04), 0, 1);
        const x = dx + (((index % 4) - 1.5) * 18);
        const y = dy - 30 + (Math.floor(index / 4) * 28) - (t * 8);
        this.drawCircle(x, y, 18 + ((index % 2) * 4), '#dbe7ef', {alpha: 0.44});
      }
      return;
    }
    if (variant === 'disable') {
      this.drawCircle(dx, dy, 26 + (Math.sin(progress * Math.PI) * 8), '', {alpha: 0.8, stroke: '#f6d57a', lineWidth: 3});
      this.drawPolyline([[dx - 18, dy - 18], [dx + 18, dy + 18]], '#f6d57a', 4, {alpha: 0.8});
      this.drawPolyline([[dx - 18, dy + 18], [dx + 18, dy - 18]], '#f6d57a', 4, {alpha: 0.8});
      return;
    }
    if (variant === 'selfdestruct' || variant === 'explosion') {
      const centerX = lerp(ax, dx, variant === 'explosion' ? 0.54 : 0.5);
      const centerY = lerp(ay, dy, variant === 'explosion' ? 0.54 : 0.5);
      const radius = (variant === 'explosion' ? 46 : 30) + (easeOutQuad(progress) * (variant === 'explosion' ? 86 : 58));
      this.drawCircle(centerX, centerY, radius, '#ffd061', {alpha: 0.52});
      this.drawCircle(centerX, centerY, radius * 0.68, variant === 'explosion' ? '#ff6f42' : '#ff8f51', {alpha: 0.8});
      for (let index = 0; index < (variant === 'explosion' ? 10 : 6); index += 1) {
        const angle = ((Math.PI * 2 * index) / (variant === 'explosion' ? 10 : 6)) + (progress * 4);
        const dist = radius * 0.7;
        this.drawRect(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, 10, 18, '#ffc870', {alpha: 0.78 - (progress * 0.3), rotation: angle});
      }
      this.drawBurst(centerX, centerY, variant === 'explosion' ? 16 : 12, variant === 'explosion' ? 82 : 60, progress, '#ffcf75');
      return;
    }

    if (effect.type === 'burst') { const x = lerp(ax, dx, p); const y = lerp(ay, dy, p); this.drawBurst(x, y, 8, 18, progress, '#fff0a8'); if (progress > hitAt) this.drawBurst(dx, dy, 8, 30, (progress - hitAt) / (1 - hitAt), '#ffd478'); return; }
    if (effect.type === 'slash') { const x = lerp(ax, dx, p); const y = lerp(ay, dy, p); this.drawPolyline([[x - 30, y + 20], [x + 30, y - 22]], '#f7f7ef', 5, {alpha: 0.95}); this.drawPolyline([[x - 24, y + 26], [x + 24, y - 16]], '#ff6767', 2, {alpha: 0.78}); return; }
    if (effect.type === 'spikes') { for (let index = 0; index < 3; index += 1) { const t = clamp(progress * 1.18 - (index * 0.08), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) + ((index - 1) * 10); this.drawPolyline([[x - (dir * 10), y + 8], [x + (dir * 12), y], [x - (dir * 10), y - 8]], '#f5f5ee', 4, {alpha: 1 - Math.max(0, progress - hitAt)}); } return; }
    if (effect.type === 'coins') { for (let index = 0; index < 3; index += 1) { const t = clamp(progress * 1.2 - (index * 0.08), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) - (Math.sin(t * Math.PI) * 58) + (index * 7); this.drawCircle(x, y, 8, '#f1d15b', {stroke: '#fff2a4', lineWidth: 2, alpha: 0.96}); } return; }
    if (effect.type === 'wind') { for (let index = 0; index < 4; index += 1) { const t = clamp(progress - (index * 0.08), 0, 1); const x = lerp(ax, dx, easeOutQuad(t)); const y = lerp(ay, dy, t) + (Math.sin((t * 9) + index) * 14); this.drawPolyline([[x - 18, y - 8], [x - 4, y], [x + 10, y - 10], [x + 18, y]], '#f4f4ef', 3, {alpha: 1 - t}); } return; }
    if (effect.type === 'vine') { for (let index = 0; index < 7; index += 1) { const t = index / 6; const swing = Math.sin((progress * 8) + (index * 0.7)) * 9; const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) + swing; this.drawPolyline([[x - 5, y + 6], [x, y - 4], [x + 6, y + 7]], '#78c95f', 3, {alpha: 0.9}); } return; }
    if (effect.type === 'rings') { for (let index = 0; index < 3; index += 1) { const t = clamp(progress - (index * 0.09), 0, 1); this.drawCircle(dx, dy, 12 + (t * 24), '', {alpha: 1 - t, stroke: '#f6fbf6', lineWidth: 3}); } return; }
    if (effect.type === 'dust') { for (let index = 0; index < 10; index += 1) { const t = clamp(progress * 1.12 - (index * 0.04), 0, 1); const x = lerp(ax, dx, t) + ((index - 5) * 5); const y = lerp(ay, dy, t) + (Math.sin(index + progress * 9) * 10); this.drawCircle(x, y, 4 + (index % 3), '#b99865', {alpha: 0.85 - (t * 0.4)}); } return; }
    if (effect.type === 'fang') { const x = lerp(ax, dx, p); const y = lerp(ay, dy, p); this.drawPolyline([[x - (dir * 18), y - 8], [x - (dir * 4), y], [x - (dir * 18), y + 8]], '#f7f7ef', 4, {alpha: 0.95}); this.drawPolyline([[x + (dir * 18), y - 8], [x + (dir * 4), y], [x + (dir * 18), y + 8]], '#f7f7ef', 4, {alpha: 0.95}); return; }
    if (effect.type === 'fire') { for (let index = 0; index < 4; index += 1) { const t = clamp(progress * 1.1 - (index * 0.08), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) + ((index - 1.5) * 12) - (Math.sin(t * Math.PI) * 12); this.drawCircle(x, y, 10 + ((index % 2) * 3), '#f79b35', {alpha: 0.92, stroke: '#ffe579', lineWidth: 2}); } if (progress > hitAt) this.drawBurst(dx, dy, 10, 32, (progress - hitAt) / (1 - hitAt), '#ffca6e'); return; }
    if (effect.type === 'fireblast') { const cx = lerp(ax, dx, p); const cy = lerp(ay, dy, p); const arm = 22 + (Math.sin(progress * Math.PI) * 12); this.drawPolyline([[cx - arm, cy], [cx + arm, cy]], '#ffe785', 8, {alpha: 0.92}); this.drawPolyline([[cx, cy - arm], [cx, cy + arm]], '#ffe785', 8, {alpha: 0.92}); this.drawPolyline([[cx - arm * 0.72, cy - arm * 0.72], [cx + arm * 0.72, cy + arm * 0.72]], '#ff8d3f', 6, {alpha: 0.92}); this.drawPolyline([[cx - arm * 0.72, cy + arm * 0.72], [cx + arm * 0.72, cy - arm * 0.72]], '#ff8d3f', 6, {alpha: 0.92}); this.drawCircle(cx, cy, 10, '#fff0a8', {alpha: 0.9}); if (progress > hitAt) { this.drawBurst(dx, dy, 12, 42, (progress - hitAt) / (1 - hitAt), '#ffcb62'); this.drawCircle(dx, dy, 28, '#ffd269', {alpha: 0.2}); } return; }
    if (effect.type === 'rain') { for (let index = 0; index < 4; index += 1) { const t = clamp(localToHit - (index * 0.06), 0, 1); const x = dx + ((index - 1.5) * 10); const y = lerp(dy - 90 - (index * 10), dy, easeOutQuad(t)); this.drawCircle(x, y, 7, '#69c5ff', {alpha: 0.94, stroke: '#d8f6ff', lineWidth: 2}); } return; }
    if (effect.type === 'bubbles') { for (let index = 0; index < 6; index += 1) { const t = clamp(progress * 1.12 - (index * 0.06), 0, 1); const x = lerp(ax, dx, t) + (Math.sin(index + t * Math.PI * 2) * 18); const y = lerp(ay, dy, t) - (index * 3); this.drawCircle(x, y, 8 + (index % 3), '', {alpha: 1 - (t * 0.4), stroke: '#c6efff', lineWidth: 3}); } return; }
    if (effect.type === 'surf') { for (let index = 0; index < 5; index += 1) { const t = clamp(progress * 1.2 - (index * 0.07), 0, 1); const x = lerp(ax - 44, dx + 44, t); const y = lerp(ay, dy + 16, t); this.drawRect(x, y, 36, 12, '#bceeff', {alpha: 0.92 - (t * 0.55), rotation: dir * 0.16}); } return; }
    if (effect.type === 'hydro') { const rise = easeOutQuad(localToHit); const baseY = dy + 68; for (let index = -1; index <= 1; index += 1) { const x = dx + (index * 18); const top = lerp(baseY, dy - 10, rise); this.drawPolyline([[x, baseY], [x - (index * 4), top]], '#d7fbff', 10, {alpha: 0.9}); this.drawPolyline([[x, baseY], [x - (index * 4), top]], '#69cbff', 5, {alpha: 0.96}); } return; }
    if (effect.type === 'ice') { for (let index = 0; index < 5; index += 1) { const t = clamp(progress * 1.1 - (index * 0.06), 0, 1); const x = lerp(ax, dx, t) + ((index - 2) * 10); const y = lerp(ay, dy, t) - (index * 4); this.drawPolyline([[x, y - 10], [x - 8, y + 4], [x + 8, y + 4], [x, y - 10]], '#e8ffff', 3, {alpha: 1 - (t * 0.3)}); } return; }
    if (effect.type === 'electric') { const strikeX = lerp(ax, dx, localToHit); const strikeY = lerp(ay - 60, dy, easeOutQuad(localToHit)); this.drawPolyline([[strikeX - 12, strikeY - 38], [strikeX + 2, strikeY - 18], [strikeX - 8, strikeY - 2], [strikeX + 8, strikeY + 14], [strikeX - 2, strikeY + 30]], '#fff685', 6, {alpha: 0.96}); this.drawPolyline([[strikeX + 8, strikeY - 54], [strikeX - 8, strikeY - 26], [strikeX + 4, strikeY - 6], [strikeX - 10, strikeY + 16]], '#f1d742', 4, {alpha: 0.9}); if (progress > hitAt) this.drawBurst(dx, dy, 8, 24, (progress - hitAt) / (1 - hitAt), '#fff685'); return; }
    if (effect.type === 'beam') { const ex = lerp(ax, dx, easeOutQuad(localToHit)); const ey = lerp(ay, dy, easeOutQuad(localToHit)); this.drawPolyline([[ax, ay], [ex, ey]], '#dff7ff', 12, {alpha: 0.9}); this.drawPolyline([[ax, ay], [ex, ey]], '#8fd5ff', 6, {alpha: 0.95}); if (progress > hitAt) this.drawBurst(dx, dy, 8, 32, (progress - hitAt) / (1 - hitAt), '#d8f7ff'); return; }
    if (effect.type === 'rocks') { for (let index = 0; index < 5; index += 1) { const t = clamp(progress * 1.14 - (index * 0.08), 0, 1); const x = lerp(ax + (dir * 30), dx + (((index % 2) * 24) - 12), t); const y = lerp(ay - 80 - (index * 18), dy - 12, easeOutQuad(t)); this.drawCircle(x, y, 7 + ((index % 2) * 3), '#8a6b4b', {stroke: '#d1b18c', lineWidth: 2}); } return; }
    if (effect.type === 'seismic') { const x = lerp(ax, dx, p); const y = lerp(ay, dy, p) - (Math.sin(progress * Math.PI) * 26); this.drawCircle(x, y, 18, '#111', {alpha: 0.75, stroke: '#d8d8d8', lineWidth: 2}); return; }
    if (effect.type === 'drain') { for (let index = 0; index < 5; index += 1) { const outbound = progress < 0.52; const t = outbound ? clamp(progress * 1.28 - (index * 0.06), 0, 1) : clamp((progress - 0.52) / 0.48 - (index * 0.06), 0, 1); const x = outbound ? lerp(ax, dx, t) : lerp(dx, ax, t); const y = outbound ? lerp(ay, dy, t) : lerp(dy, ay, t); this.drawCircle(x, y + (Math.sin(index + progress * 10) * 10), index === 0 ? 6 : 4, index === 0 ? '#a4ff75' : '#f1fff1', {alpha: 0.9}); } return; }
    if (effect.type === 'petal') { for (let index = 0; index < 8; index += 1) { const angle = (Math.PI * 2 * index) / 8 + (progress * Math.PI * 2.6); const radius = 18 + (Math.sin(progress * Math.PI) * 18); const x = dx + Math.cos(angle) * radius; const y = dy + Math.sin(angle) * radius; this.drawRect(x, y, 9, 16, '#ff8eb4', {alpha: 0.9, rotation: angle}); } return; }
    if (effect.type === 'string') { const x = lerp(ax, dx, easeOutQuad(localToHit)); const y = lerp(ay, dy, easeOutQuad(localToHit)); for (let index = -1; index <= 1; index += 1) this.drawPolyline([[ax, ay + (index * 6)], [x, y + (index * 7)]], '#f3f3f0', 2, {alpha: 0.96}); return; }
    if (effect.type === 'barrier') { const x = ax; const y = ay - 18; this.drawRect(x - 14, y, 18, 72, 'rgba(220,240,255,.18)', {stroke: '#eefaff', lineWidth: 3, alpha: 0.82}); this.drawRect(x + 14, y, 18, 72, 'rgba(220,240,255,.18)', {stroke: '#eefaff', lineWidth: 3, alpha: 0.66}); this.drawBurst(x, y, 6, 24, progress, '#eefaff'); return; }
    if (effect.type === 'ringSelf') { const x = ax; const y = ay - 18; this.drawCircle(x, y, 14 + (Math.sin(progress * Math.PI) * 10), '', {stroke: '#f1f7f1', lineWidth: 3, alpha: 0.85}); return; }
    if (effect.type === 'explode') { const centerX = lerp(ax, dx, 0.52); const centerY = lerp(ay, dy, 0.52); const radius = 34 + (easeOutQuad(progress) * 72); this.drawCircle(centerX, centerY, radius, '#ffd061', {alpha: 0.48}); this.drawCircle(centerX, centerY, radius * 0.68, '#ff8f51', {alpha: 0.78}); this.drawBurst(centerX, centerY, 12, 66, progress, '#ffcf75'); return; }
    if (effect.type === 'cloud') { for (let index = 0; index < 4; index += 1) { const t = clamp(progress - (index * 0.08), 0, 1); const x = lerp(ax, dx, t) + (index * 6 * dir); const y = lerp(ay, dy, t) - (index * 4); this.drawCircle(x, y, 12 + (index * 2), effect.color, {alpha: 0.88 - (t * 0.45)}); } return; }
    if (effect.type === 'swift') { for (let index = 0; index < 5; index += 1) { const t = clamp(progress * 1.16 - (index * 0.08), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) + (Math.sin((index * 0.9) + (t * Math.PI * 2)) * 18); this.drawStar(x, y, 9, '#fff0a8', {stroke: '#ffd36a', lineWidth: 2, rotation: t * 0.7, alpha: 1 - Math.max(0, (progress - hitAt) * 1.5)}); } return; }
    if (effect.type === 'heal') { const x = ax; const y = ay - 18; for (let index = 0; index < 6; index += 1) { const angle = (Math.PI * 2 * index) / 6 + (progress * Math.PI * 2); const radius = 12 + (Math.sin(progress * Math.PI) * 8); this.drawCircle(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 4, '#b7ffab', {alpha: 0.85}); } return; }
    if (effect.type === 'kiss') { for (let index = 0; index < 4; index += 1) { const t = clamp(progress * 1.1 - (index * 0.07), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) + ((index - 1.5) * 10); this.drawCircle(x, y, 8, '#ff8dc7', {alpha: 0.92, stroke: '#ffd2eb', lineWidth: 2}); } return; }
    if (effect.type === 'tri') { const colors = ['#ff9d45', '#7be2ff', '#ffe46d']; for (let index = 0; index < 3; index += 1) { const t = clamp(progress * 1.06 - (index * 0.06), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t) + ((index - 1) * 18); this.drawRect(x, y, 22, 10, colors[index], {alpha: 0.92, rotation: (index - 1) * 0.7}); } return; }
    if (effect.type === 'substitute') { const x = ax; const y = ay - 20; this.drawRect(x, y, 42, 54, 'rgba(127,215,144,.28)', {stroke: '#c4ffd0', lineWidth: 3, alpha: 0.86}); return; }
    if (effect.type === 'confusion') { for (let index = 0; index < 5; index += 1) { const angle = (Math.PI * 2 * index) / 5 + (progress * Math.PI * 2.4); const radius = 12 + (progress * 28); const x = dx + Math.cos(angle) * radius; const y = dy + Math.sin(angle) * radius; this.drawCircle(x, y, 6, '#d9b0ff', {alpha: 1 - progress}); } return; }
    if (effect.type === 'sleep') { for (let index = 0; index < 3; index += 1) { const t = clamp(progress - (index * 0.12), 0, 1); const x = dx + (index * 10); const y = dy - 8 - (t * 42); this.ctx.save(); this.ctx.globalAlpha = 1 - t; this.ctx.fillStyle = '#f6f6f4'; this.ctx.font = this.mode === 'mobile' ? 'bold 14px Georgia' : 'bold 18px Georgia'; this.ctx.fillText('Z', x, y); this.ctx.restore(); } return; }
    if (effect.type === 'sound') { for (let index = 0; index < 3; index += 1) { const t = clamp(progress - (index * 0.08), 0, 1); const x = lerp(ax, dx, easeOutQuad(t)); const y = lerp(ay, dy, t) + (Math.sin((t * 8) + index) * 14); this.drawPolyline([[x - 8, y + 10], [x - 8, y - 10], [x + 6, y - 5]], '#f3f3f0', 3, {alpha: 1 - t}); this.drawCircle(x + 7, y + 3, 5, '#f3f3f0', {alpha: 1 - t}); } return; }
    if (effect.type === 'statusTarget') { for (let index = 0; index < 4; index += 1) { const angle = (Math.PI * 2 * index) / 4 + (progress * Math.PI * 2); const x = dx + Math.cos(angle) * 22; const y = dy + Math.sin(angle) * 22; this.drawCircle(x, y, 9, '', {alpha: 1 - progress, stroke: '#eef7ff', lineWidth: 2}); } return; }
    if (effect.type === 'self') { const x = ax; const y = ay - 18; this.drawBurst(x, y, 6, 26, progress, '#e8fbff'); return; }
    if (effect.type === 'swoop') { for (let index = 0; index < 3; index += 1) { const t = clamp(progress * 1.1 - (index * 0.08), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay - 46, dy, t) - (Math.sin(t * Math.PI) * 22); this.drawPolyline([[x - 16, y + 8], [x - 4, y], [x + 12, y - 10]], '#f2f2ed', 3, {alpha: 1 - Math.max(0, progress - hitAt)}); } return; }
    if (effect.type === 'psywave') { for (let index = 0; index < 4; index += 1) { const t = clamp(progress - (index * 0.08), 0, 1); const x = lerp(ax, dx, t); const y = lerp(ay, dy, t); this.drawCircle(x, y, 10 + (t * 16), '', {alpha: 1 - t, stroke: '#b78cff', lineWidth: 3}); } }
  }

  render(state) {
    this.clearMotion();
    this.resize();
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.updateHud(state);
    this.applySpriteState(state);
    this.renderEffect(state);
  }
}

async function load() {
  const [movesResponse, sheetImage] = await Promise.all([
    fetch(DATA_PATH),
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = SHEET_PATH;
    }),
  ]);
  return {moves: await movesResponse.json(), sheetImage};
}

const createMoveCard = (move) => `<button class="attack-move-chip" data-move-id="${move.id}"><strong>${String(move.num).padStart(3, '0')}</strong><span>${move.name}</span><em>${move.family}</em></button>`;

async function main() {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.append(style);
  const app = document.getElementById('app');
  const {moves, sheetImage} = await load();
  let moveIndex = 0;
  let side = 'player';
  let playing = true;
  let lastSwitchAt = performance.now();
  let activeMove = moves[moveIndex];

  app.innerHTML = `
    <div class="attack-preview-shell">
      <header class="attack-preview-header">
        <div>
          <div class="label">Prototype</div>
          <h1>Gen 1 Attack Animation Preview</h1>
          <p>Desktop and mobile battle scenes run in sync so each move can be checked with timing, HP loss, hurt flicker, and mirrored foe casting before anything reaches the live battler.</p>
        </div>
        <div class="attack-preview-meta">
          <span>165 moves</span>
          <span>Family-mapped prototype</span>
          <span>Not wired into battle yet</span>
        </div>
      </header>
      <section class="attack-preview-stage-grid">
        ${['desktop', 'mobile'].map((mode) => `
          <article class="attack-preview-panel">
            <div class="attack-preview-panel-head"><div><div class="label">${mode === 'desktop' ? 'Desktop' : 'Mobile'}</div><h2>Battle View</h2></div><div class="attack-preview-status" data-status-${mode}></div></div>
            <div class="attack-preview-stage ${mode}" data-stage="${mode}">
              <div class="attack-preview-stage-field">
                <div class="attack-preview-hud foe"><div class="attack-preview-hud-head"><span class="attack-preview-hud-name">${SAMPLE.defender.name}</span><span class="attack-preview-hud-level">Lv100</span></div><div class="attack-preview-hp-row"><span class="attack-preview-hp-label">HP</span><div class="attack-preview-hp-bar"><div class="attack-preview-hp-fill" data-foe-hp-fill></div></div><span class="attack-preview-hp-value" data-foe-hp-value>100/100</span></div></div>
                <div class="attack-preview-hud player"><div class="attack-preview-hud-head"><span class="attack-preview-hud-name">${SAMPLE.attacker.name}</span><span class="attack-preview-hud-level">Lv100</span></div><div class="attack-preview-hp-row"><span class="attack-preview-hp-label">HP</span><div class="attack-preview-hp-bar"><div class="attack-preview-hp-fill" data-player-hp-fill></div></div><span class="attack-preview-hp-value" data-player-hp-value>100/100</span></div></div>
                <div class="attack-preview-mon foe"><img class="attack-preview-foe" src="${SAMPLE.defender.sprite}" alt="${SAMPLE.defender.name}"></div>
                <div class="attack-preview-mon player"><img class="attack-preview-player" src="${SAMPLE.attacker.sprite}" alt="${SAMPLE.attacker.name}"></div>
                <canvas></canvas>
                <div class="attack-preview-log">Loading moves...</div>
              </div>
            </div>
          </article>
        `).join('')}
      </section>
      <section class="attack-preview-controls">
        <div class="attack-preview-current">
          <div class="label">Current Move</div>
          <h3 data-move-name>${activeMove.name}</h3>
          <p data-move-detail>${activeMove.type} - ${activeMove.category} - ${activeMove.family}</p>
        </div>
        <div class="attack-preview-buttons">
          <button class="ghost-btn" data-action="prev">Previous</button>
          <button class="primary-btn" data-action="toggle">Pause</button>
          <button class="ghost-btn" data-action="next">Next</button>
        </div>
      </section>
      <section class="attack-preview-move-list">${moves.map(createMoveCard).join('')}</section>
    </div>
  `;

  const desktop = new BattleViewport(app.querySelector('[data-stage="desktop"]'), 'desktop', sheetImage);
  const mobile = new BattleViewport(app.querySelector('[data-stage="mobile"]'), 'mobile', sheetImage);
  const moveName = app.querySelector('[data-move-name]');
  const moveDetail = app.querySelector('[data-move-detail]');
  const desktopStatus = app.querySelector('[data-status-desktop]');
  const mobileStatus = app.querySelector('[data-status-mobile]');
  const moveButtons = [...app.querySelectorAll('.attack-move-chip')];

  function updateLabels() {
    activeMove = moves[moveIndex];
    moveName.textContent = activeMove.name;
    moveDetail.textContent = `${activeMove.type} - ${activeMove.category} - ${activeMove.family}${activeMove.power ? ` - ${activeMove.power} BP` : ''}`;
    const attacker = side === 'player' ? SAMPLE.attacker.name : SAMPLE.defender.name;
    desktopStatus.textContent = `${attacker} uses ${activeMove.name}`;
    mobileStatus.textContent = `${attacker} uses ${activeMove.name}`;
    moveButtons.forEach((button) => button.classList.toggle('active', button.dataset.moveId === activeMove.id));
  }

  function advance() {
    side = side === 'player' ? 'foe' : 'player';
    if (side === 'player') moveIndex = (moveIndex + 1) % moves.length;
    lastSwitchAt = performance.now();
    updateLabels();
  }

  updateLabels();

  app.querySelector('[data-action="prev"]').addEventListener('click', () => {
    moveIndex = (moveIndex - 1 + moves.length) % moves.length;
    side = 'player';
    lastSwitchAt = performance.now();
    updateLabels();
  });

  app.querySelector('[data-action="next"]').addEventListener('click', () => {
    moveIndex = (moveIndex + 1) % moves.length;
    side = 'player';
    lastSwitchAt = performance.now();
    updateLabels();
  });

  app.querySelector('[data-action="toggle"]').addEventListener('click', (event) => {
    playing = !playing;
    event.currentTarget.textContent = playing ? 'Pause' : 'Play';
    lastSwitchAt = performance.now();
  });

  moveButtons.forEach((button) => button.addEventListener('click', () => {
    moveIndex = moves.findIndex((move) => move.id === button.dataset.moveId);
    side = 'player';
    lastSwitchAt = performance.now();
    updateLabels();
  }));

  function tick(now) {
    const profile = FAMILY[activeMove.family] || FAMILY.impact;
    const elapsed = now - lastSwitchAt;
    const progress = clamp(elapsed / profile.duration, 0, 1);
    const frame = buildFrameState(activeMove, side, progress);
    const state = {family: activeMove, side, progress, ...frame};
    desktop.setLog(frame.logText);
    mobile.setLog(frame.logText);
    desktop.render(state);
    mobile.render(state);
    if (playing && elapsed >= profile.duration + 280) advance();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

main().catch((error) => {
  document.getElementById('app').innerHTML = `<pre>${error.stack || error.message}</pre>`;
});

const DATA_PATH = './pokemon-attack-preview-data.json';
const PLAYER_SPRITE = '../assets/pokemon-rby-clean/red-green/back/6.png';
const FOE_SPRITE = '../assets/pokemon-rby-clean/red-green/9.png';
const FRAME_MS = 70;

const SAMPLE = {
  player: {name: 'Charizard', sprite: PLAYER_SPRITE},
  foe: {name: 'Blastoise', sprite: FOE_SPRITE},
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + ((b - a) * t);

const FIXED_DAMAGE_MOVES = new Set(['bide', 'counter', 'dragonrage', 'nightshade', 'psywave', 'seismictoss', 'sonicboom', 'superfang']);
const OHKO_MOVES = new Set(['fissure', 'guillotine', 'horndrill']);

const SPECIAL_EFFECT_DURATION = {
  SE_DELAY_ANIMATION_10: 10 * FRAME_MS,
  SE_DARK_SCREEN_FLASH: 4 * FRAME_MS,
  SE_DARK_SCREEN_PALETTE: 0,
  SE_RESET_SCREEN_PALETTE: 0,
  SE_FLASH_SCREEN_LONG: 10 * FRAME_MS,
  SE_SHAKE_SCREEN: 6 * FRAME_MS,
  SE_WATER_DROPLETS_EVERYWHERE: 10 * FRAME_MS,
  SE_DARKEN_MON_PALETTE: 6 * FRAME_MS,
  SE_LIGHT_SCREEN_PALETTE: 8 * FRAME_MS,
  SE_BLINK_MON: 6 * FRAME_MS,
  SE_FLASH_MON_PIC: 4 * FRAME_MS,
  SE_HIDE_MON_PIC: 0,
  SE_SHOW_MON_PIC: 0,
  SE_MOVE_MON_HORIZONTALLY: 5 * FRAME_MS,
  SE_RESET_MON_POSITION: 3 * FRAME_MS,
  SE_SLIDE_MON_OFF: 8 * FRAME_MS,
  SE_SLIDE_MON_HALF_OFF: 7 * FRAME_MS,
  SE_SLIDE_MON_UP: 6 * FRAME_MS,
  SE_SLIDE_MON_DOWN: 6 * FRAME_MS,
  SE_SLIDE_MON_DOWN_AND_HIDE: 8 * FRAME_MS,
  SE_SQUISH_MON_PIC: 6 * FRAME_MS,
  SE_BOUNCE_UP_AND_DOWN: 8 * FRAME_MS,
  SE_MINIMIZE_MON: 8 * FRAME_MS,
  SE_SUBSTITUTE_MON: 0,
  SE_TRANSFORM_MON: 8 * FRAME_MS,
  SE_PETALS_FALLING: 10 * FRAME_MS,
  SE_LEAVES_FALLING: 10 * FRAME_MS,
  SE_SHAKE_ENEMY_HUD: 5 * FRAME_MS,
  SE_SHAKE_BACK_AND_FORTH: 6 * FRAME_MS,
  SE_WAVY_SCREEN: 10 * FRAME_MS,
  SE_SPIRAL_BALLS_INWARD: 10 * FRAME_MS,
  SE_SHOOT_BALLS_UPWARD: 8 * FRAME_MS,
  SE_SHOOT_MANY_BALLS_UPWARD: 9 * FRAME_MS,
  SE_SHOW_ENEMY_MON_PIC: 0,
  SE_HIDE_ENEMY_MON_PIC: 0,
  SE_BLINK_ENEMY_MON: 6 * FRAME_MS,
  SE_SLIDE_ENEMY_MON_OFF: 8 * FRAME_MS,
};

const MOVE_SPECIFIC_DURATION = {
  AnimationFlashScreen: 4 * FRAME_MS,
  DoBlizzardSpecialEffects: 10 * FRAME_MS,
  DoExplodeSpecialEffects: 8 * FRAME_MS,
  DoGrowlSpecialEffects: 6 * FRAME_MS,
  DoRockSlideSpecialEffects: 8 * FRAME_MS,
  FlashScreenEveryEightFrameBlocks: 6 * FRAME_MS,
  FlashScreenEveryFourFrameBlocks: 8 * FRAME_MS,
};

const STYLES = `
  :root{color-scheme:dark;--bg:#07120d;--panel:#11231c;--line:rgba(173,209,188,.15);--text:#eef6ee;--muted:#b6cdbd;--gold:#e5c965;--accent:#8fd1ff}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;font-family:Georgia,"Times New Roman",serif;background:radial-gradient(circle at top left, rgba(206,175,86,.18), transparent 26%),radial-gradient(circle at top right, rgba(60,126,110,.2), transparent 24%),linear-gradient(180deg,#08140f 0%,#0d1914 100%);color:var(--text)}
  button{font:inherit}
  .label{font-size:.74rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(235,241,231,.74)}
  .preview-shell{width:min(1420px,calc(100vw - 28px));margin:0 auto;padding:20px 0 32px;display:grid;gap:18px}
  .preview-card,.preview-moves{background:linear-gradient(180deg, rgba(19,37,31,.96), rgba(12,25,20,.98));border:1px solid var(--line);border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.25)}
  .preview-card{padding:22px 24px}
  .preview-header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}
  .preview-header h1,.preview-stage-head h2{margin:4px 0 0;font-size:clamp(1.8rem,2vw + 1rem,3rem);line-height:.95}
  .preview-header p{margin:10px 0 0;max-width:72ch;color:var(--muted);line-height:1.45}
  .preview-meta{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
  .preview-meta span,.preview-current span{padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#e3eedf;font-size:.92rem}
  .preview-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
  .preview-current-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:flex-end}
  .preview-current h2{margin:6px 0 0;font-size:clamp(1.4rem,1.5vw + .9rem,2.2rem)}
  .preview-current p{margin:8px 0 0;color:var(--muted)}
  .preview-buttons{display:flex;flex-wrap:wrap;gap:10px}
  .btn-primary,.btn-ghost,.move-chip{border:none;cursor:pointer}
  .btn-primary,.btn-ghost{padding:12px 18px;border-radius:999px;font-weight:700}
  .btn-primary{background:linear-gradient(180deg,#f0d56f,#d8bb57);color:#223125}
  .btn-ghost{background:rgba(255,255,255,.06);color:var(--text);border:1px solid rgba(255,255,255,.08)}
  .btn-ghost.active{background:rgba(143,209,255,.16);border-color:rgba(143,209,255,.4)}
  .preview-stage-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,320px);gap:16px;align-items:start}
  .preview-stage-stack{display:grid;gap:16px}
  .preview-stage-panel{padding:18px;display:grid;gap:12px}
  .preview-stage-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
  .preview-stage{width:100%}
  .preview-stage.desktop{max-width:1080px;margin:0 auto}
  .preview-stage.mobile{max-width:320px;margin:0 auto}
  .battle-stage{position:relative;height:clamp(352px,28vw,430px);border:3px solid #151d11;border-radius:10px;overflow:hidden;background:linear-gradient(180deg,#e7f3cb 0%,#e7f3cb 54%,#cadc9a 54%,#cadc9a 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.2),0 24px 60px rgba(0,0,0,.22)}
  .battle-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 34%,rgba(255,255,255,.28),transparent 26%),radial-gradient(circle at 27% 78%,rgba(255,255,255,.24),transparent 24%);pointer-events:none}
  .battle-field{position:absolute;inset:0 0 21% 0}
  .battle-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .battle-feed{position:absolute;left:2.8%;right:2.8%;bottom:3.2%;border:3px solid #151d11;border-radius:8px;padding:1.7% 2.1%;display:grid;align-content:center;min-height:16.8%;background:#f8f5e8;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);z-index:3}
  .feed-line{color:#1e2b14;text-align:left;font-size:1.02rem;line-height:1.45;font-weight:700;text-transform:uppercase}
  .battle-status{position:absolute;padding:2.4% 2.8%;border:3px solid #151d11;border-radius:8px;background:#f8f5e8;color:#1e2b14;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);z-index:3}
  .battle-status-foe{top:6%;left:4.5%;width:24%}
  .battle-status-player{right:4.5%;bottom:24%;width:25%}
  .battle-status-top,.battle-status-meta,.battle-hp-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .battle-status-meta{margin-top:4px;color:#4d5b41;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
  .battle-hp-row{margin-top:8px}
  .hp-label{color:#1e2b14;font-size:.86rem;font-weight:700;letter-spacing:.08em}
  .hp{height:14px;width:100%;border-radius:999px;border:2px solid #1e2b14;background:#b7bf9c;overflow:hidden}
  .hp-fill{height:100%;background:linear-gradient(90deg,#6eb24b,#9fd050);transition:width 80ms linear}
  .hp-fill.hp-mid{background:linear-gradient(90deg,#d4bf48,#e9da79)}
  .hp-fill.hp-low{background:linear-gradient(90deg,#b44b41,#de7c60)}
  .battle-sprite-wrap{position:absolute;display:flex;align-items:flex-end;justify-content:center;z-index:2}
  .battle-sprite-foe{top:15.5%;right:5.5%;width:22%;height:31%}
  .battle-sprite-player{left:5.5%;bottom:14.1%;width:25%;height:38%}
  .battle-shadow{position:absolute;left:50%;bottom:4%;width:56%;height:11%;border-radius:50%;background:radial-gradient(circle,rgba(34,49,20,.38) 0%,rgba(34,49,20,.16) 58%,transparent 74%);transform:translateX(-50%)}
  .sprite.battle{width:100%;height:100%;object-fit:contain;object-position:center bottom;image-rendering:pixelated;filter:drop-shadow(0 12px 0 rgba(255,255,255,.18)) drop-shadow(0 20px 18px rgba(0,0,0,.22));transition:transform 70ms linear,opacity 90ms linear,filter 80ms linear}
  .battle-sprite-foe .sprite.battle.front{transform:translateX(2%) translateY(0)}
  .battle-sprite-player .sprite.battle.back{transform:translateX(-2%) translateY(12%)}
  .sprite.battle.hurt{filter:brightness(1.85) contrast(1.35) drop-shadow(0 0 10px rgba(255,255,255,.75))}
  .preview-moves{padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;max-height:68vh;overflow:auto}
  .move-chip{display:grid;gap:4px;text-align:left;padding:12px;border-radius:18px;background:rgba(255,255,255,.04);color:var(--text);border:1px solid rgba(255,255,255,.07)}
  .move-chip strong{font-size:.78rem;letter-spacing:.14em;color:#f2d977}
  .move-chip span{font-size:1rem;font-weight:700}
  .move-chip em{font-style:normal;font-size:.8rem;color:var(--muted)}
  .move-chip.active{border-color:rgba(143,209,255,.6);box-shadow:0 0 0 1px rgba(143,209,255,.24);background:rgba(143,209,255,.08)}
  @media (max-width:1080px){.preview-header,.preview-controls,.preview-stage-grid{grid-template-columns:1fr}.preview-meta{justify-content:flex-start}.preview-moves{max-height:32vh}}
  @media (max-width:720px){.preview-shell{width:min(100vw - 16px, 440px);padding:12px 0 20px;gap:12px}.preview-card,.preview-moves{border-radius:22px}.preview-card{padding:14px}.preview-header h1,.preview-stage-head h2{font-size:1.55rem}.preview-stage.mobile,.preview-stage.desktop{max-width:100%}.preview-moves{grid-template-columns:repeat(2,minmax(0,1fr));max-height:34vh}.battle-stage{height:auto;min-height:34vh;border-radius:8px}.battle-status{padding:8px 10px;border-width:2px;border-radius:6px}.battle-status-foe{top:4%;left:3%;width:36%}.battle-status-player{right:3%;bottom:22%;width:38%}.battle-status-meta{font-size:.68rem;letter-spacing:.05em}.battle-sprite-foe{top:11%;right:6%;width:29%;height:35%}.battle-sprite-player{left:7%;bottom:13.5%;width:26%;height:30%}.battle-feed{left:3%;right:3%;bottom:3%;min-height:17%;padding:2% 2.4%;border-width:2px;border-radius:6px}.feed-line{font-size:.8rem}}
`;

function estimateDamage(move) {
  if (!move || move.category === 'Status') return 0;
  if (move.id === 'superfang') return 0.5;
  if (move.id === 'sonicboom') return 0.22;
  if (move.id === 'dragonrage') return 0.28;
  if (OHKO_MOVES.has(move.id)) return 0.96;
  if (FIXED_DAMAGE_MOVES.has(move.id)) return 0.34;
  return clamp(0.18 + (Math.max(20, move.power || 40) / 240), 0.2, 0.62);
}

function isDamaging(move) {
  return move.category !== 'Status' || FIXED_DAMAGE_MOVES.has(move.id) || OHKO_MOVES.has(move.id);
}

function describeResolution(move, attacker, defender) {
  if (!isDamaging(move)) {
    if (move.type === 'Psychic') return `${defender} is wrapped in a psychic effect.`;
    if (move.type === 'Poison') return `${defender} is caught in a toxic effect.`;
    if (move.id === 'transform') return `${attacker} changes form.`;
    if (move.id === 'substitute') return `${attacker} hides behind a substitute.`;
    if (move.id === 'recover' || move.id === 'softboiled' || move.id === 'rest') return `${attacker} restores itself.`;
    return `${move.name} finishes its effect.`;
  }
  if (OHKO_MOVES.has(move.id)) return `${defender} is taken out in one hit.`;
  return `${defender} reels from ${move.name}.`;
}

function buildTimeline(move, side, source) {
  const segments = [];
  let cursor = 0;
  for (const command of move.commands) {
    if (command.kind === 'special') {
      const duration = SPECIAL_EFFECT_DURATION[command.effect] ?? (4 * FRAME_MS);
      segments.push({...command, start: cursor, end: cursor + duration});
      cursor += duration;
      continue;
    }
    for (let index = 0; index < command.frames[side].length; index += 1) {
      const frame = command.frames[side][index];
      const duration = Math.max(FRAME_MS, frame.durationFrames * (source.effectFrameMs || FRAME_MS));
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
  const impactTime = isDamaging(move) ? cursor : null;
  const resolveTime = impactTime === null ? cursor + 260 : impactTime + 280;
  return {segments, impactTime, resolveTime, total: resolveTime + 520};
}

function injectStyles() {
  if (document.getElementById('attack-preview-styles')) return;
  const style = document.createElement('style');
  style.id = 'attack-preview-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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

class BattleViewport {
  constructor(root, mode, tilesets) {
    this.root = root;
    this.mode = mode;
    this.tilesets = tilesets;
    this.stage = root.querySelector('.battle-stage');
    this.field = root.querySelector('.battle-field');
    this.feed = root.querySelector('.feed-line');
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.playerSprite = root.querySelector('.attack-preview-player');
    this.foeSprite = root.querySelector('.attack-preview-foe');
    this.playerStatus = root.querySelector('.battle-status-player');
    this.foeStatus = root.querySelector('.battle-status-foe');
    this.playerHpFill = root.querySelector('[data-player-hp-fill]');
    this.foeHpFill = root.querySelector('[data-foe-hp-fill]');
    this.playerHpValue = root.querySelector('[data-player-hp-value]');
    this.foeHpValue = root.querySelector('[data-foe-hp-value]');
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(bounds.width * devicePixelRatio);
    this.canvas.height = Math.round(bounds.height * devicePixelRatio);
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  spriteCenter(node) {
    const stageRect = this.stage.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    return {
      x: (rect.left - stageRect.left) + (rect.width / 2),
      y: (rect.top - stageRect.top) + (rect.height / 2),
    };
  }

  fieldMetrics(source) {
    const stageRect = this.stage.getBoundingClientRect();
    const fieldRect = this.field.getBoundingClientRect();
    const width = fieldRect.width;
    const height = fieldRect.height;
    const scale = Math.min(width / source.coordinateSpace.width, height / source.coordinateSpace.height);
    const renderWidth = source.coordinateSpace.width * scale;
    const renderHeight = source.coordinateSpace.height * scale;
    return {
      x: fieldRect.left - stageRect.left + ((width - renderWidth) / 2),
      y: fieldRect.top - stageRect.top + ((height - renderHeight) / 2),
      width: renderWidth,
      height: renderHeight,
      scale,
    };
  }

  battleAnchors(source, metrics) {
    const originalPlayer = {
      x: metrics.x + (40 * metrics.scale),
      y: metrics.y + (84 * metrics.scale),
    };
    const originalFoe = {
      x: metrics.x + (112 * metrics.scale),
      y: metrics.y + (40 * metrics.scale),
    };
    const actualPlayer = this.spriteCenter(this.playerSprite);
    const actualFoe = this.spriteCenter(this.foeSprite);
    return {
      player: {
        original: originalPlayer,
        actual: actualPlayer,
        offset: {x: actualPlayer.x - originalPlayer.x, y: actualPlayer.y - originalPlayer.y},
      },
      foe: {
        original: originalFoe,
        actual: actualFoe,
        offset: {x: actualFoe.x - originalFoe.x, y: actualFoe.y - originalFoe.y},
      },
    };
  }

  resetSprites() {
    this.stage.style.transform = '';
    this.field.style.transform = '';
    for (const node of [this.playerSprite, this.foeSprite, this.playerStatus, this.foeStatus]) {
      node.style.transform = '';
      node.style.opacity = '';
      node.style.filter = '';
    }
    this.playerSprite.classList.remove('hurt');
    this.foeSprite.classList.remove('hurt');
  }

  applyHp(fill, value, ratio) {
    const percent = Math.round(clamp(ratio, 0, 1) * 100);
    fill.style.width = `${percent}%`;
    fill.classList.toggle('hp-mid', percent <= 50 && percent > 20);
    fill.classList.toggle('hp-low', percent <= 20);
    value.textContent = `${percent}/100`;
  }

  drawSpriteTile(sprite, metrics, offset = {x: 0, y: 0}) {
    const image = this.tilesets[sprite.tileset] || this.tilesets[0];
    if (!image) return;
    const tileSize = 8;
    const tileX = (sprite.tile % 16) * tileSize;
    const tileY = Math.floor(sprite.tile / 16) * tileSize;
    const drawX = metrics.x + (sprite.x * metrics.scale) + offset.x;
    const drawY = metrics.y + (sprite.y * metrics.scale) + offset.y;
    const size = tileSize * metrics.scale;
    this.ctx.save();
    this.ctx.translate(drawX + (size / 2), drawY + (size / 2));
    this.ctx.scale(sprite.flipX ? -1 : 1, sprite.flipY ? -1 : 1);
    this.ctx.drawImage(image, tileX, tileY, tileSize, tileSize, -(size / 2), -(size / 2), size, size);
    this.ctx.restore();
  }

  frameOffset(scene) {
    const frame = scene.activeFrame;
    if (!frame?.sprites?.length) return {x: 0, y: 0};
    const anchors = scene.anchors;
    const attackerKey = scene.side === 'player' ? 'player' : 'foe';
    const targetKey = scene.side === 'player' ? 'foe' : 'player';
    const attacker = anchors[attackerKey];
    const target = anchors[targetKey];
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
    const progress = clamp((((centerPx.x - attacker.original.x) * lineX) + ((centerPx.y - attacker.original.y) * lineY)) / lineLengthSq, 0, 1);
    return {
      x: lerp(attacker.offset.x, target.offset.x, progress),
      y: lerp(attacker.offset.y, target.offset.y, progress),
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

  drawScreenParticles(kind, progress, metrics, side) {
    const ctx = this.ctx;
    const centerX = metrics.anchorX;
    const centerY = metrics.anchorY;
    if (kind === 'leaves' || kind === 'petals') {
      const color = kind === 'leaves' ? '#8fc45f' : '#f0a7bf';
      for (let index = 0; index < 12; index += 1) {
        const x = metrics.x + ((index * 19 + progress * 240) % metrics.width);
        const y = metrics.y + (((index * 13) + (progress * metrics.height * 1.3)) % metrics.height);
        ctx.save();
        ctx.fillStyle = color;
        ctx.translate(x, y);
        ctx.rotate((progress * 6) + index);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * metrics.scale, 2.5 * metrics.scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (kind === 'droplets') {
      ctx.save();
      ctx.fillStyle = '#94d8ff';
      for (let index = 0; index < 18; index += 1) {
        const x = metrics.x + (((index * 17) + progress * 120) % metrics.width);
        const y = metrics.y + (((index * 9) + progress * metrics.height * 1.6) % metrics.height);
        ctx.fillRect(x, y, 2 * metrics.scale, 6 * metrics.scale);
      }
      ctx.restore();
    }
    if (kind === 'spiral') {
      ctx.save();
      ctx.fillStyle = '#ffe57b';
      for (let index = 0; index < 8; index += 1) {
        const angle = (progress * Math.PI * 4) + ((Math.PI * 2 * index) / 8);
        const radius = lerp(metrics.width * 0.18, 2 * metrics.scale, progress);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(x, y, 3.4 * metrics.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (kind === 'balls-up') {
      ctx.save();
      ctx.fillStyle = '#ffe57b';
      for (let index = 0; index < 5; index += 1) {
        const offset = index * 10 * metrics.scale;
        const y = centerY - ((progress * 48 * metrics.scale) + offset);
        ctx.beginPath();
        ctx.arc(centerX + ((index - 2) * 6 * metrics.scale), y, 3 * metrics.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
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
        this.drawGlow(
          attackerAnchor.x,
          attackerAnchor.y,
          metrics.width * 0.14,
          '#bfe8ff',
          0.45,
        );
        break;
      case 'SE_SHAKE_SCREEN':
        this.stage.style.transform = `translate(${Math.sin(progress * Math.PI * 10) * 5}px, 0px)`;
        break;
      case 'SE_WATER_DROPLETS_EVERYWHERE':
        this.drawScreenParticles('droplets', progress, {...metrics, anchorX: targetAnchor.x, anchorY: targetAnchor.y}, scene.side);
        break;
      case 'DoBlizzardSpecialEffects':
        this.drawScreenParticles('petals', progress, {...metrics, anchorX: targetAnchor.x, anchorY: targetAnchor.y}, scene.side);
        break;
      case 'SE_PETALS_FALLING':
        this.drawScreenParticles('petals', progress, {...metrics, anchorX: targetAnchor.x, anchorY: targetAnchor.y}, scene.side);
        break;
      case 'SE_LEAVES_FALLING':
        this.drawScreenParticles('leaves', progress, {...metrics, anchorX: targetAnchor.x, anchorY: targetAnchor.y}, scene.side);
        break;
      case 'SE_SPIRAL_BALLS_INWARD':
        this.drawScreenParticles('spiral', progress, {...metrics, anchorX: attackerAnchor.x, anchorY: attackerAnchor.y}, scene.side);
        break;
      case 'SE_SHOOT_BALLS_UPWARD':
      case 'SE_SHOOT_MANY_BALLS_UPWARD':
        this.drawScreenParticles('balls-up', progress, {...metrics, anchorX: attackerAnchor.x, anchorY: attackerAnchor.y}, scene.side);
        break;
      case 'SE_MOVE_MON_HORIZONTALLY':
        attackerNode.style.transform = `translate(${scene.side === 'player' ? 18 : -18}px, 0px)`;
        break;
      case 'SE_RESET_MON_POSITION':
        attackerNode.style.transform = '';
        break;
      case 'SE_BLINK_MON':
        attackerNode.style.opacity = Math.floor(progress * 10) % 2 === 0 ? '0.15' : '1';
        break;
      case 'SE_FLASH_MON_PIC':
        attackerNode.classList.toggle('hurt', Math.floor(progress * 10) % 2 === 0);
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
        attackerNode.style.transform = `translate(${lerp(0, scene.side === 'player' ? -90 : 90, progress)}px, 0px)`;
        attackerNode.style.opacity = String(1 - progress);
        break;
      case 'SE_SLIDE_MON_HALF_OFF':
        attackerNode.style.transform = `translate(${lerp(0, scene.side === 'player' ? -42 : 42, progress)}px, 0px)`;
        break;
      case 'SE_SLIDE_ENEMY_MON_OFF':
        defenderNode.style.transform = `translate(${lerp(0, scene.side === 'player' ? 80 : -80, progress)}px, 0px)`;
        defenderNode.style.opacity = String(1 - progress);
        break;
      case 'SE_SLIDE_MON_UP':
        attackerNode.style.transform = `translate(0px, ${lerp(0, -34, progress)}px)`;
        break;
      case 'SE_SLIDE_MON_DOWN':
        attackerNode.style.transform = `translate(0px, ${lerp(0, 34, progress)}px)`;
        break;
      case 'SE_SLIDE_MON_DOWN_AND_HIDE':
        attackerNode.style.transform = `translate(0px, ${lerp(0, 46, progress)}px)`;
        attackerNode.style.opacity = String(1 - progress);
        break;
      case 'SE_SQUISH_MON_PIC':
        attackerNode.style.transform = `scaleY(${lerp(1, .4, progress)})`;
        break;
      case 'SE_BOUNCE_UP_AND_DOWN':
        attackerNode.style.transform = `translate(0px, ${Math.sin(progress * Math.PI * 2) * -18}px)`;
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
        this.foeStatus.style.transform = `translate(${Math.sin(progress * Math.PI * 12) * 4}px, 0px)`;
        break;
      case 'SE_SHAKE_BACK_AND_FORTH':
        attackerNode.style.transform = `translate(${Math.sin(progress * Math.PI * 10) * 12}px, 0px)`;
        break;
      case 'SE_WAVY_SCREEN':
        this.field.style.transform = `translateX(${Math.sin(progress * Math.PI * 8) * 4}px)`;
        break;
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

  render(scene) {
    this.resetSprites();
    this.resize();
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.feed.textContent = scene.log;
    this.applyHp(this.playerHpFill, this.playerHpValue, scene.playerHp);
    this.applyHp(this.foeHpFill, this.foeHpValue, scene.foeHp);

    const metrics = this.fieldMetrics(scene.source);
    scene.metrics = metrics;
    scene.anchors = this.battleAnchors(scene.source, metrics);

    if (scene.activeFrame) {
      const frameOffset = this.frameOffset(scene);
      for (const sprite of scene.activeFrame.sprites) this.drawSpriteTile(sprite, metrics, frameOffset);
    }

    for (const effect of scene.activeEffects) {
      const duration = Math.max(1, effect.end - effect.start);
      const progress = clamp((scene.time - effect.start) / duration, 0, 1);
      this.applySpecialEffect(effect.effectName, progress, scene);
    }

    if (scene.hiddenAttacker) {
      const attackerNode = scene.side === 'player' ? this.playerSprite : this.foeSprite;
      attackerNode.style.opacity = '0';
    }
    if (scene.hiddenDefender) {
      const defenderNode = scene.side === 'player' ? this.foeSprite : this.playerSprite;
      defenderNode.style.opacity = '0';
    }
    if (scene.hitActive) {
      const target = scene.side === 'player' ? this.foeSprite : this.playerSprite;
      target.classList.toggle('hurt', Math.floor(scene.time / 90) % 2 === 0);
    }
  }
}

class AttackPreviewApp {
  constructor(data, tilesets) {
    this.data = data;
    this.tilesets = tilesets;
    this.moveIndex = 0;
    this.side = 'player';
    this.playing = true;
    this.loopAll = false;
    this.startedAt = performance.now();
    this.timeline = null;
    this.viewports = [];
    this.currentMove = null;
  }

  viewportMarkup(mode) {
    return `
      <div class="preview-stage ${mode}" data-viewport="${mode}">
        <div class="battle-stage">
          <div class="battle-field"><canvas class="battle-layer"></canvas></div>
          <div class="battle-status battle-status-foe">
            <div class="battle-status-top"><strong>${escapeHtml(SAMPLE.foe.name)}</strong><span>Lv100</span></div>
            <div class="battle-status-meta"><span>Front Sprite</span><span data-foe-hp-value>100/100</span></div>
            <div class="battle-hp-row"><span class="hp-label">HP</span><div class="hp"><div class="hp-fill" data-foe-hp-fill></div></div></div>
          </div>
          <div class="battle-status battle-status-player">
            <div class="battle-status-top"><strong>${escapeHtml(SAMPLE.player.name)}</strong><span>Lv100</span></div>
            <div class="battle-status-meta"><span>Back Sprite</span><span data-player-hp-value>100/100</span></div>
            <div class="battle-hp-row"><span class="hp-label">HP</span><div class="hp"><div class="hp-fill" data-player-hp-fill></div></div></div>
          </div>
          <div class="battle-sprite-wrap battle-sprite-foe">
            <div class="battle-shadow"></div>
            <img class="sprite battle front attack-preview-foe" src="${FOE_SPRITE}" alt="${escapeHtml(SAMPLE.foe.name)}">
          </div>
          <div class="battle-sprite-wrap battle-sprite-player">
            <div class="battle-shadow"></div>
            <img class="sprite battle back attack-preview-player" src="${PLAYER_SPRITE}" alt="${escapeHtml(SAMPLE.player.name)}">
          </div>
          <div class="battle-feed"><div class="feed-line"></div></div>
        </div>
      </div>
    `;
  }

  markup() {
    return `
      <div class="preview-shell">
        <section class="preview-card preview-header">
          <div>
            <div class="label">Gen 1 Source Preview</div>
            <h1>Pokemon Attack Animation Audit</h1>
            <p>This preview now reads the original move animation scripts from <a href="https://github.com/pret/pokered" target="_blank" rel="noreferrer">pret/pokered</a>. Each move uses the actual Gen 1 script order, subanimation frames, base coordinates and battle-effect routines as the source of truth.</p>
          </div>
          <div class="preview-meta">
            <span>165 Gen 1 moves</span>
            <span>Original subanimations</span>
            <span>Desktop + Mobile stage</span>
          </div>
        </section>
        <section class="preview-card preview-controls">
          <div class="preview-current">
            <div class="preview-current-head">
              <div>
                <div class="label">Current Move</div>
                <h2 data-current-name></h2>
                <p data-current-meta></p>
              </div>
              <span data-current-source></span>
            </div>
          </div>
          <div class="preview-buttons">
            <button class="btn-ghost" data-action="prev">Prev</button>
            <button class="btn-primary" data-action="replay">Replay</button>
            <button class="btn-ghost" data-action="next">Next</button>
            <button class="btn-ghost" data-action="side">Attacker: Player</button>
            <button class="btn-ghost" data-action="loop">Loop All: Off</button>
          </div>
        </section>
        <section class="preview-stage-grid">
          <div class="preview-stage-stack">
            <div class="preview-card preview-stage-panel">
              <div class="preview-stage-head">
                <div>
                  <div class="label">Desktop Battle View</div>
                  <h2>Live Stage Preview</h2>
                </div>
                <span>Matches the battle composition</span>
              </div>
              ${this.viewportMarkup('desktop')}
            </div>
            <div class="preview-card preview-stage-panel">
              <div class="preview-stage-head">
                <div>
                  <div class="label">Mobile Battle View</div>
                  <h2>Phone Stage Preview</h2>
                </div>
                <span>Same move, narrower battle frame</span>
              </div>
              ${this.viewportMarkup('mobile')}
            </div>
          </div>
          <aside class="preview-moves" data-move-list></aside>
        </section>
      </div>
    `;
  }

  mount(root) {
    root.innerHTML = this.markup();
    this.nameNode = root.querySelector('[data-current-name]');
    this.metaNode = root.querySelector('[data-current-meta]');
    this.sourceNode = root.querySelector('[data-current-source]');
    this.sideButton = root.querySelector('[data-action="side"]');
    this.loopButton = root.querySelector('[data-action="loop"]');
    this.moveList = root.querySelector('[data-move-list]');

    root.querySelector('[data-action="prev"]').addEventListener('click', () => this.step(-1));
    root.querySelector('[data-action="next"]').addEventListener('click', () => this.step(1));
    root.querySelector('[data-action="replay"]').addEventListener('click', () => this.replay());
    this.sideButton.addEventListener('click', () => {
      this.side = this.side === 'player' ? 'foe' : 'player';
      this.sideButton.textContent = `Attacker: ${this.side === 'player' ? 'Player' : 'Foe'}`;
      this.replay();
    });
    this.loopButton.addEventListener('click', () => {
      this.loopAll = !this.loopAll;
      this.loopButton.textContent = `Loop All: ${this.loopAll ? 'On' : 'Off'}`;
      this.loopButton.classList.toggle('active', this.loopAll);
    });

    this.viewports = Array.from(root.querySelectorAll('[data-viewport]')).map((node) => new BattleViewport(node, node.dataset.viewport, this.tilesets));
    this.renderMoveList();
    this.setMove(0);

    const loop = (time) => {
      this.tick(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderMoveList() {
    this.moveList.innerHTML = this.data.moves.map((move, index) => `
      <button class="move-chip${index === this.moveIndex ? ' active' : ''}" data-move-index="${index}">
        <strong>#${move.num.toString().padStart(3, '0')}</strong>
        <span>${escapeHtml(move.name)}</span>
        <em>${escapeHtml(move.pointerLabel)}</em>
      </button>
    `).join('');
    this.moveList.querySelectorAll('[data-move-index]').forEach((button) => {
      button.addEventListener('click', () => this.setMove(Number(button.dataset.moveIndex)));
    });
  }

  setMove(index) {
    this.moveIndex = (index + this.data.moves.length) % this.data.moves.length;
    this.currentMove = this.data.moves[this.moveIndex];
    this.timeline = buildTimeline(this.currentMove, this.side, this.data.source);
    this.startedAt = performance.now();
    this.playing = true;
    this.nameNode.textContent = this.currentMove.name;
    this.metaNode.textContent = `${this.currentMove.type} | ${this.currentMove.category} | PP ${this.currentMove.pp ?? '-'} | Acc ${this.currentMove.accuracy ?? '-'}`;
    this.sourceNode.textContent = this.currentMove.pointerLabel;
    this.renderMoveList();
  }

  step(delta) {
    this.setMove(this.moveIndex + delta);
  }

  replay() {
    this.timeline = buildTimeline(this.currentMove, this.side, this.data.source);
    this.startedAt = performance.now();
    this.playing = true;
  }

  currentScene(time) {
    const elapsed = time - this.startedAt;
    const localTime = this.playing ? elapsed : Math.min(elapsed, this.timeline.total);
    const activeFrame = this.timeline.segments.find((segment) => segment.kind === 'subframe' && localTime >= segment.start && localTime < segment.end)?.frame || null;
    const activeEffects = [];
    let darkPalette = false;
    let hiddenAttacker = false;
    let hiddenDefender = false;

    for (const segment of this.timeline.segments) {
      if (segment.kind !== 'special' || localTime < segment.start) continue;
      if (segment.effect === 'SE_DARK_SCREEN_PALETTE') darkPalette = true;
      if (segment.effect === 'SE_RESET_SCREEN_PALETTE') darkPalette = false;
      if (segment.effect === 'SE_HIDE_MON_PIC') hiddenAttacker = true;
      if (segment.effect === 'SE_SHOW_MON_PIC') hiddenAttacker = false;
      if (segment.effect === 'SE_HIDE_ENEMY_MON_PIC') hiddenDefender = true;
      if (segment.effect === 'SE_SHOW_ENEMY_MON_PIC') hiddenDefender = false;
      if (localTime >= segment.start && localTime < segment.end) activeEffects.push({...segment, effectName: segment.effect});
    }

    const subframeEffect = this.timeline.segments.find((segment) => segment.kind === 'subframe' && segment.moveSpecificEffect && localTime >= segment.start && localTime < segment.end);
    if (subframeEffect) {
      activeEffects.push({
        effectName: subframeEffect.moveSpecificEffect,
        start: subframeEffect.start,
        end: subframeEffect.start + (MOVE_SPECIFIC_DURATION[subframeEffect.moveSpecificEffect] || (subframeEffect.end - subframeEffect.start)),
      });
    }

    if (darkPalette) activeEffects.push({effectName: 'SE_DARK_SCREEN_PALETTE', start: 0, end: localTime + 1});

    const attacker = this.side === 'player' ? SAMPLE.player.name : SAMPLE.foe.name;
    const defender = this.side === 'player' ? SAMPLE.foe.name : SAMPLE.player.name;
    let log = `${attacker} used ${this.currentMove.name}!`;
    if (this.timeline.impactTime !== null && localTime >= this.timeline.impactTime && localTime < this.timeline.resolveTime) {
      log = `${this.currentMove.name} hits ${defender}!`;
    } else if (localTime >= this.timeline.resolveTime) {
      log = describeResolution(this.currentMove, attacker, defender);
    }

    const damage = estimateDamage(this.currentMove);
    const hitProgress = this.timeline.impactTime === null ? 0 : clamp((localTime - this.timeline.impactTime) / 200, 0, 1);
    const playerHp = this.side === 'foe' ? 1 - (damage * hitProgress) : 1;
    const foeHp = this.side === 'player' ? 1 - (damage * hitProgress) : 1;

    return {
      time: localTime,
      side: this.side,
      source: this.data.source,
      activeFrame,
      activeEffects,
      hiddenAttacker,
      hiddenDefender,
      hitActive: this.timeline.impactTime !== null && localTime >= this.timeline.impactTime && localTime < this.timeline.impactTime + 220,
      playerHp,
      foeHp,
      log,
    };
  }

  tick(time) {
    if (!this.currentMove || !this.timeline) return;
    const elapsed = time - this.startedAt;
    if (elapsed >= this.timeline.total) {
      if (this.loopAll) {
        this.setMove(this.moveIndex + 1);
        return;
      }
      this.playing = false;
    }
    const scene = this.currentScene(time);
    for (const viewport of this.viewports) viewport.render(scene);
  }
}

async function main() {
  injectStyles();
  const response = await fetch(DATA_PATH);
  if (!response.ok) throw new Error(`Failed to load ${DATA_PATH}`);
  const data = await response.json();
  const loadedTilesets = await Promise.all(
    Object.entries(data.source.tilesets).map(async ([index, src]) => {
      const image = await loadImage(src);
      return [index, makeWhiteTileTransparent(image)];
    }),
  );
  const tilesets = Object.fromEntries(loadedTilesets);
  const app = new AttackPreviewApp(data, tilesets);
  app.mount(document.getElementById('app'));
}

main().catch((error) => {
  console.error(error);
  document.getElementById('app').innerHTML = `<pre style="padding:16px;color:#fff;background:#300">${escapeHtml(error.stack || error.message)}</pre>`;
});

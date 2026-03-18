import fs from 'node:fs/promises';
import path from 'node:path';
import {Dex} from '@pkmn/dex';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'games', 'pokemon-attack-preview-data.json');
const CACHE_DIR = path.join(ROOT, 'tmp-pokered');
const dex = Dex.forGen(1);

const SOURCE_BASE = 'https://raw.githubusercontent.com/pret/pokered/master';
const SOURCE_FILES = {
  moveAnimations: 'data/moves/animations.asm',
  subanimations: 'data/battle_anims/subanimations.asm',
  frameBlocks: 'data/battle_anims/frame_blocks.asm',
  baseCoords: 'data/battle_anims/base_coords.asm',
  specialEffects: 'data/battle_anims/special_effects.asm',
  specialEffectPointers: 'data/battle_anims/special_effect_pointers.asm',
  engineBattleAnimations: 'engine/battle/animations.asm',
  moveTiles0: 'gfx/battle/move_anim_0.png',
  moveTiles1: 'gfx/battle/move_anim_1.png',
  gfxMacros: 'macros/gfx.asm',
};

const TILESET_PATHS = {
  0: '../assets/pokered-move-anim-0.png',
  1: '../assets/pokered-move-anim-1.png',
  2: '../assets/pokered-move-anim-0.png',
};

const ATTACK_EFFECT_MS = 70;
const OAM_XFLIP = 1 << 5;
const OAM_YFLIP = 1 << 6;

function cachePath(relativePath) {
  return path.join(CACHE_DIR, relativePath.replaceAll('/', '__'));
}

async function ensureSource(relativePath) {
  const localPath = cachePath(relativePath);
  try {
    return await fs.readFile(localPath, relativePath.endsWith('.png') ? null : 'utf8');
  } catch {}

  await fs.mkdir(CACHE_DIR, {recursive: true});
  const response = await fetch(`${SOURCE_BASE}/${relativePath}`);
  if (!response.ok) throw new Error(`Failed to fetch ${relativePath}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(localPath, buffer);
  return relativePath.endsWith('.png') ? buffer : buffer.toString('utf8');
}

async function copyTilesets() {
  const assetDir = path.join(ROOT, 'assets');
  await fs.mkdir(assetDir, {recursive: true});
  const tile0 = await ensureSource(SOURCE_FILES.moveTiles0);
  const tile1 = await ensureSource(SOURCE_FILES.moveTiles1);
  await fs.writeFile(path.join(assetDir, 'pokered-move-anim-0.png'), tile0);
  await fs.writeFile(path.join(assetDir, 'pokered-move-anim-1.png'), tile1);
}

function stripComment(line) {
  return line.split(';')[0].trim();
}

function parsePointerLabels(text, label) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${label}:`);
  if (start === -1) throw new Error(`Missing pointer table ${label}`);
  const labels = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = stripComment(lines[index]);
    if (!line) continue;
    if (line.startsWith('dw ')) {
      labels.push(line.slice(3).trim());
      continue;
    }
    if (labels.length) break;
  }
  return labels;
}

function parseMoveScripts(text) {
  const scripts = new Map();
  const lines = text.split(/\r?\n/);
  let pendingLabels = [];
  let commands = null;

  const flush = () => {
    if (!pendingLabels.length) return;
    const payload = commands ? [...commands] : [];
    for (const label of pendingLabels) scripts.set(label, payload);
    pendingLabels = [];
    commands = null;
  };

  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (!line) continue;
    const labelMatch = line.match(/^([A-Za-z0-9_]+Anim):$/);
    if (labelMatch) {
      if (commands) flush();
      pendingLabels.push(labelMatch[1]);
      continue;
    }
    if (line.startsWith('battle_anim ')) {
      commands ||= [];
      const args = line
        .slice('battle_anim '.length)
        .split(',')
        .map((part) => part.trim());
      const [animationId, second, tileset = '', delay = ''] = args;
      const isSpecialEffect = second.startsWith('SE_');
      commands.push(
        isSpecialEffect
          ? {kind: 'special', animationId, effect: second}
          : {
              kind: 'subanimation',
              animationId,
              subanimation: second,
              tileset: Number(tileset),
              delay: Number(delay),
            },
      );
      continue;
    }
    if (line.startsWith('db -1')) {
      flush();
    }
  }
  flush();
  return scripts;
}

function parseSubanimations(text) {
  const subanimations = new Map();
  const lines = text.split(/\r?\n/);
  let current = null;

  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (!line) continue;
    const labelMatch = line.match(/^([A-Za-z0-9_]+):$/);
    if (labelMatch) {
      if (current) subanimations.set(current.label, current);
      current = {label: labelMatch[1], type: 'SUBANIMTYPE_NORMAL', count: 0, entries: []};
      continue;
    }
    if (!current) continue;
    const headerMatch = line.match(/^subanim\s+([A-Z0-9_]+),\s*(\d+)$/);
    if (headerMatch) {
      current.type = headerMatch[1];
      current.count = Number(headerMatch[2]);
      continue;
    }
    const entryMatch = line.match(/^db\s+([A-Z0-9_]+),\s+([A-Z0-9_]+),\s+([A-Z0-9_]+)$/);
    if (entryMatch) {
      current.entries.push({
        frameBlock: entryMatch[1],
        baseCoord: entryMatch[2],
        mode: entryMatch[3],
      });
    }
  }
  if (current) subanimations.set(current.label, current);
  return subanimations;
}

function parseAttributes(expression) {
  const trimmed = expression.trim();
  if (!trimmed || trimmed === '0') return 0;
  let value = 0;
  for (const token of trimmed.split('|').map((part) => part.trim())) {
    if (token === 'OAM_XFLIP') value |= OAM_XFLIP;
    else if (token === 'OAM_YFLIP') value |= OAM_YFLIP;
  }
  return value;
}

function parseFrameBlocks(text) {
  const frameBlocks = new Map();
  const lines = text.split(/\r?\n/);
  let current = null;

  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (!line) continue;
    const labelMatch = line.match(/^(FrameBlock[A-Za-z0-9_]+):$/);
    if (labelMatch) {
      if (current) frameBlocks.set(current.label, current);
      current = {label: labelMatch[1], expectedCount: 0, sprites: []};
      continue;
    }
    if (!current) continue;
    const countMatch = line.match(/^db\s+(\d+)$/);
    if (countMatch) {
      current.expectedCount = Number(countMatch[1]);
      continue;
    }
    const spriteMatch = line.match(/^dbsprite\s+(.+)$/);
    if (spriteMatch) {
      const args = spriteMatch[1].split(',').map((part) => part.trim());
      const [xTile, yTile, xPixel, yPixel, tile, attributes] = args;
      current.sprites.push({
        x: (Number(xTile) * 8) + Number(xPixel),
        y: (Number(yTile) * 8) + Number(yPixel),
        tile: Number(tile.replace('$', '0x')),
        attr: parseAttributes(attributes),
      });
    }
  }
  if (current) frameBlocks.set(current.label, current);
  return frameBlocks;
}

function parseBaseCoords(text) {
  const coords = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('db ')) continue;
    const match = line.match(/^db\s+\$([0-9A-F]{2}),\s+\$([0-9A-F]{2})\s+;\s+(BASECOORD_[0-9A-F]{2})$/i);
    if (!match) continue;
    coords.set(match[3], {
      label: match[3],
      y: Number.parseInt(match[1], 16),
      x: Number.parseInt(match[2], 16),
    });
  }
  return coords;
}

function parseSpecialEffectByAnimation(text) {
  const map = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line.startsWith('anim_special_effect ')) continue;
    const match = line.match(/^anim_special_effect\s+([A-Z0-9_]+),\s+([A-Za-z0-9_]+)$/);
    if (!match) continue;
    map.set(match[1], match[2]);
  }
  return map;
}

function parseSpecialEffectPointers(text) {
  const map = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line.startsWith('special_effect ')) continue;
    const match = line.match(/^special_effect\s+([A-Z0-9_]+),\s+([A-Za-z0-9_]+)$/);
    if (!match) continue;
    map.set(match[1], match[2]);
  }
  return map;
}

function extractAsmBlock(text, label) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => stripComment(line) === `${label}:`);
  if (start === -1) throw new Error(`Missing block ${label}`);
  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = stripComment(lines[index]);
    if (!line) continue;
    if (/^[A-Za-z0-9_.]+:$/.test(line)) break;
    block.push(line);
  }
  return block;
}

function parseAsmNumber(token) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('$')) return Number.parseInt(trimmed.slice(1), 16);
  if (trimmed === '-1') return -1;
  return Number(trimmed);
}

function parseAsmByteList(text, label) {
  const values = [];
  for (const line of extractAsmBlock(text, label)) {
    if (!(line.startsWith('db ') || line.startsWith('dc '))) continue;
    const body = line.slice(3);
    for (const token of body.split(',').map((part) => part.trim()).filter(Boolean)) {
      const value = parseAsmNumber(token);
      if (value !== null && !Number.isNaN(value)) values.push(value);
    }
  }
  return values;
}

function parseAsmPairs(text, label, terminator = -1) {
  const values = parseAsmByteList(text, label).filter((value) => value !== terminator);
  const pairs = [];
  for (let index = 0; index < values.length; index += 2) {
    if (values[index + 1] === undefined) break;
    pairs.push({y: values[index], x: values[index + 1]});
  }
  return pairs;
}

function parsePaletteSequence(text, label) {
  const rows = [];
  for (const line of extractAsmBlock(text, label)) {
    if (!line.startsWith('dc ')) {
      if (line === 'db 1') break;
      continue;
    }
    const values = line
      .slice(3)
      .split(',')
      .map((part) => parseAsmNumber(part))
      .filter((value) => value !== null && !Number.isNaN(value));
    if (values.length) rows.push(values);
  }
  return rows;
}

function normalizeAsmLabel(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildNormalizedLookup(map) {
  const lookup = new Map();
  for (const [key, value] of map.entries()) lookup.set(normalizeAsmLabel(key), value);
  return lookup;
}

function effectiveTransform(type, side) {
  if (side === 'player') {
    if (type === 'SUBANIMTYPE_ENEMY') return {flip: 'SUBANIMTYPE_HFLIP', reverse: false};
    return {flip: 'SUBANIMTYPE_NORMAL', reverse: false};
  }
  if (type === 'SUBANIMTYPE_ENEMY') return {flip: 'SUBANIMTYPE_NORMAL', reverse: false};
  if (type === 'SUBANIMTYPE_REVERSE') return {flip: 'SUBANIMTYPE_NORMAL', reverse: true};
  return {flip: type, reverse: false};
}

function toggleHV(attr, horizontal, vertical) {
  let next = attr;
  if (horizontal) next ^= OAM_XFLIP;
  if (vertical) next ^= OAM_YFLIP;
  return next;
}

function transformSprite(sprite, base, transform) {
  if (transform === 'SUBANIMTYPE_HVFLIP') {
    return {
      x: 168 - (base.x + sprite.x),
      y: 136 - (base.y + sprite.y),
      tile: sprite.tile,
      attr: toggleHV(sprite.attr, true, true),
    };
  }
  if (transform === 'SUBANIMTYPE_HFLIP') {
    return {
      x: 168 - (base.x + sprite.x),
      y: base.y + sprite.y + 40,
      tile: sprite.tile,
      attr: toggleHV(sprite.attr, true, false),
    };
  }
  if (transform === 'SUBANIMTYPE_COORDFLIP') {
    return {
      x: 168 - base.x + sprite.x,
      y: 136 - base.y + sprite.y,
      tile: sprite.tile,
      attr: sprite.attr,
    };
  }
  return {
    x: base.x + sprite.x,
    y: base.y + sprite.y,
    tile: sprite.tile,
    attr: sprite.attr,
  };
}

function toVisibleSprite(sprite, tileset) {
  return {
    x: sprite.x - 8,
    y: sprite.y - 16,
    tile: sprite.tile,
    tileset,
    flipX: Boolean(sprite.attr & OAM_XFLIP),
    flipY: Boolean(sprite.attr & OAM_YFLIP),
  };
}

function compileSubanimation(subanimation, side, tileset, delay, frameBlocks, baseCoords, frameBlockLookup) {
  const {flip, reverse} = effectiveTransform(subanimation.type, side);
  const entries = reverse ? [...subanimation.entries].reverse() : subanimation.entries;
  const frames = [];
  let activeSprites = [];

  for (const entry of entries) {
    const frameBlock = frameBlockLookup.get(normalizeAsmLabel(entry.frameBlock));
    const baseCoord = baseCoords.get(entry.baseCoord);
    if (!frameBlock || !baseCoord) continue;
    const rendered = frameBlock.sprites.map((sprite) => toVisibleSprite(transformSprite(sprite, baseCoord, flip), tileset));
    activeSprites = [...activeSprites, ...rendered];

    if (entry.mode !== 'FRAMEBLOCKMODE_02') {
      frames.push({
        durationFrames: Math.max(1, delay || 1),
        mode: entry.mode,
        sprites: activeSprites.map((sprite) => ({...sprite})),
      });
    }

    if (!['FRAMEBLOCKMODE_02', 'FRAMEBLOCKMODE_03', 'FRAMEBLOCKMODE_04'].includes(entry.mode)) {
      activeSprites = [];
    }
  }

  return frames;
}

function buildMoveMetadata(move) {
  return {
    id: move.id,
    num: move.num,
    name: move.name,
    type: move.type,
    category: move.category,
    pp: move.pp ?? null,
    power: move.basePower ?? 0,
    accuracy: move.accuracy === true ? 100 : move.accuracy,
  };
}

function compileMove(move, pointerLabel, scripts, subanimations, frameBlocks, baseCoords, perAnimationEffects, specialEffectPointers) {
  const commands = scripts.get(pointerLabel);
  if (!commands) {
    throw new Error(`Missing script ${pointerLabel} for ${move.name}`);
  }

  const subanimationLookup = buildNormalizedLookup(subanimations);
  const frameBlockLookup = buildNormalizedLookup(frameBlocks);

  const compiledCommands = commands.map((command) => {
    if (command.kind === 'special') {
      return {
        kind: 'special',
        animationId: command.animationId,
        effect: command.effect,
        routine: specialEffectPointers.get(command.effect) || '',
      };
    }
    const subanimation = subanimationLookup.get(normalizeAsmLabel(command.subanimation));
    if (!subanimation) {
      throw new Error(`Missing subanimation ${command.subanimation} for ${move.name}`);
    }
    return {
      kind: 'subanimation',
      animationId: command.animationId,
      subanimation: command.subanimation,
      tileset: command.tileset,
      delay: command.delay,
      moveSpecificEffect: perAnimationEffects.get(command.animationId) || '',
      frames: {
        player: compileSubanimation(subanimation, 'player', command.tileset, command.delay, frameBlocks, baseCoords, frameBlockLookup),
        foe: compileSubanimation(subanimation, 'foe', command.tileset, command.delay, frameBlocks, baseCoords, frameBlockLookup),
      },
    };
  });

  return {
    ...buildMoveMetadata(move),
    pointerLabel,
    commands: compiledCommands,
  };
}

async function main() {
  await fs.mkdir(CACHE_DIR, {recursive: true});
  const [
    moveAnimationsAsm,
    subanimationsAsm,
    frameBlocksAsm,
    baseCoordsAsm,
    specialEffectsAsm,
    specialEffectPointersAsm,
    engineBattleAnimationsAsm,
  ] = await Promise.all([
    ensureSource(SOURCE_FILES.moveAnimations),
    ensureSource(SOURCE_FILES.subanimations),
    ensureSource(SOURCE_FILES.frameBlocks),
    ensureSource(SOURCE_FILES.baseCoords),
    ensureSource(SOURCE_FILES.specialEffects),
    ensureSource(SOURCE_FILES.specialEffectPointers),
    ensureSource(SOURCE_FILES.engineBattleAnimations),
    copyTilesets(),
  ]);

  const movePointers = parsePointerLabels(moveAnimationsAsm, 'AttackAnimationPointers');
  const moveScripts = parseMoveScripts(moveAnimationsAsm);
  const subanimations = parseSubanimations(subanimationsAsm);
  const frameBlocks = parseFrameBlocks(frameBlocksAsm);
  const baseCoords = parseBaseCoords(baseCoordsAsm);
  const perAnimationEffects = parseSpecialEffectByAnimation(specialEffectsAsm);
  const specialEffectPointers = parseSpecialEffectPointers(specialEffectPointersAsm);

  const moves = dex.moves
    .all()
    .filter((move) => move.exists && move.gen === 1 && !move.isNonstandard)
    .sort((a, b) => a.num - b.num);

  if (moves.length !== movePointers.length) {
    throw new Error(`Move count mismatch: dex=${moves.length}, pointers=${movePointers.length}`);
  }

  const payload = {
    source: {
      repository: 'pret/pokered',
      moveAnimations: SOURCE_FILES.moveAnimations,
      subanimations: SOURCE_FILES.subanimations,
      frameBlocks: SOURCE_FILES.frameBlocks,
      baseCoords: SOURCE_FILES.baseCoords,
      specialEffects: SOURCE_FILES.specialEffects,
      specialEffectPointers: SOURCE_FILES.specialEffectPointers,
      engineBattleAnimations: SOURCE_FILES.engineBattleAnimations,
      tilesets: TILESET_PATHS,
      effectFrameMs: ATTACK_EFFECT_MS,
      coordinateSpace: {width: 160, height: 120, xOffset: 8, yOffset: 16},
      specialEffectData: {
        flashScreenLongMonochrome: parsePaletteSequence(engineBattleAnimationsAsm, 'FlashScreenLongMonochrome'),
        spiralBallAnimationCoordinates: parseAsmPairs(engineBattleAnimationsAsm, 'SpiralBallAnimationCoordinates'),
        upwardBallsAnimXCoordinatesPlayerTurn: parseAsmByteList(engineBattleAnimationsAsm, 'UpwardBallsAnimXCoordinatesPlayerTurn').filter((value) => value !== -1),
        upwardBallsAnimXCoordinatesEnemyTurn: parseAsmByteList(engineBattleAnimationsAsm, 'UpwardBallsAnimXCoordinatesEnemyTurn').filter((value) => value !== -1),
        fallingObjectsDeltaXs: parseAsmByteList(engineBattleAnimationsAsm, 'FallingObjects_DeltaXs'),
        fallingObjectsInitialXCoords: parseAsmByteList(engineBattleAnimationsAsm, 'FallingObjects_InitialXCoords'),
        fallingObjectsInitialMovementData: parseAsmByteList(engineBattleAnimationsAsm, 'FallingObjects_InitialMovementData'),
        wavyScreenLineOffsets: parseAsmByteList(engineBattleAnimationsAsm, 'WavyScreenLineOffsets').filter((value) => value !== 0x80),
      },
    },
    moves: moves.map((move, index) =>
      compileMove(
        move,
        movePointers[index],
        moveScripts,
        subanimations,
        frameBlocks,
        baseCoords,
        perAnimationEffects,
        specialEffectPointers,
      )),
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${payload.moves.length} Gen 1 attack preview entries to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

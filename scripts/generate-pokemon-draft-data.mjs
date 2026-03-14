import {Dex} from '@pkmn/dex';
import fs from 'node:fs/promises';
import path from 'node:path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'games', 'pokemon-draft-data.json');
const gen = Dex.forGen(1);

const EXCLUDED_MOVES = new Set(['struggle']);
const MAX_STAT_EXP_TERM = Math.floor(Math.ceil(Math.sqrt(65535)) / 4);

function uniqueBaseSpecies() {
  const seen = new Set();
  return gen.species.all().filter((species) => {
    if (species.num < 1 || species.num > 151) return false;
    if (species.forme || species.baseSpecies !== species.name) return false;
    if (seen.has(species.num)) return false;
    seen.add(species.num);
    return true;
  }).sort((a, b) => a.num - b.num);
}

function moveAllowed(move, learnsetEntry = []) {
  if (!move.exists || move.gen !== 1) return false;
  if (EXCLUDED_MOVES.has(move.id)) return false;
  return learnsetEntry.some((source) => source.startsWith('1'));
}

function computeMaxStat(base, isHp) {
  const raw = (base * 2) + 15 + MAX_STAT_EXP_TERM;
  return isHp ? raw + 110 : raw + 5;
}

function computeFallbackStats(species) {
  return {
    hp: computeMaxStat(species.baseStats.hp, true),
    atk: computeMaxStat(species.baseStats.atk, false),
    def: computeMaxStat(species.baseStats.def, false),
    spc: computeMaxStat(species.baseStats.spa, false),
    spe: computeMaxStat(species.baseStats.spe, false),
  };
}

function parseStatRows(html) {
  const wanted = {HP: 'hp', Attack: 'atk', Defense: 'def', Speed: 'spe', Special: 'spc'};
  const matches = [...html.matchAll(/<td class="bigheaderstyle">([^<]+)<\/td>\s*<td>\d+<\/td>\s*<td>\d+<\/td>\s*<td>\d+<\/td>\s*<td>\d+<\/td>\s*<td>(\d+)<\/td>/g)];
  const stats = {};
  for (const [, label, maxValue] of matches) {
    const key = wanted[label.trim()];
    if (key) stats[key] = Number(maxValue);
  }
  return Object.keys(wanted).every((label) => stats[wanted[label]]) ? stats : null;
}

async function fetchStats(species) {
  const url = `https://www.psypokes.com/dex/psydex/${String(species.num).padStart(3, '0')}/stats`;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parsed = parseStatRows(html);
    return parsed || computeFallbackStats(species);
  } catch {
    return computeFallbackStats(species);
  }
}

async function build() {
  const speciesList = uniqueBaseSpecies();
  const data = [];

  for (const species of speciesList) {
    const learnset = await gen.learnsets.get(species.id);
    const moveIds = Object.entries(learnset.learnset)
      .map(([id, sources]) => [id, sources, gen.moves.get(id)])
      .filter(([, sources, move]) => moveAllowed(move, sources))
      .map(([id]) => id)
      .sort();

    data.push({
      id: species.id,
      num: species.num,
      name: species.name,
      types: species.types,
      baseStats: {
        hp: species.baseStats.hp,
        atk: species.baseStats.atk,
        def: species.baseStats.def,
        spc: species.baseStats.spa,
        spe: species.baseStats.spe,
      },
      battleStats: await fetchStats(species),
      nfe: !!species.nfe,
      moveIds: Array.from(new Set(moveIds)),
      sprites: {
        front: `../assets/pokemon-rby-clean/red-green/${species.num}.png`,
        back: `../assets/pokemon-rby-clean/red-green/back/${species.num}.png`,
      },
      sources: {
        stats: `https://www.psypokes.com/dex/psydex/${String(species.num).padStart(3, '0')}/stats`,
      },
    });
  }

  await fs.writeFile(OUTPUT, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Wrote ${data.length} Gen 1 species to ${OUTPUT}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

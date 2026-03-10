import {Dex} from '@pkmn/dex';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'games', 'pokemon-draft-data.json');
const gen = Dex.forGen(9);

const EXCLUDED_MOVES = new Set([
  'celebrate', 'holdhands', 'helpinghand', 'assist', 'copycat', 'metronome', 'mimic', 'mirrormove',
  'sleeptalk', 'sketch', 'struggle', 'chatter',
]);

function uniqueBaseSpecies() {
  const seen = new Set();
  return gen.species.all().filter((species) => {
    if (species.num < 1 || species.num > 150) return false;
    if (species.isNonstandard && species.isNonstandard !== 'Past') return false;
    if (species.forme || species.baseSpecies !== species.name) return false;
    if (seen.has(species.num)) return false;
    seen.add(species.num);
    return true;
  }).sort((a, b) => a.num - b.num);
}

function pickAbilities(species) {
  return Object.values(species.abilities).filter(Boolean);
}

function moveAllowed(move) {
  if (!move.exists || move.isNonstandard) return false;
  if (EXCLUDED_MOVES.has(move.id)) return false;
  if (move.category === 'Status') return true;
  return move.basePower > 0 && move.accuracy !== 0;
}

async function build() {
  const speciesList = uniqueBaseSpecies();
  const data = [];

  for (const species of speciesList) {
    const learnset = await gen.learnsets.get(species.id);
    const moves = Object.keys(learnset.learnset)
      .map((id) => gen.moves.get(id))
      .filter(moveAllowed)
      .map((move) => move.id);

    data.push({
      id: species.id,
      num: species.num,
      name: species.name,
      types: species.types,
      abilities: pickAbilities(species),
      baseStats: species.baseStats,
      nfe: !!species.nfe,
      weightkg: species.weightkg,
      moveIds: Array.from(new Set(moves)).sort(),
    });
  }

  await fs.writeFile(OUTPUT, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Wrote ${data.length} species to ${OUTPUT}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

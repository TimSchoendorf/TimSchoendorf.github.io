import {writeFile} from 'node:fs/promises';
import speciesPool from '../games/pokemon-draft-data.json' with {type: 'json'};
import {Dex} from '@pkmn/sim';

const OUTPUT_PATH = new URL('../src/pokemon-i18n-data.js', import.meta.url);
const ITEM_IDS = ['leftovers', 'blacksludge', 'focussash', 'lumberry', 'sitrusberry', 'lifeorb', 'airballoon'];
const ITEM_API_SLUGS = {
  leftovers: 'leftovers',
  blacksludge: 'black-sludge',
  focussash: 'focus-sash',
  lumberry: 'lum-berry',
  sitrusberry: 'sitrus-berry',
  lifeorb: 'life-orb',
  airballoon: 'air-balloon',
};

function normalizeText(value = '') {
  return String(value)
    .replace(/[\f\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/POK.MON/g, 'Pokémon')
    .trim();
}

function latestGermanText(entries, field) {
  const german = (entries || []).filter((entry) => entry.language?.name === 'de');
  if (!german.length) return '';
  return normalizeText(german[german.length - 1]?.[field] || '');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed for ${url}: ${response.status}`);
  return response.json();
}

async function runPool(tasks, limit, worker) {
  const queue = tasks.slice();
  const workers = Array.from({length: Math.min(limit, tasks.length)}, async () => {
    while (queue.length) {
      const task = queue.shift();
      await worker(task);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const dex = Dex.mod('gen1');
  const pokemon = {};
  const moves = {};
  const items = {};
  const types = {};

  const pokemonTasks = speciesPool.map((species) => ({id: species.id, num: species.num}));
  await runPool(pokemonTasks, 8, async ({id, num}) => {
    const payload = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${num}`);
    const germanName = payload.names.find((entry) => entry.language?.name === 'de')?.name || speciesPool.find((entry) => entry.id === id)?.name || id;
    pokemon[id] = germanName;
  });

  const moveTasks = dex.moves
    .all()
    .filter((move) => move?.exists && move.gen === 1 && move.num > 0)
    .map((move) => ({id: move.id, num: move.num}));
  await runPool(moveTasks, 8, async ({id, num}) => {
    const payload = await fetchJson(`https://pokeapi.co/api/v2/move/${num}`);
    const germanName = payload.names.find((entry) => entry.language?.name === 'de')?.name || dex.moves.get(id)?.name || id;
    const desc = latestGermanText(payload.flavor_text_entries, 'flavor_text');
    moves[id] = {name: germanName, desc};
  });

  const itemTasks = ITEM_IDS.map((itemId) => ({id: itemId, slug: ITEM_API_SLUGS[itemId] || itemId}));
  await runPool(itemTasks, 6, async ({id, slug}) => {
    const payload = await fetchJson(`https://pokeapi.co/api/v2/item/${slug}`);
    const germanName = payload.names.find((entry) => entry.language?.name === 'de')?.name || dex.items.get(id)?.name || id;
    const desc = latestGermanText(payload.flavor_text_entries, 'text');
    items[id] = {name: germanName, desc};
  });

  const typeNames = new Set([
    ...speciesPool.flatMap((species) => species.types),
    ...moveTasks.map(({id}) => dex.moves.get(id)?.type).filter((type) => type && type !== '???'),
  ]);
  const typeTasks = [...typeNames].map((type) => ({key: type, slug: type.toLowerCase()}));
  await runPool(typeTasks, 6, async ({key, slug}) => {
    const payload = await fetchJson(`https://pokeapi.co/api/v2/type/${slug}`);
    const germanName = payload.names.find((entry) => entry.language?.name === 'de')?.name || key;
    types[key] = germanName;
  });

  const output = `export default ${JSON.stringify({pokemon, moves, items, types}, null, 2)};\n`;
  await writeFile(OUTPUT_PATH, output, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

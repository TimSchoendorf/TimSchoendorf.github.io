import speciesPool from '../games/pokemon-draft-data.json' with {type: 'json'};

export const POKEMON_POOL = speciesPool;

const ITEM_POOL = ['leftovers', 'sitrusberry', 'lifeorb', 'choicescarf', 'choiceband', 'choicespecs', 'focussash', 'expertbelt', 'muscleband', 'wiseglasses'];
const STRONG_STATUS = new Set([
  'agility', 'amnesia', 'bellydrum', 'bulkup', 'calmmind', 'curse', 'dragondance', 'encore',
  'leechseed', 'nastyplot', 'protect', 'recover', 'rest', 'roost', 'sleeppowder', 'spikes',
  'stealthrock', 'substitute', 'swordsdance', 'thunderwave', 'toxic', 'willowisp', 'wish',
]);

export function rand(max) {
  return Math.floor(Math.random() * max);
}

export function sample(list) {
  return list[rand(list.length)];
}

export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rand(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function totalStats(stats) {
  return stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
}

export function drawPack(excludedIds = new Set(), count = 3) {
  const available = shuffle(POKEMON_POOL.filter((species) => !excludedIds.has(species.id)));
  return available.slice(0, count);
}

export function pickOpponentDraft(pack, existingTeam = []) {
  const teamTypes = new Set(existingTeam.flatMap((member) => member.types));
  return pack
    .map((species) => {
      const freshTypes = species.types.filter((type) => !teamTypes.has(type)).length;
      const score = totalStats(species.baseStats) + freshTypes * 18 + (species.nfe ? -12 : 12);
      return {species, score};
    })
    .sort((a, b) => b.score - a.score)[0].species;
}

function moveScore(move, species) {
  let score = 0;
  const stab = species.types.includes(move.type) ? 28 : 0;
  if (move.category === 'Status') {
    score += STRONG_STATUS.has(move.id) ? 80 : 32;
    score += move.volatileStatus || move.status ? 18 : 0;
    score += move.boosts ? 16 : 0;
    score += move.heal ? 20 : 0;
    return score;
  }

  score += (move.basePower || 0) * (move.accuracy === true ? 1 : Number(move.accuracy || 100) / 100);
  score += stab;
  score += move.priority > 0 ? 18 : 0;
  score += move.secondary ? 10 : 0;
  score += move.multihit ? 8 : 0;
  return score;
}

function chooseMoves(species, dex) {
  const moves = species.moveIds
    .map((id) => dex.moves.get(id))
    .filter((move) => move?.exists && !move.isNonstandard);

  const damaging = moves.filter((move) => move.category !== 'Status');
  const status = moves.filter((move) => move.category === 'Status');
  const stabDamage = damaging.filter((move) => species.types.includes(move.type));
  const physical = damaging.filter((move) => move.category === 'Physical');
  const special = damaging.filter((move) => move.category === 'Special');

  const prefersPhysical = species.baseStats.atk >= species.baseStats.spa;
  const preferredOffense = prefersPhysical ? physical : special;
  const chosen = [];

  function addMove(pool, condition = () => true) {
    const candidate = pool
      .filter((move) => !chosen.find((selected) => selected.id === move.id))
      .filter(condition)
      .sort((a, b) => moveScore(b, species) - moveScore(a, species))[0];
    if (candidate) chosen.push(candidate);
  }

  addMove(stabDamage.length ? stabDamage : damaging);
  addMove(preferredOffense.length ? preferredOffense : damaging, (move) => !chosen.some((selected) => selected.type === move.type));
  addMove(status, () => chosen.filter((move) => move.category === 'Status').length < 1);
  addMove(damaging, (move) => !chosen.some((selected) => selected.type === move.type));
  addMove(status);
  addMove(moves);

  return chosen.slice(0, 4);
}

function chooseAbility(species, chosenMoves) {
  if (species.abilities.length === 1) return species.abilities[0];
  const setupMove = chosenMoves.find((move) => ['swordsdance', 'dragondance', 'calmmind', 'nastyplot', 'bulkup'].includes(move.id));
  if (setupMove) return species.abilities[0];
  return species.abilities[0];
}

function chooseItem(species, chosenMoves) {
  const statusCount = chosenMoves.filter((move) => move.category === 'Status').length;
  const physicalCount = chosenMoves.filter((move) => move.category === 'Physical').length;
  const specialCount = chosenMoves.filter((move) => move.category === 'Special').length;
  const fast = species.baseStats.spe >= 95;
  const bulky = species.baseStats.hp + species.baseStats.def + species.baseStats.spd >= 240;

  if (species.nfe) return 'eviolite';
  if (statusCount >= 2 || bulky) return 'leftovers';
  if (physicalCount >= 3 && fast) return sample(['choiceband', 'choicescarf', 'lifeorb']);
  if (specialCount >= 3 && fast) return sample(['choicespecs', 'choicescarf', 'lifeorb']);
  if (fast) return sample(['lifeorb', 'expertbelt', 'focussash']);
  return sample(ITEM_POOL);
}

function chooseNature(species) {
  if (species.baseStats.atk >= species.baseStats.spa && species.baseStats.spe >= 90) return 'Jolly';
  if (species.baseStats.spa > species.baseStats.atk && species.baseStats.spe >= 90) return 'Timid';
  if (species.baseStats.atk >= species.baseStats.spa) return 'Adamant';
  return 'Modest';
}

function chooseEVs(species) {
  if (species.baseStats.atk >= species.baseStats.spa) {
    return {hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252};
  }
  return {hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252};
}

export function generateSet(species, dex) {
  const moves = chooseMoves(species, dex);
  return {
    name: species.name,
    species: species.name,
    ability: chooseAbility(species, moves),
    item: chooseItem(species, moves),
    moves: moves.map((move) => move.id),
    nature: chooseNature(species),
    level: 50,
    evs: chooseEVs(species),
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
  };
}

export function previewMoves(species, dex) {
  return chooseMoves(species, dex).map((move) => move.name);
}

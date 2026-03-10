import speciesPool from '../games/pokemon-draft-data.json' with {type: 'json'};

export const POKEMON_POOL = speciesPool;

const ITEM_POOL = ['leftovers', 'sitrusberry', 'lifeorb', 'choicescarf', 'choiceband', 'choicespecs', 'focussash', 'expertbelt', 'muscleband', 'wiseglasses'];
const STRONG_STATUS = new Set([
  'agility', 'amnesia', 'bellydrum', 'bulkup', 'calmmind', 'curse', 'dragondance', 'encore',
  'leechseed', 'nastyplot', 'protect', 'recover', 'rest', 'roost', 'sleeppowder', 'spikes',
  'stealthrock', 'substitute', 'swordsdance', 'thunderwave', 'toxic', 'willowisp', 'wish',
]);
const HAZARDS = new Set(['spikes', 'stealthrock']);
const RECOVERY = new Set(['recover', 'rest', 'roost', 'softboiled', 'synthesis', 'moonlight', 'wish']);
const SETUP = new Set(['agility', 'amnesia', 'bulkup', 'calmmind', 'dragondance', 'nastyplot', 'swordsdance']);

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
  const teamRoles = existingTeam.map(estimateRole);
  return pack
    .map((species) => {
      const freshTypes = species.types.filter((type) => !teamTypes.has(type)).length;
      const speedBias = species.baseStats.spe >= 95 ? 18 : 0;
      const bulkBias = species.baseStats.hp + species.baseStats.def + species.baseStats.spd >= 240 ? 14 : 0;
      const role = estimateRole(species);
      const rolePenalty = teamRoles.includes(role) ? -14 : 12;
      const score = totalStats(species.baseStats) + freshTypes * 18 + (species.nfe ? -12 : 12) + speedBias + bulkBias + rolePenalty;
      return {species, score};
    })
    .sort((a, b) => b.score - a.score)[0].species;
}

export function estimateRole(species) {
  const {hp, atk, def, spa, spd, spe} = species.baseStats;
  if (spe >= 110) return 'speedster';
  if (atk >= 105 && atk > spa + 10) return 'physical';
  if (spa >= 105 && spa > atk + 10) return 'special';
  if (hp + def + spd >= 255) return 'tank';
  return 'balanced';
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

function refineMovesByRole(species, moves) {
  const role = estimateRole(species);
  const status = moves.filter((move) => move.category === 'Status');
  const damaging = moves.filter((move) => move.category !== 'Status');

  if (role === 'tank') {
    const recovery = status.find((move) => RECOVERY.has(move.id));
    if (recovery && !moves.includes(recovery)) moves[3] = recovery;
  }
  if ((role === 'physical' || role === 'special') && status.find((move) => SETUP.has(move.id))) {
    return moves;
  }
  if (role === 'balanced') {
    const hazard = status.find((move) => HAZARDS.has(move.id));
    if (hazard && damaging.length >= 2) {
      return [damaging[0], damaging[1], hazard, status.find((move) => RECOVERY.has(move.id)) || moves[3]].filter(Boolean).slice(0, 4);
    }
  }
  return moves;
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
  const moves = refineMovesByRole(species, chooseMoves(species, dex));
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

export function chooseTeamOrder(team) {
  return team
    .slice()
    .sort((a, b) => {
      const aScore = a.baseStats.spe + a.baseStats.hp / 2 + (estimateRole(a) === 'tank' ? -16 : 0) + (a.types.length === 2 ? 8 : 0);
      const bScore = b.baseStats.spe + b.baseStats.hp / 2 + (estimateRole(b) === 'tank' ? -16 : 0) + (b.types.length === 2 ? 8 : 0);
      return bScore - aScore;
    });
}

export function evaluateMoveChoice(moveSlot, dex, attackerTypes, defenderTypes = []) {
  const move = dex.moves.get(moveSlot.id || moveSlot.move || '');
  if (!move?.exists || move.disabled) return -999;
  if (move.category === 'Status') {
    let score = STRONG_STATUS.has(move.id) ? 72 : 28;
    score += move.status ? 14 : 0;
    score += move.boosts ? 12 : 0;
    score += move.heal ? 18 : 0;
    return score;
  }

  const stab = attackerTypes.includes(move.type) ? 1.3 : 1;
  const typeMod = defenderTypes.length ? dex.types.getEffectiveness(move.type, defenderTypes) : 0;
  const effectiveness = typeMod >= 2 ? 2 : typeMod === 1 ? 1.5 : typeMod === 0 ? 1 : 0.65;
  const accuracy = move.accuracy === true ? 1 : Number(move.accuracy || 100) / 100;
  return (move.basePower || 0) * stab * effectiveness * accuracy + (move.priority > 0 ? 20 : 0) + (move.secondary ? 8 : 0);
}

export function chooseBattleAction(request, dex, ownTeam, opposingActive) {
  if (request.forceSwitch) {
    const candidates = request.side.pokemon
      .map((mon, index) => ({mon, index}))
      .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'));
    const ranked = candidates.sort((a, b) => {
      const aSpecies = ownTeam.find((species) => species.name === a.mon.details.split(',')[0]);
      const bSpecies = ownTeam.find((species) => species.name === b.mon.details.split(',')[0]);
      return totalStats(bSpecies?.baseStats || {hp:0,atk:0,def:0,spa:0,spd:0,spe:0})
        - totalStats(aSpecies?.baseStats || {hp:0,atk:0,def:0,spa:0,spd:0,spe:0});
    });
    return `switch ${ranked[0].index + 1}`;
  }

  const active = request.active?.[0];
  if (!active) return 'move 1';
  const self = ownTeam.find((species) => species.name === request.side.pokemon.find((mon) => mon.active)?.details.split(',')[0]);
  const attackerTypes = self?.types || [];
  const defenderTypes = opposingActive?.types || [];
  const rankedMoves = active.moves
    .map((move, index) => ({
      index,
      score: evaluateMoveChoice(move, dex, attackerTypes, defenderTypes),
    }))
    .sort((a, b) => b.score - a.score);

  const bestMove = rankedMoves[0];
  const bench = request.side.pokemon
    .map((mon, index) => ({mon, index}))
    .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'));

  if (bench.length && opposingActive && bestMove.score < 70) {
    const bestSwitch = bench
      .map(({mon, index}) => {
        const species = ownTeam.find((candidate) => candidate.name === mon.details.split(',')[0]);
        const pivotScore = species ? species.types.reduce((sum, type) => {
          const mod = dex.types.getEffectiveness(type, defenderTypes);
          return sum + (mod < 0 ? 16 : mod === 0 ? 8 : 0);
        }, totalStats(species.baseStats) / 20) : 0;
        return {index, score: pivotScore};
      })
      .sort((a, b) => b.score - a.score)[0];
    if (bestSwitch && bestSwitch.score > 20) return `switch ${bestSwitch.index + 1}`;
  }

  return `move ${bestMove.index + 1}`;
}

export function draftSynergy(team) {
  const types = new Set(team.flatMap((species) => species.types));
  const roles = new Set(team.map(estimateRole));
  return {
    typeCoverage: types.size,
    roleCoverage: roles.size,
    score: types.size * 8 + roles.size * 12,
  };
}

import speciesPool from '../games/pokemon-draft-data.json' with {type: 'json'};
import {HIGH_PRIORITY_STATUS, RBY_EXPLOSION, RBY_RECOVERY, RBY_SET_OVERRIDES, RBY_SETUP} from './pokemon-rby-presets.js';

export const POKEMON_POOL = speciesPool;

const STRONG_NORMAL = new Set(['bodyslam', 'doubleedge', 'hyperbeam', 'slam']);
const COVERAGE_MOVES = new Set(['blizzard', 'earthquake', 'icebeam', 'rockslide', 'surf', 'thunderbolt']);
const LOW_VALUE_STATUS = new Set(['bide', 'disable', 'focusenergy', 'growl', 'harden', 'leer', 'tailwhip', 'supersonic', 'whirlwind']);
const CHARGE_MOVES = new Set(['dig', 'fly', 'razorwind', 'skullbash', 'solarbeam', 'skyattack']);
const TRAPPING_MOVES = new Set(['bind', 'clamp', 'firespin', 'wrap']);

export function rand(max) {
  return Math.floor(Math.random() * max);
}

export function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = rand(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function sample(list) {
  return list[rand(list.length)];
}

export function totalStats(stats) {
  return stats.hp + stats.atk + stats.def + stats.spc + stats.spe;
}

export function totalBattleStats(stats) {
  return stats.hp + stats.atk + stats.def + stats.spc + stats.spe;
}

export function estimateRole(species) {
  const {atk, def, hp, spc, spe} = species.baseStats;
  if (spe >= 105) return 'speed';
  if (spc >= atk + 18 && spc >= 80) return 'special';
  if (atk >= spc + 18 && atk >= 85) return 'physical';
  if (hp + def + spc >= 255) return 'tank';
  return 'balanced';
}

function preferredCategory(species) {
  return species.baseStats.atk > species.baseStats.spc + 8
    ? 'Physical'
    : species.baseStats.spc > species.baseStats.atk + 8
      ? 'Special'
      : 'Mixed';
}

function typeMultiplier(attackingType, defendingTypes = [], dex) {
  return defendingTypes.reduce((multiplier, defendingType) => {
    const effect = dex.types.get(defendingType)?.damageTaken?.[attackingType];
    if (effect === 1) return multiplier * 2;
    if (effect === 2) return multiplier * 0.5;
    if (effect === 3) return multiplier * 0;
    return multiplier;
  }, 1);
}

export function draftSynergy(team) {
  const types = new Set(team.flatMap((species) => species.types));
  const roles = new Set(team.map(estimateRole));
  const sleepers = team.filter((species) => species.set?.moves?.some((moveId) => HIGH_PRIORITY_STATUS.has(moveId))).length;
  return {
    typeCoverage: types.size,
    roleCoverage: roles.size,
    control: sleepers,
    score: (types.size * 8) + (roles.size * 12) + (sleepers * 10),
  };
}

export function drawPack(excludedIds = new Set(), count = 3) {
  const available = shuffle(POKEMON_POOL.filter((species) => !excludedIds.has(species.id)));
  return available.slice(0, count);
}

export function matchupScore(species, opposingTeam = [], dex) {
  if (!opposingTeam.length) return 0;
  return opposingTeam.reduce((sum, foe) => {
    const offense = species.types.reduce((score, type) => score + typeMultiplier(type, foe.types, dex), 0);
    const defense = foe.types.reduce((score, type) => score + typeMultiplier(type, species.types, dex), 0);
    return sum + (offense * 10) - (defense * 5);
  }, 0);
}

export function pickOpponentDraft(pack, existingTeam = [], opposingTeam = [], dex) {
  const seenTypes = new Set(existingTeam.flatMap((species) => species.types));
  return pack.map((species) => {
    const freshTypes = species.types.filter((type) => !seenTypes.has(type)).length;
    const score = totalStats(species.baseStats)
      + totalBattleStats(species.battleStats) / 18
      + (freshTypes * 16)
      + matchupScore(species, opposingTeam, dex)
      + (species.nfe ? -10 : 12);
    return {species, score};
  }).sort((a, b) => b.score - a.score)[0].species;
}

function legalMoves(species, dex) {
  return species.moveIds.map((id) => dex.moves.get(id)).filter((move) => move?.exists && move.gen === 1);
}

function moveAccuracy(move) {
  return move.accuracy === true ? 1 : Number(move.accuracy || 100) / 100;
}

function statusMoveScore(move, species) {
  let score = 18;
  if (HIGH_PRIORITY_STATUS.has(move.id)) score += 80;
  if (RBY_RECOVERY.has(move.id)) score += estimateRole(species) === 'tank' ? 54 : 30;
  if (RBY_SETUP.has(move.id)) score += 48;
  if (TRAPPING_MOVES.has(move.id)) score += 42;
  if (RBY_EXPLOSION.has(move.id)) score += 38;
  if (LOW_VALUE_STATUS.has(move.id)) score -= 18;
  return score;
}

function damagingMoveScore(move, species, dex, chosenTypes) {
  const preference = preferredCategory(species);
  const attackStat = move.category === 'Physical' ? species.battleStats.atk : species.battleStats.spc;
  let score = (move.basePower || 0) * moveAccuracy(move);
  score += attackStat / 14;
  if (species.types.includes(move.type)) score += 34;
  if (COVERAGE_MOVES.has(move.id)) score += 18;
  if (STRONG_NORMAL.has(move.id)) score += 16;
  if (TRAPPING_MOVES.has(move.id)) score += 22;
  if (RBY_EXPLOSION.has(move.id)) score += 30;
  if (CHARGE_MOVES.has(move.id)) score -= 26;
  if (preference !== 'Mixed' && move.category === preference) score += 12;
  if (preference !== 'Mixed' && move.category !== preference) score -= 8;
  if (chosenTypes.has(move.type)) score -= 8;
  if ((move.basePower || 0) >= 100 && moveAccuracy(move) < 0.8) score -= 8;
  if (move.id === 'hyperbeam' && species.baseStats.atk >= 80) score += 18;
  if (move.id === 'blizzard') score += 22;
  if (move.id === 'earthquake') score += 24;
  if (move.id === 'thunderbolt' || move.id === 'psychic' || move.id === 'surf') score += 18;
  if (move.id === 'fireblast' && species.types.includes('Fire')) score += 14;
  return score;
}

function applyOverride(species, dex) {
  const override = RBY_SET_OVERRIDES[species.id];
  if (!override) return null;
  const legal = override.filter((moveId) => species.moveIds.includes(moveId) && dex.moves.get(moveId)?.exists);
  return legal.length === 4 ? legal : null;
}

function heuristicMoves(species, dex) {
  const moves = legalMoves(species, dex);
  const chosen = [];
  const chosenTypes = new Set();
  const statusMoves = moves.filter((move) => move.category === 'Status');
  const damageMoves = moves.filter((move) => move.category !== 'Status');

  const add = (move) => {
    if (!move || chosen.some((entry) => entry.id === move.id)) return;
    chosen.push(move);
    if (move.category !== 'Status') chosenTypes.add(move.type);
  };

  add(statusMoves.sort((a, b) => statusMoveScore(b, species) - statusMoveScore(a, species))[0]);
  add(damageMoves.sort((a, b) => damagingMoveScore(b, species, dex, chosenTypes) - damagingMoveScore(a, species, dex, chosenTypes))[0]);
  add(damageMoves
    .filter((move) => !chosenTypes.has(move.type) || STRONG_NORMAL.has(move.id))
    .sort((a, b) => damagingMoveScore(b, species, dex, chosenTypes) - damagingMoveScore(a, species, dex, chosenTypes))[0]);
  add(statusMoves
    .filter((move) => RBY_RECOVERY.has(move.id) || RBY_SETUP.has(move.id) || TRAPPING_MOVES.has(move.id))
    .sort((a, b) => statusMoveScore(b, species) - statusMoveScore(a, species))[0]);

  const fallbackMoves = moves
    .slice()
    .sort((a, b) => {
      const aScore = a.category === 'Status' ? statusMoveScore(a, species) : damagingMoveScore(a, species, dex, chosenTypes);
      const bScore = b.category === 'Status' ? statusMoveScore(b, species) : damagingMoveScore(b, species, dex, chosenTypes);
      return bScore - aScore;
    });

  for (const move of fallbackMoves) {
    if (chosen.length >= 4) break;
    add(move);
  }

  return chosen.slice(0, 4).map((move) => move.id);
}

export function generateSet(species, dex) {
  const moves = applyOverride(species, dex) || heuristicMoves(species, dex);
  return {
    name: species.name,
    species: species.name,
    moves,
    level: 100,
  };
}

export function previewMoves(species, dex) {
  return generateSet(species, dex).moves.map((moveId) => dex.moves.get(moveId).name);
}

export function setArchetype(species, set) {
  if (set.moves.some((moveId) => HIGH_PRIORITY_STATUS.has(moveId))) return 'control';
  if (set.moves.some((moveId) => RBY_RECOVERY.has(moveId))) return 'endure';
  if (set.moves.some((moveId) => RBY_SETUP.has(moveId))) return 'setup';
  if (set.moves.some((moveId) => RBY_EXPLOSION.has(moveId))) return 'trade';
  return estimateRole(species);
}

export function chooseTeamOrder(team) {
  return team.slice().sort((a, b) => {
    const aControl = a.set.moves.some((moveId) => HIGH_PRIORITY_STATUS.has(moveId)) ? 30 : 0;
    const bControl = b.set.moves.some((moveId) => HIGH_PRIORITY_STATUS.has(moveId)) ? 30 : 0;
    const aLead = a.battleStats.spe + (aControl) + (a.battleStats.hp / 4);
    const bLead = b.battleStats.spe + (bControl) + (b.battleStats.hp / 4);
    return bLead - aLead;
  });
}

function estimateMoveDamage(move, attacker, defender, dex) {
  if (!move?.exists || move.category === 'Status') return 0;
  const attackStat = move.category === 'Physical' ? attacker.battleStats.atk : attacker.battleStats.spc;
  const defenseStat = move.category === 'Physical' ? defender.battleStats.def : defender.battleStats.spc;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeMultiplier(move.type, defender.types, dex);
  return (((move.basePower || 0) * attackStat) / Math.max(1, defenseStat)) * stab * effectiveness * moveAccuracy(move);
}

function moveHasNoEffect(move, defender, dex) {
  if (!move?.exists) return true;
  if (move.category !== 'Status') return typeMultiplier(move.type, defender.types, dex) <= 0;
  if (move.id === 'thunderwave') return typeMultiplier(move.type, defender.types, dex) <= 0;
  if ((move.status === 'psn' || move.status === 'tox') && defender.types.includes('Poison')) return true;
  return false;
}

function statusWouldBeRedundant(move, defender) {
  if (!move?.exists) return false;
  if (move.status && defender.status) return true;
  return false;
}

function evaluateMoveChoice(moveSlot, dex, attacker, defender) {
  const move = dex.moves.get(moveSlot.id || moveSlot.move || '');
  if (!move?.exists || move.disabled) return -999;
  if (move.category === 'Status') {
    if (moveHasNoEffect(move, defender, dex)) return -180;
    if (statusWouldBeRedundant(move, defender)) return -150;
    let score = statusMoveScore(move, attacker);
    if (HIGH_PRIORITY_STATUS.has(move.id) && !defender.status) score += 30;
    if (RBY_RECOVERY.has(move.id)) score += attacker.currentPercent <= 45 ? 36 : -12;
    return score;
  }
  if (moveHasNoEffect(move, defender, dex)) return -120;
  let score = estimateMoveDamage(move, attacker, defender, dex);
  if (move.id === 'hyperbeam' && defender.currentPercent <= 45) score += 40;
  if (RBY_EXPLOSION.has(move.id) && defender.currentPercent <= 60) score += 34;
  if (TRAPPING_MOVES.has(move.id)) score += 18;
  return score;
}

function canActivelySwitch(request) {
  return !!request.active?.[0] && !request.active[0].trapped;
}

export function chooseBattleAction(request, dex, ownTeam, opposingActive) {
  if (request.forceSwitch) {
    const candidates = request.side.pokemon
      .map((mon, index) => ({mon, index}))
      .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'));
    return `switch ${candidates[0].index + 1}`;
  }

  const activeName = request.side.pokemon.find((mon) => mon.active)?.details.split(',')[0];
  const attacker = ownTeam.find((species) => species.name === activeName);
  if (!attacker || !request.active?.[0]) return 'move 1';

  const defender = opposingActive || ownTeam[0];
  attacker.currentPercent = conditionToPercent(request.side.pokemon.find((mon) => mon.active)?.condition);
  defender.currentPercent = defender.currentPercent || 100;

  const rankedMoves = request.active[0].moves
    .map((move, index) => ({index, score: evaluateMoveChoice(move, dex, attacker, defender)}))
    .sort((a, b) => b.score - a.score);
  const bestMove = rankedMoves[0];

  const bench = request.side.pokemon
    .map((mon, index) => ({mon, index}))
    .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'));

  if (bench.length && canActivelySwitch(request) && bestMove.score < 54) {
    const switchCandidate = bench
      .map(({mon, index}) => {
        const species = ownTeam.find((entry) => entry.name === mon.details.split(',')[0]);
        return {
          index,
          score: species ? matchupScore(species, [defender], dex) + totalBattleStats(species.battleStats) / 24 : 0,
        };
      })
      .sort((a, b) => b.score - a.score)[0];
    if (switchCandidate?.score > bestMove.score + 18) return `switch ${switchCandidate.index + 1}`;
  }

  return `move ${bestMove.index + 1}`;
}

export function conditionToPercent(condition) {
  if (!condition || condition.endsWith(' fnt')) return 0;
  const match = condition.match(/(\d+)\/(\d+)/);
  if (!match) return 100;
  return Math.round((Number(match[1]) / Number(match[2])) * 100);
}

import speciesPool from '../games/pokemon-draft-data.json' with {type: 'json'};

export const POKEMON_POOL = speciesPool;

const ITEM_POOL = ['leftovers', 'sitrusberry', 'lifeorb', 'choicescarf', 'choiceband', 'choicespecs', 'focussash', 'expertbelt'];
const HAZARDS = new Set(['spikes', 'stealthrock']);
const RECOVERY = new Set(['recover', 'rest', 'roost', 'softboiled', 'synthesis', 'moonlight', 'wish']);
const SETUP = new Set(['agility', 'amnesia', 'bellydrum', 'bulkup', 'calmmind', 'curse', 'dragondance', 'nastyplot', 'swordsdance']);
const PRIORITY = new Set(['aquajet', 'bulletpunch', 'extremespeed', 'ice shard', 'iceshard', 'machpunch', 'quickattack', 'shadowsneak', 'suckerpunch', 'vacuumwave']);
const PIVOT = new Set(['uturn', 'voltswitch', 'flipturn', 'batonpass', 'teleport']);
const STATUS_SPREAD = new Set(['sleeppowder', 'spore', 'thunderwave', 'toxic', 'willowisp', 'stunspore', 'glare', 'leechseed']);
const LOW_VALUE_STATUS = new Set(['attract', 'confide', 'doubleteam', 'flash', 'growl', 'leer', 'tailwhip', 'supersonic']);
const CHARGE_MOVES = new Set(['dig', 'fly', 'razorwind', 'skullbash', 'solarbeam', 'skyattack']);
const RECOIL_MOVES = new Set(['doubleedge', 'submission', 'wildcharge', 'flareblitz', 'bravebird', 'take down', 'takedown', 'headsmash', 'selfdestruct', 'explosion']);
const AVOID_MOVES = new Set(['blastburn', 'dreameater', 'focuspunch', 'frenzyplant', 'gigaimpact', 'hydrocannon', 'hyperbeam', 'lastresort', 'metronome', 'skyattack', 'snore']);
const ABILITY_SCORE = {
  intimidate: 40,
  levitate: 40,
  naturalcure: 38,
  magicguard: 38,
  regenerator: 38,
  sturdy: 34,
  thickfat: 34,
  guts: 32,
  technician: 32,
  swiftswim: 28,
  chlorophyll: 28,
  overgrow: 24,
  blaze: 24,
  torrent: 24,
  static: 22,
  flamebody: 22,
  poisonpoint: 20,
  pressure: 18,
  synchronize: 18,
};

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

function preferredCategory(species) {
  if (species.baseStats.atk >= species.baseStats.spa + 5) return 'Physical';
  if (species.baseStats.spa >= species.baseStats.atk + 5) return 'Special';
  return species.baseStats.atk >= species.baseStats.spa ? 'Physical' : 'Special';
}

function typeMultiplier(attackingType, defendingTypes = [], dex) {
  if (!attackingType || !defendingTypes.length || !dex) return 1;
  return defendingTypes.reduce((multiplier, defendingType) => {
    const typeData = dex.types.get(defendingType);
    const effect = typeData?.damageTaken?.[attackingType];
    if (effect === 1) return multiplier * 2;
    if (effect === 2) return multiplier * 0.5;
    if (effect === 3) return multiplier * 0;
    return multiplier;
  }, 1);
}

export function drawPack(excludedIds = new Set(), count = 3) {
  const available = shuffle(POKEMON_POOL.filter((species) => !excludedIds.has(species.id)));
  return available.slice(0, count);
}

export function matchupScore(species, opposingTeam = [], dex) {
  if (!opposingTeam.length || !dex) return 0;
  return opposingTeam.reduce((sum, foe) => {
    const offensive = species.types.reduce((score, type) => score + typeMultiplier(type, foe.types, dex), 0);
    const defensive = foe.types.reduce((score, type) => score + typeMultiplier(type, species.types, dex), 0);
    return sum + offensive * 8 - defensive * 4;
  }, 0);
}

export function estimateRole(species) {
  const {hp, atk, def, spa, spd, spe} = species.baseStats;
  if (spe >= 108) return 'speedster';
  if (atk >= spa + 18 && atk >= 95) return 'physical';
  if (spa >= atk + 18 && spa >= 95) return 'special';
  if (hp + def + spd >= 255) return 'tank';
  return 'balanced';
}

export function pickOpponentDraft(pack, existingTeam = [], opposingTeam = [], dex = null) {
  const teamTypes = new Set(existingTeam.flatMap((member) => member.types));
  const teamRoles = existingTeam.map(estimateRole);
  return pack
    .map((species) => {
      const freshTypes = species.types.filter((type) => !teamTypes.has(type)).length;
      const role = estimateRole(species);
      const roleBias = teamRoles.includes(role) ? -12 : 14;
      const speedBias = species.baseStats.spe >= 100 ? 22 : 0;
      const bulkBias = species.baseStats.hp + species.baseStats.def + species.baseStats.spd >= 245 ? 12 : 0;
      const matchupBias = matchupScore(species, opposingTeam, dex);
      const score = totalStats(species.baseStats) + freshTypes * 18 + roleBias + speedBias + bulkBias + matchupBias + (species.nfe ? -8 : 10);
      return {species, score};
    })
    .sort((a, b) => b.score - a.score)[0].species;
}

function moveAccuracy(move) {
  return move.accuracy === true ? 1 : Number(move.accuracy || 100) / 100;
}

function damagingMoveScore(move, species, role, preference) {
  let score = (move.basePower || 0) * moveAccuracy(move);
  if (species.types.includes(move.type)) score += 34;
  if (preference !== 'Mixed' && move.category === preference) score += 22;
  if (preference !== 'Mixed' && move.category !== preference) score -= 12;
  if (role === 'speedster' && (PRIORITY.has(move.id) || move.priority > 0)) score += 18;
  if (PIVOT.has(move.id)) score += 14;
  if (move.secondary) score += 8;
  if (move.multihit) score += 6;
  if (move.drain) score += 8;
  if (move.selfSwitch) score += 10;
  if (move.priority > 0) score += 12;
  if (Number(move.accuracy || 100) < 80) score -= 10;
  if (CHARGE_MOVES.has(move.id)) score -= 14;
  if (RECOIL_MOVES.has(move.id)) score -= 8;
  if (AVOID_MOVES.has(move.id)) score -= 120;
  return score;
}

function statusMoveScore(move, role, preference) {
  let score = 20;
  if (RECOVERY.has(move.id)) score += role === 'tank' ? 70 : 28;
  if (SETUP.has(move.id)) {
    score += 54;
    if ((preference === 'Physical' && ['swordsdance', 'dragondance', 'bulkup', 'curse'].includes(move.id))
      || (preference === 'Special' && ['calmmind', 'nastyplot', 'amnesia'].includes(move.id))) {
      score += 18;
    }
  }
  if (HAZARDS.has(move.id)) score += role === 'tank' || role === 'balanced' ? 44 : 24;
  if (STATUS_SPREAD.has(move.id)) score += 34;
  if (move.boosts) score += 16;
  if (move.status) score += 14;
  if (move.heal) score += 16;
  if (move.selfSwitch) score += 12;
  if (LOW_VALUE_STATUS.has(move.id)) score -= 26;
  return score;
}

function legalMoves(species, dex) {
  return species.moveIds
    .map((id) => dex.moves.get(id))
    .filter((move) => move?.exists && !move.isNonstandard && !AVOID_MOVES.has(move.id));
}

function pickBestMove(moves, selected, scoreFn, extraFilter = () => true) {
  return moves
    .filter((move) => !selected.some((chosen) => chosen.id === move.id))
    .filter(extraFilter)
    .sort((a, b) => scoreFn(b) - scoreFn(a))[0];
}

function addMove(selected, candidate) {
  if (candidate && !selected.some((move) => move.id === candidate.id)) selected.push(candidate);
}

function chooseMoves(species, dex) {
  const moves = legalMoves(species, dex);
  const role = estimateRole(species);
  const preference = preferredCategory(species);
  const damaging = moves.filter((move) => move.category !== 'Status');
  const status = moves.filter((move) => move.category === 'Status');
  const preferredDamage = preference === 'Mixed'
    ? damaging
    : damaging.filter((move) => move.category === preference);
  const stabPreferred = preferredDamage.filter((move) => species.types.includes(move.type));
  const selected = [];
  const scoreDamage = (move) => damagingMoveScore(move, species, role, preference);
  const scoreStatus = (move) => statusMoveScore(move, role, preference);

  addMove(selected, pickBestMove(stabPreferred.length ? stabPreferred : preferredDamage.length ? preferredDamage : damaging, selected, scoreDamage));

  if (role === 'tank') {
    addMove(selected, pickBestMove(status, selected, scoreStatus, (move) => RECOVERY.has(move.id) || HAZARDS.has(move.id) || STATUS_SPREAD.has(move.id)));
    addMove(selected, pickBestMove(preferredDamage.length ? preferredDamage : damaging, selected, scoreDamage, (move) => !selected.some((choice) => choice.type === move.type)));
    addMove(selected, pickBestMove(status, selected, scoreStatus));
  } else if (role === 'physical' || role === 'special') {
    addMove(selected, pickBestMove(status, selected, scoreStatus, (move) => SETUP.has(move.id)));
    addMove(selected, pickBestMove(preferredDamage.length ? preferredDamage : damaging, selected, scoreDamage, (move) => !selected.some((choice) => choice.type === move.type)));
    addMove(selected, pickBestMove(status, selected, scoreStatus, (move) => STATUS_SPREAD.has(move.id) || PIVOT.has(move.id)));
  } else if (role === 'speedster') {
    addMove(selected, pickBestMove(preferredDamage.length ? preferredDamage : damaging, selected, scoreDamage, (move) => PRIORITY.has(move.id) || move.priority > 0 || move.basePower >= 70));
    addMove(selected, pickBestMove(status, selected, scoreStatus, (move) => SETUP.has(move.id) || STATUS_SPREAD.has(move.id)));
    addMove(selected, pickBestMove(damaging, selected, scoreDamage, (move) => !selected.some((choice) => choice.type === move.type)));
  } else {
    addMove(selected, pickBestMove(status, selected, scoreStatus, (move) => HAZARDS.has(move.id) || STATUS_SPREAD.has(move.id) || RECOVERY.has(move.id)));
    addMove(selected, pickBestMove(preferredDamage.length ? preferredDamage : damaging, selected, scoreDamage, (move) => !selected.some((choice) => choice.type === move.type)));
    addMove(selected, pickBestMove(status, selected, scoreStatus, (move) => SETUP.has(move.id) || RECOVERY.has(move.id)));
  }

  while (selected.filter((move) => move.category !== 'Status').length < 2) {
    addMove(selected, pickBestMove(preferredDamage.length ? preferredDamage : damaging, selected, scoreDamage));
    if (selected.length >= 4) break;
  }
  while (selected.length < 4) {
    addMove(selected, pickBestMove(damaging, selected, scoreDamage, (move) => !selected.some((choice) => choice.type === move.type)));
    if (selected.length >= 4) break;
    addMove(selected, pickBestMove(status, selected, scoreStatus));
    if (selected.length >= 4) break;
    addMove(selected, pickBestMove(moves, selected, (move) => move.category === 'Status' ? scoreStatus(move) : scoreDamage(move)));
    if (selected.length >= 4) break;
  }

  return selected.slice(0, 4);
}

export function setArchetype(species, moves) {
  const role = estimateRole(species);
  if (moves.some((move) => HAZARDS.has(move.id))) return 'hazard';
  if (moves.some((move) => RECOVERY.has(move.id)) && role === 'tank') return 'wall';
  if (moves.some((move) => SETUP.has(move.id))) return 'setup';
  if (role === 'speedster') return 'revenge';
  return role;
}

function chooseAbility(species, chosenMoves) {
  return species.abilities
    .map((ability) => {
      const id = ability.toLowerCase().replace(/[^a-z0-9]/g, '');
      let score = ABILITY_SCORE[id] || 10;
      if (id === 'naturalcure' && chosenMoves.some((move) => move.id === 'rest')) score += 16;
      if ((id === 'chlorophyll' || id === 'swiftswim') && chosenMoves.some((move) => SETUP.has(move.id))) score += 8;
      return {ability, score};
    })
    .sort((a, b) => b.score - a.score)[0]?.ability || species.abilities[0];
}

function chooseItem(species, chosenMoves) {
  const role = estimateRole(species);
  const damageMoves = chosenMoves.filter((move) => move.category !== 'Status');
  const statusMoves = chosenMoves.filter((move) => move.category === 'Status');
  const preference = preferredCategory(species);

  if (species.nfe) return 'eviolite';
  if (role === 'tank' || chosenMoves.some((move) => RECOVERY.has(move.id))) return 'leftovers';
  if (chosenMoves.some((move) => SETUP.has(move.id))) return species.baseStats.spe >= 95 ? 'lifeorb' : 'leftovers';
  if (damageMoves.length >= 3 && preference === 'Physical' && species.baseStats.spe >= 100) return sample(['choiceband', 'choicescarf', 'lifeorb']);
  if (damageMoves.length >= 3 && preference === 'Special' && species.baseStats.spe >= 100) return sample(['choicespecs', 'choicescarf', 'lifeorb']);
  if (statusMoves.length >= 2) return 'leftovers';
  if (species.baseStats.spe >= 105) return sample(['lifeorb', 'expertbelt', 'focussash']);
  return sample(ITEM_POOL);
}

function chooseNature(species) {
  const role = estimateRole(species);
  const preference = preferredCategory(species);
  if (role === 'tank') return preference === 'Special' ? 'Calm' : 'Careful';
  if (preference === 'Physical' && species.baseStats.spe >= 90) return 'Jolly';
  if (preference === 'Special' && species.baseStats.spe >= 90) return 'Timid';
  if (preference === 'Physical') return 'Adamant';
  if (preference === 'Special') return 'Modest';
  return species.baseStats.spe >= 90 ? 'Naive' : 'Hardy';
}

function chooseEVs(species) {
  const role = estimateRole(species);
  const preference = preferredCategory(species);
  if (role === 'tank') {
    if (preference === 'Special') return {hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0};
    return {hp: 252, atk: 4, def: 252, spa: 0, spd: 0, spe: 0};
  }
  if (preference === 'Physical') return {hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252};
  if (preference === 'Special') return {hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252};
  return {hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252};
}

export function generateSet(species, dex) {
  const moves = chooseMoves(species, dex);
  const archetype = setArchetype(species, moves);
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
    archetype,
  };
}

export function previewMoves(species, dex) {
  return chooseMoves(species, dex).map((move) => move.name);
}

export function chooseTeamOrder(team) {
  return team
    .slice()
    .sort((a, b) => {
      const aLead = a.baseStats.spe + a.baseStats.hp / 3 + (estimateRole(a) === 'tank' ? -18 : 0) + (a.types.length === 2 ? 8 : 0);
      const bLead = b.baseStats.spe + b.baseStats.hp / 3 + (estimateRole(b) === 'tank' ? -18 : 0) + (b.types.length === 2 ? 8 : 0);
      return bLead - aLead;
    });
}

export function evaluateMoveChoice(moveSlot, dex, attackerTypes, defenderTypes = []) {
  const move = dex.moves.get(moveSlot.id || moveSlot.move || '');
  if (!move?.exists || move.disabled) return -999;
  if (move.category === 'Status') {
    let score = statusMoveScore(move, 'balanced', 'Mixed');
    if (move.status) score += 10;
    if (move.heal) score += 14;
    return score;
  }

  const stab = attackerTypes.includes(move.type) ? 1.3 : 1;
  const effectiveness = defenderTypes.length ? typeMultiplier(move.type, defenderTypes, dex) : 1;
  const accuracy = moveAccuracy(move);
  let score = (move.basePower || 0) * stab * effectiveness * accuracy;
  if (move.priority > 0) score += 16;
  if (move.secondary) score += 8;
  if (PIVOT.has(move.id)) score += 10;
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
    const ranked = candidates.sort((a, b) => {
      const aSpecies = ownTeam.find((species) => species.name === a.mon.details.split(',')[0]);
      const bSpecies = ownTeam.find((species) => species.name === b.mon.details.split(',')[0]);
      const aScore = aSpecies ? matchupScore(aSpecies, opposingActive ? [opposingActive] : [], dex) + totalStats(aSpecies.baseStats) / 20 : 0;
      const bScore = bSpecies ? matchupScore(bSpecies, opposingActive ? [opposingActive] : [], dex) + totalStats(bSpecies.baseStats) / 20 : 0;
      return bScore - aScore;
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

  if (bench.length && opposingActive && canActivelySwitch(request) && bestMove.score < 88) {
    const bestSwitch = bench
      .map(({mon, index}) => {
        const species = ownTeam.find((candidate) => candidate.name === mon.details.split(',')[0]);
        const pivotScore = species ? matchupScore(species, [opposingActive], dex) + totalStats(species.baseStats) / 22 : 0;
        return {index, score: pivotScore};
      })
      .sort((a, b) => b.score - a.score)[0];
    if (bestSwitch && bestSwitch.score > bestMove.score / 2 + 14) return `switch ${bestSwitch.index + 1}`;
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

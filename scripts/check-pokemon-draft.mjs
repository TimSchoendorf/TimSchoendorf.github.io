import {Dex} from '@pkmn/sim';
import {POKEMON_POOL, chooseBattleAction, generateSet, shuffle} from '../src/pokemon-draft-core.js';

const SAMPLE_SPECIES = [
  1, 3, 6, 9, 12, 15, 18, 25, 31, 34, 38, 40, 45, 51, 53,
  59, 62, 65, 68, 71, 73, 76, 78, 80, 85, 91, 94, 97, 103, 112,
  115, 121, 124, 130, 131, 134, 135, 136, 142, 149,
];

function validateGeneratedSets() {
  const sample = POKEMON_POOL.filter((species) => SAMPLE_SPECIES.includes(species.num));
  for (const species of sample) {
    const set = generateSet(species, Dex);
    if (!Array.isArray(set.moves) || set.moves.length !== 4) {
      throw new Error(`Invalid move count for ${species.name}`);
    }
    if (new Set(set.moves).size !== set.moves.length) {
      throw new Error(`Duplicate move on ${species.name}`);
    }
    for (const moveId of set.moves) {
      if (!species.moveIds.includes(moveId)) {
        throw new Error(`Illegal move ${moveId} on ${species.name}`);
      }
      const move = Dex.moves.get(moveId);
      if (!move?.exists) throw new Error(`Unknown move ${moveId} on ${species.name}`);
    }
    if (!species.abilities.includes(set.ability)) {
      throw new Error(`Illegal ability ${set.ability} on ${species.name}`);
    }
  }
}

function validateActionSelection() {
  const team = shuffle(POKEMON_POOL).slice(0, 3);
  const opposing = team[1];
  const activeSet = generateSet(team[0], Dex);
  const switchTarget = generateSet(team[2], Dex);

  const request = {
    side: {
      pokemon: [
        {details: `${team[0].name}, L50`, active: true, condition: '100/100'},
        {details: `${team[1].name}, L50`, active: false, condition: '100/100'},
        {details: `${team[2].name}, L50`, active: false, condition: '100/100'},
      ],
    },
    active: [{
      trapped: false,
      moves: activeSet.moves.map((moveId) => {
        const move = Dex.moves.get(moveId);
        return {id: move.id, move: move.name, pp: move.pp || 8, maxpp: move.pp || 8, disabled: false};
      }),
    }],
  };

  const action = chooseBattleAction(request, Dex, team, opposing);
  if (!/^move \d+$|^switch \d+$/.test(action)) {
    throw new Error(`Unexpected action format: ${action}`);
  }

  const forceSwitchRequest = {
    side: request.side,
    forceSwitch: [true],
  };
  const switchAction = chooseBattleAction(forceSwitchRequest, Dex, team, opposing);
  if (!/^switch \d+$/.test(switchAction)) {
    throw new Error(`Unexpected switch action: ${switchAction}`);
  }

  if (!switchTarget.moves.length) {
    throw new Error('Generated benchmark switch target has no moves');
  }
}

validateGeneratedSets();
validateActionSelection();
console.log('Pokemon draft checks passed.');
process.exit(0);

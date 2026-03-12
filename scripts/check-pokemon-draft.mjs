import {BattleStreams, Dex, Teams} from '@pkmn/sim';
import {POKEMON_POOL, chooseBattleAction, generateSet, shuffle} from '../src/pokemon-draft-core.js';

const dex = Dex.forGen(1);
const SAMPLE_SPECIES = [1, 3, 6, 9, 25, 31, 34, 45, 59, 65, 68, 71, 73, 76, 80, 94, 103, 121, 124, 130, 131, 135, 142, 143, 145, 149, 150, 151];

function validateGeneratedSets() {
  const sample = POKEMON_POOL.filter((species) => SAMPLE_SPECIES.includes(species.num));
  for (const species of sample) {
    const set = generateSet(species, dex);
    if (!Array.isArray(set.moves) || set.moves.length < 1 || set.moves.length > 4) {
      throw new Error(`Invalid move count for ${species.name}`);
    }
    if (new Set(set.moves).size !== set.moves.length) {
      throw new Error(`Duplicate move on ${species.name}`);
    }
    for (const moveId of set.moves) {
      if (!species.moveIds.includes(moveId)) {
        throw new Error(`Illegal move ${moveId} on ${species.name}`);
      }
      const move = dex.moves.get(moveId);
      if (!move?.exists || move.gen !== 1) {
        throw new Error(`Unexpected move ${moveId} on ${species.name}`);
      }
    }
    if (set.level !== 100) {
      throw new Error(`Unexpected level on ${species.name}`);
    }
  }
}

function validateActionSelection() {
  const team = shuffle(POKEMON_POOL).slice(0, 3);
  const activeSet = generateSet(team[0], dex);
  const request = {
    side: {
      pokemon: [
        {details: `${team[0].name}, L100`, active: true, condition: '100/100'},
        {details: `${team[1].name}, L100`, active: false, condition: '100/100'},
        {details: `${team[2].name}, L100`, active: false, condition: '100/100'},
      ],
    },
    active: [{
      trapped: false,
      moves: activeSet.moves.map((moveId) => {
        const move = dex.moves.get(moveId);
        return {id: move.id, move: move.name, pp: move.pp || 8, maxpp: move.pp || 8, disabled: false};
      }),
    }],
  };
  const action = chooseBattleAction(request, dex, team.map((species) => ({...species, set: generateSet(species, dex)})), team[1]);
  if (!/^move \d+$|^switch \d+$/.test(action)) {
    throw new Error(`Unexpected action format: ${action}`);
  }
}

async function validateBattleSimulation() {
  const selected = POKEMON_POOL.filter((species) => [143, 145, 150, 65, 121, 130].includes(species.num));
  const p1Team = selected.slice(0, 3).map((species) => generateSet(species, dex));
  const p2Team = selected.slice(3).map((species) => generateSet(species, dex));
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  let sawWin = false;

  const chooseFirst = async (stream) => {
    for await (const chunk of stream) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('|request|')) continue;
        const request = JSON.parse(line.slice(9));
        if (request.forceSwitch) {
          const target = request.side.pokemon.findIndex((mon) => !mon.active && !mon.condition.endsWith(' fnt'));
          stream.write(`switch ${target + 1}`);
          continue;
        }
        const moveIndex = request.active?.[0]?.moves.findIndex((move) => !move.disabled) ?? 0;
        stream.write(`move ${moveIndex + 1}`);
      }
    }
  };

  void chooseFirst(streams.p1);
  void chooseFirst(streams.p2);
  void (async () => {
    for await (const chunk of streams.omniscient) {
      if (chunk.includes('|win|')) sawWin = true;
    }
  })();

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen1customgame'})}
>player p1 ${JSON.stringify({name: 'Alpha', team: Teams.pack(p1Team)})}
>player p2 ${JSON.stringify({name: 'Beta', team: Teams.pack(p2Team)})}`);

  await new Promise((resolve) => setTimeout(resolve, 2500));
  if (!sawWin) {
    throw new Error('Battle simulation did not reach a winner in time');
  }
}

validateGeneratedSets();
validateActionSelection();
await validateBattleSimulation();
console.log('Pokemon draft checks passed.');

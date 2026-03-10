import {BattleStreams, Teams} from '@pkmn/sim';
import {Dex} from '@pkmn/sim';
import {POKEMON_POOL, chooseBattleAction, generateSet, shuffle} from '../src/pokemon-draft-core.js';

function buildTeam() {
  return shuffle(POKEMON_POOL).slice(0, 3).map((species) => generateSet(species, Dex));
}

async function simulate(teamA, teamB) {
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  let complete = false;
  let activeNames = {p1: null, p2: null};

  const teamSpeciesA = teamA.map((set) => POKEMON_POOL.find((species) => species.name === set.species));
  const teamSpeciesB = teamB.map((set) => POKEMON_POOL.find((species) => species.name === set.species));

  void (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|switch|')) {
          const parts = line.split('|');
          const slot = parts[2];
          const name = slot.split(': ').pop();
          if (slot.startsWith('p1')) activeNames.p1 = name;
          if (slot.startsWith('p2')) activeNames.p2 = name;
        }
        if (line.startsWith('|win|') || line.startsWith('|tie')) complete = true;
      }
    }
  })();

  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const request = JSON.parse(line.slice(9));
          if (request.teamPreview) {
            void streams.p1.write('team 1, 2, 3');
          } else {
            const opposing = teamSpeciesB.find((species) => species?.name === activeNames.p2);
            void streams.p1.write(chooseBattleAction(request, Dex, teamSpeciesA, opposing));
          }
        }
      }
    }
  })();

  void (async () => {
    for await (const chunk of streams.p2) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const request = JSON.parse(line.slice(9));
          if (request.teamPreview) {
            void streams.p2.write('team 1, 2, 3');
          } else {
            const opposing = teamSpeciesA.find((species) => species?.name === activeNames.p1);
            void streams.p2.write(chooseBattleAction(request, Dex, teamSpeciesB, opposing));
          }
        }
      }
    }
  })();

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen9customgame'})}
>player p1 ${JSON.stringify({name: 'Check A', team: Teams.pack(teamA)})}
>player p2 ${JSON.stringify({name: 'Check B', team: Teams.pack(teamB)})}`);

  const start = Date.now();
  while (!complete && Date.now() - start < 15000) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!complete) throw new Error('Simulation timeout');
}

for (let i = 0; i < 12; i += 1) {
  await simulate(buildTeam(), buildTeam());
}

console.log('Pokemon draft simulation checks passed.');

import {BattleStreams, RandomPlayerAI, Teams} from '@pkmn/sim';
import {Dex} from '@pkmn/sim';
import {POKEMON_POOL, generateSet, shuffle} from '../src/pokemon-draft-core.js';

function buildTeam() {
  return shuffle(POKEMON_POOL).slice(0, 3).map((species) => generateSet(species, Dex));
}

async function simulate(teamA, teamB) {
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  const p2 = new RandomPlayerAI(streams.p2);
  void p2.start();

  let p1LastRequest = null;
  let complete = false;

  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          p1LastRequest = JSON.parse(line.slice(9));
          if (p1LastRequest.teamPreview) {
            void streams.p1.write('team 1, 2, 3');
          } else if (p1LastRequest.forceSwitch) {
            const nextIndex = p1LastRequest.side.pokemon.findIndex((mon) => !mon.active && !mon.condition.endsWith(' fnt'));
            if (nextIndex >= 0) void streams.p1.write(`switch ${nextIndex + 1}`);
          } else if (p1LastRequest.active) {
            void streams.p1.write('move 1');
          }
        }
        if (line.startsWith('|win|') || line.startsWith('|tie')) {
          complete = true;
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

for (let i = 0; i < 5; i += 1) {
  await simulate(buildTeam(), buildTeam());
}

console.log('Pokemon draft simulation checks passed.');

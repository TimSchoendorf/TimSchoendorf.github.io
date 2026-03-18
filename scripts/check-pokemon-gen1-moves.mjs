import {BattleStreams, Dex, Teams} from '@pkmn/sim';

const GEN1_BATTLER_MOD = 'gen1battler';

function ensureGen1BattleDex() {
  if (!Dex.dexes[GEN1_BATTLER_MOD]) {
    Dex.mod(GEN1_BATTLER_MOD, {
      Scripts: {inherit: 'gen1', gen: 1},
      Conditions: {
        slp: {
          inherit: true,
          onStart(target, source, sourceEffect) {
            if (sourceEffect && sourceEffect.effectType === 'Move') {
              this.add('-status', target, 'slp', `[from] move: ${sourceEffect.name}`);
            } else {
              this.add('-status', target, 'slp');
            }
            const raw = this.random(0, 8);
            this.effectState.startTime = raw === 0 ? 1 : raw;
            this.effectState.time = this.effectState.startTime;
            if (target.removeVolatile('nightmare')) {
              this.add('-end', target, 'Nightmare', '[silent]');
            }
          },
        },
      },
    });
  }
  const format = Dex.formats.get('gen1customgame');
  if (format.mod !== GEN1_BATTLER_MOD) format.mod = GEN1_BATTLER_MOD;
  return Dex.mod(GEN1_BATTLER_MOD);
}

const dex = ensureGen1BattleDex();

function teamForMove(moveId) {
  return [{species: 'Mew', name: 'Mover', moves: [moveId], level: 100}];
}

function splashTarget() {
  return [{species: 'Mew', name: 'Target', moves: ['splash'], level: 100}];
}

async function runSingleMove(move) {
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  let transcript = '';
  let matched = false;
  let errorLine = '';
  let completed = false;
  let pendingForceWin = false;
  let p1Requests = 0;
  let p2Requests = 0;
  const moveLine = `|move|p1a: Mover|${move.name}|`;

  const loops = [
    (async () => {
      for await (const chunk of streams.p1) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('|request|')) continue;
          p1Requests += 1;
          streams.p1.write('move 1');
        }
      }
    })(),
    (async () => {
      for await (const chunk of streams.p2) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('|request|')) continue;
          p2Requests += 1;
          streams.p2.write('move 1');
        }
      }
    })(),
    (async () => {
      for await (const chunk of streams.omniscient) {
        transcript += chunk;
        for (const line of chunk.split('\n')) {
          if (line.startsWith('|error|')) errorLine = line;
          if (line.includes(moveLine)) matched = true;
        }
        if (matched && !pendingForceWin) {
          pendingForceWin = true;
          await streams.omniscient.write('>forcewin p1');
        }
      }
      completed = true;
    })(),
  ];

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen1customgame'})}
>player p1 ${JSON.stringify({name: 'P1', team: Teams.pack(teamForMove(move.id))})}
>player p2 ${JSON.stringify({name: 'P2', team: Teams.pack(splashTarget())})}`);

  const timeout = new Promise((resolve) => setTimeout(resolve, move.id === 'struggle' ? 15000 : 5000));
  await Promise.race([Promise.allSettled(loops), timeout]);

  if (!completed && !matched && !errorLine) {
    errorLine = 'timed out before the move appeared in the battle log';
  }
  return {matched, errorLine, transcript, p1Requests, p2Requests};
}

async function runStruggle() {
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  let transcript = '';
  let matched = false;
  let errorLine = '';
  let pendingForceWin = false;

  const loops = [
    (async () => {
      for await (const chunk of streams.p1) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('|request|')) continue;
          streams.p1.write('move 1');
        }
      }
    })(),
    (async () => {
      for await (const chunk of streams.p2) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('|request|')) continue;
          streams.p2.write('move 1');
        }
      }
    })(),
    (async () => {
      for await (const chunk of streams.omniscient) {
        transcript += chunk;
        for (const line of chunk.split('\n')) {
          if (line.startsWith('|error|')) errorLine = line;
          if (line.includes('|move|p1a: Mover|Struggle|')) matched = true;
        }
        if (matched && !pendingForceWin) {
          pendingForceWin = true;
          await streams.omniscient.write('>forcewin p1');
        }
      }
    })(),
  ];

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen1customgame'})}
>player p1 ${JSON.stringify({name: 'P1', team: Teams.pack([{species: 'Mew', name: 'Mover', moves: ['teleport'], level: 100}])})}
>player p2 ${JSON.stringify({name: 'P2', team: Teams.pack(splashTarget())})}`);

  await Promise.race([Promise.allSettled(loops), new Promise((resolve) => setTimeout(resolve, 20000))]);
  if (!matched && !errorLine) errorLine = 'timed out before Struggle appeared in the battle log';
  return {matched, errorLine, transcript};
}

async function main() {
  const moves = dex.moves.all()
    .filter((move) => move.exists && move.gen === 1 && !move.isNonstandard && move.id !== 'struggle')
    .sort((a, b) => a.num - b.num);

  const failures = [];
  for (const move of moves) {
    const result = await runSingleMove(move);
    if (!result.matched || result.errorLine) {
      failures.push({
        move: move.id,
        name: move.name,
        error: result.errorLine || 'move never appeared in the battle log',
      });
    }
  }

  const struggle = await runStruggle();
  if (!struggle.matched || struggle.errorLine) {
    failures.push({
      move: 'struggle',
      name: 'Struggle',
      error: struggle.errorLine || 'move never appeared in the battle log',
    });
  }

  if (failures.length) {
    console.error(`Gen 1 move smoke test failed for ${failures.length} move(s).`);
    for (const failure of failures) {
      console.error(`- ${failure.name} (${failure.move}): ${failure.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Gen 1 move smoke test passed for ${moves.length + 1} moves.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

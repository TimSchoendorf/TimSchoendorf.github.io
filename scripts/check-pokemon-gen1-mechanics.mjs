import {BattleStreams, Dex, Teams} from '@pkmn/sim';

const GEN1_BATTLER_MOD = 'gen1battler';

function getFocusEnergyCritChance(battle, dex, source, move) {
  const species = dex.species.get(source.set.species);
  let critChance = Math.floor(species.baseStats.spe / 2);
  critChance = battle.clampIntRange(critChance * 8, 1, 255);
  if (move.critRatio === 1) {
    critChance = Math.floor(critChance / 2);
  } else if (move.critRatio === 2) {
    critChance = battle.clampIntRange(critChance * 4, 1, 255);
  }
  return critChance;
}

function ensureGen1BattleDex() {
  if (!Dex.dexes[GEN1_BATTLER_MOD]) {
    const baseGen1MoveHit = Dex.mod('gen1').data.Scripts.actions.moveHit;
    const baseGen1GetDamage = Dex.mod('gen1').data.Scripts.actions.getDamage;
    Dex.mod(GEN1_BATTLER_MOD, {
      Scripts: {
        inherit: 'gen1',
        gen: 1,
        actions: {
          inherit: true,
          getDamage(source, target, move, suppressMessages) {
            if (!source?.volatiles?.focusenergy) {
              return baseGen1GetDamage.call(this, source, target, move, suppressMessages);
            }
            const activeMove =
              typeof move === 'string'
                ? this.battle.dex.getActiveMove(move)
                : typeof move === 'number'
                  ? null
                  : move;
            if (!activeMove || activeMove.willCrit) {
              return baseGen1GetDamage.call(this, source, target, move, suppressMessages);
            }
            const correctedCritChance = getFocusEnergyCritChance(this.battle, this.dex, source, activeMove);
            let intercepted = false;
            const originalRandomChance = this.battle.randomChance;
            this.battle.randomChance = (numerator, denominator) => {
              if (!intercepted && denominator === 256) {
                intercepted = true;
                return originalRandomChance.call(this.battle, correctedCritChance, denominator);
              }
              return originalRandomChance.call(this.battle, numerator, denominator);
            };
            try {
              return baseGen1GetDamage.call(this, source, target, move, suppressMessages);
            } finally {
              this.battle.randomChance = originalRandomChance;
            }
          },
          moveHit(targetOrTargets, pokemon, move, moveData, isSecondary, isSelf) {
            const damage = baseGen1MoveHit.call(this, targetOrTargets, pokemon, move, moveData, isSecondary, isSelf);
            if (!(move?.forceSwitch || moveData?.forceSwitch) || isSecondary || isSelf) return damage;
            const targets = Array.isArray(targetOrTargets) ? targetOrTargets : [targetOrTargets];
            const forceDamage = this.forceSwitch(targets.map(() => 0), targets, pokemon, move);
            return Array.isArray(targetOrTargets) ? forceDamage : forceDamage[0];
          },
        },
      },
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
      Moves: {
        roar: {
          inherit: true,
          forceSwitch: true,
          priority: -1,
          shortDesc: 'Forces the target to switch to a random ally.',
          desc: 'The target is forced to switch out and be replaced with a random unfainted ally. Fails if the target is the last unfainted Pokemon in its party, or if the user moves before the target.',
        },
        whirlwind: {
          inherit: true,
          accuracy: 100,
          forceSwitch: true,
          priority: -1,
          shortDesc: 'Forces the target to switch to a random ally.',
          desc: 'The target is forced to switch out and be replaced with a random unfainted ally. Fails if the target is the last unfainted Pokemon in its party, or if the user moves before the target.',
        },
      },
    });
  }
  const format = Dex.formats.get('gen1customgame');
  if (format.mod !== GEN1_BATTLER_MOD) format.mod = GEN1_BATTLER_MOD;
  return Dex.mod(GEN1_BATTLER_MOD);
}

ensureGen1BattleDex();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeTeam(species, moves, level = 100) {
  return [{species, name: species, moves, level}];
}

function defaultChoiceForRequest(request) {
  if (request.forceSwitch) {
    const index = request.side.pokemon.findIndex((mon) => !mon.active && !mon.condition.endsWith(' fnt'));
    return `switch ${index + 1}`;
  }
  return 'move 1';
}

async function runScenario({
  name,
  p1Team,
  p2Team,
  p1Choices = [],
  p2Choices = [],
  seed = [1, 2, 3, 4],
  doneWhen,
  timeoutMs = 10000,
}) {
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  let transcript = '';
  let forceWinSent = false;
  let finished = false;
  let resolveFinished;
  let rejectFinished;
  let p1Index = 0;
  let p2Index = 0;
  const p1Requests = [];
  const p2Requests = [];

  const finishedPromise = new Promise((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  const loops = [
    (async () => {
      for await (const chunk of streams.p1) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('|request|')) continue;
          const request = JSON.parse(line.slice(9));
          p1Requests.push(request);
          const choice = p1Choices[p1Index] ?? defaultChoiceForRequest(request);
          p1Index += 1;
          streams.p1.write(choice);
        }
      }
    })(),
    (async () => {
      for await (const chunk of streams.p2) {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('|request|')) continue;
          const request = JSON.parse(line.slice(9));
          p2Requests.push(request);
          const choice = p2Choices[p2Index] ?? defaultChoiceForRequest(request);
          p2Index += 1;
          streams.p2.write(choice);
        }
      }
    })(),
    (async () => {
      for await (const chunk of streams.omniscient) {
        transcript += chunk;
        for (const line of chunk.split('\n')) {
          if (line.startsWith('|error|')) {
            rejectFinished(new Error(`${name}: ${line}`));
            return;
          }
        }
        if (!forceWinSent && doneWhen({transcript, p1Requests, p2Requests})) {
          forceWinSent = true;
          await streams.omniscient.write('>forcewin p1');
        }
        if (transcript.includes('|win|')) {
          finished = true;
          resolveFinished({transcript, p1Requests, p2Requests});
          return;
        }
      }
    })(),
  ];

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen1customgame', seed})}
>player p1 ${JSON.stringify({name: 'P1', team: Teams.pack(p1Team)})}
>player p2 ${JSON.stringify({name: 'P2', team: Teams.pack(p2Team)})}`);

  try {
    const result = await Promise.race([
      finishedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${name}: timed out`)), timeoutMs)),
    ]);
    await Promise.allSettled(loops);
    return result;
  } finally {
    if (!finished) {
      streams.omniscient.writeEnd();
      streams.p1.writeEnd();
      streams.p2.writeEnd();
    }
  }
}

async function testCounter() {
  const result = await runScenario({
    name: 'counter',
    p1Team: makeTeam('Snorlax', ['counter']),
    p2Team: makeTeam('Electrode', ['tackle']),
    doneWhen: ({transcript}) => transcript.includes('|move|p1a: Snorlax|Counter|p2a: Electrode'),
  });
  assert(result.transcript.includes('|move|p2a: Electrode|Tackle|p1a: Snorlax'), 'Counter test: incoming Tackle did not occur');
  assert(result.transcript.includes('|move|p1a: Snorlax|Counter|p2a: Electrode'), 'Counter test: Counter was not used');
  assert(result.transcript.includes('|-damage|p2a: Electrode|'), 'Counter test: Counter did not deal damage');
}

async function testBide() {
  const result = await runScenario({
    name: 'bide',
    p1Team: makeTeam('Snorlax', ['bide']),
    p2Team: makeTeam('Electrode', ['tackle']),
    doneWhen: ({transcript}) => transcript.includes('|-end|p1a: Snorlax|Bide') && transcript.includes('|-damage|p2a: Electrode|'),
  });
  assert(result.transcript.includes('|-start|p1a: Snorlax|Bide'), 'Bide test: Bide did not start');
  assert(result.transcript.includes('|-activate|p1a: Snorlax|Bide'), 'Bide test: Bide did not store a turn');
  assert(result.transcript.includes('|-end|p1a: Snorlax|Bide'), 'Bide test: Bide never released');
  assert(result.transcript.includes('|-damage|p2a: Electrode|'), 'Bide test: release dealt no damage');
}

async function testSubstituteDamageHandling() {
  const result = await runScenario({
    name: 'substitute',
    p1Team: makeTeam('Electrode', ['substitute', 'splash']),
    p2Team: makeTeam('Mew', ['pound']),
    p1Choices: ['move 1', 'move 2'],
    doneWhen: ({transcript, p1Requests}) => transcript.includes('|-activate|p1a: Electrode|Substitute|[damage]') && p1Requests.length >= 2,
  });
  assert(result.transcript.includes('|-start|p1a: Electrode|Substitute'), 'Substitute test: Substitute did not start');
  assert(result.transcript.includes('|-activate|p1a: Electrode|Substitute|[damage]'), 'Substitute test: incoming damage did not hit the substitute');
  assert(result.p1Requests[1]?.side?.pokemon?.[0]?.condition === '195/260', 'Substitute test: user HP changed after the hit instead of staying at substitute setup HP');
}

async function testWrapTrapping() {
  const result = await runScenario({
    name: 'wrap',
    p1Team: makeTeam('Dragonite', ['wrap']),
    p2Team: makeTeam('Snorlax', ['splash']),
    doneWhen: ({transcript, p2Requests}) => transcript.includes('|cant|p2a: Snorlax|partiallytrapped') && p2Requests.some((request) => request.active?.[0]?.maybeLocked),
  });
  assert(result.transcript.includes('|cant|p2a: Snorlax|partiallytrapped'), 'Wrap test: trapped target was not prevented from acting');
  assert(result.p2Requests.some((request) => request.active?.[0]?.maybeLocked), 'Wrap test: target never entered the locked partial-trap request state');
}

async function testWhirlwindForcesSwitch() {
  const result = await runScenario({
    name: 'whirlwind',
    p1Team: [
      {species: 'Pidgeot', name: 'Pidgeot', moves: ['whirlwind', 'splash'], level: 100},
      {species: 'Mew', name: 'Mew', moves: ['splash'], level: 100},
    ],
    p2Team: [
      {species: 'Snorlax', name: 'Snorlax', moves: ['splash'], level: 100},
      {species: 'Chansey', name: 'Chansey', moves: ['splash'], level: 100},
    ],
    doneWhen: ({transcript}) =>
      transcript.includes('|move|p1a: Pidgeot|Whirlwind|p2a: Snorlax') &&
      transcript.includes('|drag|p2a: Chansey|Chansey|'),
  });
  assert(result.transcript.includes('|move|p1a: Pidgeot|Whirlwind|p2a: Snorlax'), 'Whirlwind test: move was not used');
  assert(result.transcript.includes('|drag|p2a: Chansey|Chansey|'), 'Whirlwind test: target was not dragged out');
}

async function testRoarForcesSwitch() {
  const result = await runScenario({
    name: 'roar',
    p1Team: [
      {species: 'Arcanine', name: 'Arcanine', moves: ['roar', 'splash'], level: 100},
      {species: 'Mew', name: 'Mew', moves: ['splash'], level: 100},
    ],
    p2Team: [
      {species: 'Snorlax', name: 'Snorlax', moves: ['splash'], level: 100},
      {species: 'Chansey', name: 'Chansey', moves: ['splash'], level: 100},
    ],
    doneWhen: ({transcript}) =>
      transcript.includes('|move|p1a: Arcanine|Roar|p2a: Snorlax') &&
      transcript.includes('|drag|p2a: Chansey|Chansey|'),
  });
  assert(result.transcript.includes('|move|p1a: Arcanine|Roar|p2a: Snorlax'), 'Roar test: move was not used');
  assert(result.transcript.includes('|drag|p2a: Chansey|Chansey|'), 'Roar test: target was not dragged out');
}

async function testMimicCopiesLastMove() {
  const result = await runScenario({
    name: 'mimic',
    p1Team: makeTeam('Mew', ['mimic']),
    p2Team: makeTeam('Electrode', ['thunderbolt']),
    doneWhen: ({transcript, p1Requests}) => transcript.includes('|-start|p1a: Mew|Mimic|Thunderbolt') && p1Requests.length >= 2,
  });
  const copiedMoves = result.p1Requests[1]?.active?.[0]?.moves?.map((move) => move.id) || [];
  assert(result.transcript.includes('|-start|p1a: Mew|Mimic|Thunderbolt'), 'Mimic test: Mimic did not copy Thunderbolt');
  assert(copiedMoves.includes('thunderbolt'), 'Mimic test: copied move was not present in the next request');
}

async function testMirrorMoveUsesLastIncomingMove() {
  const result = await runScenario({
    name: 'mirror-move',
    p1Team: makeTeam('Pidgeot', ['mirrormove']),
    p2Team: makeTeam('Electrode', ['thunderbolt']),
    doneWhen: ({transcript}) => transcript.includes('|move|p1a: Pidgeot|Thunderbolt|p2a: Electrode|[from] Mirror Move'),
  });
  assert(result.transcript.includes('|move|p1a: Pidgeot|Thunderbolt|p2a: Electrode|[from] Mirror Move'), 'Mirror Move test: it did not replay the incoming Thunderbolt');
}

async function testTransformCopiesMoveSet() {
  const result = await runScenario({
    name: 'transform',
    p1Team: makeTeam('Ditto', ['transform']),
    p2Team: makeTeam('Mew', ['thunderbolt', 'pound']),
    doneWhen: ({transcript, p1Requests}) => transcript.includes('|-transform|p1a: Ditto|p2a: Mew') && p1Requests.length >= 2,
  });
  const nextMoves = result.p1Requests[1]?.active?.[0]?.moves || [];
  const nextMoveIds = nextMoves.map((move) => move.id);
  assert(result.transcript.includes('|-transform|p1a: Ditto|p2a: Mew'), 'Transform test: Transform did not resolve');
  assert(nextMoveIds.includes('thunderbolt') && nextMoveIds.includes('pound'), 'Transform test: transformed moves were not copied into the next request');
  assert(nextMoves.every((move) => move.pp === 5), 'Transform test: copied moves did not get the expected 5 PP');
}

async function testHyperBeamRechargeRules() {
  const koResult = await runScenario({
    name: 'hyper-beam-ko',
    p1Team: makeTeam('Mewtwo', ['hyperbeam', 'splash']),
    p2Team: [
      {species: 'Magikarp', name: 'Magikarp', moves: ['splash'], level: 100},
      {species: 'Mew', name: 'Mew', moves: ['splash'], level: 100},
    ],
    doneWhen: ({transcript, p1Requests, p2Requests}) =>
      transcript.includes('|faint|p2a: Magikarp') &&
      p2Requests.some((request) => !!request.forceSwitch) &&
      p1Requests.length >= 2,
  });
  assert(koResult.transcript.includes('|faint|p2a: Magikarp'), 'Hyper Beam KO test: target did not faint');
  assert(!koResult.transcript.includes('|-mustrecharge|p1a: Mewtwo'), 'Hyper Beam KO test: recharge triggered after a KO');

  const surviveResult = await runScenario({
    name: 'hyper-beam-survive',
    p1Team: makeTeam('Mewtwo', ['hyperbeam']),
    p2Team: makeTeam('Mew', ['splash']),
    doneWhen: ({transcript}) => transcript.includes('|-mustrecharge|p1a: Mewtwo'),
  });
  assert(surviveResult.transcript.includes('|-mustrecharge|p1a: Mewtwo'), 'Hyper Beam survive test: recharge did not trigger when the target survived');
}

async function testSleepWakeConsumesTurn() {
  const result = await runScenario({
    name: 'sleep-wake-turn-loss',
    p1Team: makeTeam('Snorlax', ['rest', 'splash']),
    p2Team: makeTeam('Mewtwo', ['tackle']),
    p1Choices: ['move 2', 'move 1', 'move 2', 'move 2', 'move 2'],
    seed: [1, 2, 3, 4],
    doneWhen: ({transcript}) => transcript.includes('|-curestatus|p1a: Snorlax|slp|[msg]') && transcript.includes('|turn|5'),
  });
  assert(result.transcript.includes('|-status|p1a: Snorlax|slp|[from] move: Rest'), 'Sleep test: Rest did not apply sleep');
  assert(result.transcript.includes('|cant|p1a: Snorlax|slp'), 'Sleep test: sleeping turn was not skipped');
  const wakeTurnSlice = result.transcript.slice(
    result.transcript.indexOf('|-curestatus|p1a: Snorlax|slp|[msg]'),
    result.transcript.indexOf('|turn|5')
  );
  assert(!wakeTurnSlice.includes('|move|p1a: Snorlax|'), 'Sleep test: Snorlax acted on the same turn it woke up');
}

async function countCriticalHits({withFocusEnergy, sampleSize}) {
  let crits = 0;
  for (let i = 1; i <= sampleSize; i += 1) {
    const result = await runScenario({
      name: `focus-energy-sample-${withFocusEnergy ? 'focus' : 'base'}-${i}`,
      p1Team: makeTeam('Persian', ['tackle', 'focusenergy']),
      p2Team: makeTeam('Mew', ['splash']),
      p1Choices: withFocusEnergy ? ['move 2', 'move 1'] : ['move 1'],
      seed: [i, 2, 3, 4],
      doneWhen: ({transcript}) => withFocusEnergy ? transcript.includes('|turn|3') : transcript.includes('|turn|2'),
      timeoutMs: 7000,
    });
    const marker = '|move|p1a: Persian|Tackle|p2a: Mew';
    const markerIndex = result.transcript.lastIndexOf(marker);
    const relevantSlice = markerIndex >= 0 ? result.transcript.slice(markerIndex, markerIndex + 220) : result.transcript;
    if (relevantSlice.includes('|-crit|p2a: Mew')) crits += 1;
  }
  return crits;
}

async function testFocusEnergyBoostsCritRate() {
  const sampleSize = 120;
  const baseCrits = await countCriticalHits({withFocusEnergy: false, sampleSize});
  const focusCrits = await countCriticalHits({withFocusEnergy: true, sampleSize});
  assert(
    focusCrits > baseCrits * 2,
    `Focus Energy test: expected a much higher crit count after Focus Energy, got base=${baseCrits}, focus=${focusCrits}`
  );
}

async function testFlyAndDigSemiInvulnerability() {
  const flyResult = await runScenario({
    name: 'fly-semi-invulnerable',
    p1Team: makeTeam('Pidgeot', ['fly']),
    p2Team: makeTeam('Mew', ['tackle']),
    doneWhen: ({transcript}) => transcript.includes('|move|p1a: Pidgeot|Fly|p2a: Mew|[from] Fly'),
  });
  assert(flyResult.transcript.includes('|move|p1a: Pidgeot|Fly||[still]'), 'Fly test: charge turn did not occur');
  assert(flyResult.transcript.includes("|-prepare|p1a: Pidgeot|Fly"), 'Fly test: prepare marker missing');
  assert(flyResult.transcript.includes("|move|p2a: Mew|Tackle|p1a: Pidgeot|[miss]"), 'Fly test: target was not missed during invulnerability');
  assert(flyResult.transcript.includes("|-message|The foe Pidgeot can't be hit while invulnerable!"), 'Fly test: semi-invulnerable message missing');

  const digResult = await runScenario({
    name: 'dig-semi-invulnerable',
    p1Team: makeTeam('Sandslash', ['dig']),
    p2Team: makeTeam('Mew', ['tackle']),
    doneWhen: ({transcript}) => transcript.includes('|move|p1a: Sandslash|Dig|p2a: Mew|[from] Dig'),
  });
  assert(digResult.transcript.includes('|move|p1a: Sandslash|Dig||[still]'), 'Dig test: charge turn did not occur');
  assert(digResult.transcript.includes('|-prepare|p1a: Sandslash|Dig'), 'Dig test: prepare marker missing');
  assert(digResult.transcript.includes('|move|p2a: Mew|Tackle|p1a: Sandslash|[miss]'), 'Dig test: target was not missed during invulnerability');
}

async function testTwoTurnChargeMoves() {
  const solarResult = await runScenario({
    name: 'solarbeam-charge',
    p1Team: makeTeam('Venusaur', ['solarbeam']),
    p2Team: makeTeam('Mew', ['splash']),
    doneWhen: ({transcript}) => transcript.includes('|move|p1a: Venusaur|Solar Beam|p2a: Mew'),
  });
  const solarChargeIndex = solarResult.transcript.indexOf('|move|p1a: Venusaur|Solar Beam||[still]');
  const solarHitIndex = solarResult.transcript.indexOf('|move|p1a: Venusaur|Solar Beam|p2a: Mew');
  const solarDamageIndex = solarResult.transcript.indexOf('|-damage|p2a: Mew|', solarChargeIndex);
  assert(solarChargeIndex >= 0 && solarHitIndex > solarChargeIndex, 'Solar Beam test: expected a charge turn followed by a hit turn');
  assert(!(solarDamageIndex > solarChargeIndex && solarDamageIndex < solarHitIndex), 'Solar Beam test: damage happened on the charge turn');

  const razorResult = await runScenario({
    name: 'razorwind-charge',
    p1Team: makeTeam('Venusaur', ['razorwind']),
    p2Team: makeTeam('Mew', ['splash']),
    doneWhen: ({transcript}) => transcript.includes('|move|p1a: Venusaur|Razor Wind|p2a: Mew'),
  });
  const razorChargeIndex = razorResult.transcript.indexOf('|move|p1a: Venusaur|Razor Wind||[still]');
  const razorHitIndex = razorResult.transcript.indexOf('|move|p1a: Venusaur|Razor Wind|p2a: Mew');
  assert(razorChargeIndex >= 0 && razorHitIndex > razorChargeIndex, 'Razor Wind test: expected a charge turn followed by a hit turn');
}

async function main() {
  await testCounter();
  await testBide();
  await testSubstituteDamageHandling();
  await testWrapTrapping();
  await testWhirlwindForcesSwitch();
  await testRoarForcesSwitch();
  await testMimicCopiesLastMove();
  await testMirrorMoveUsesLastIncomingMove();
  await testTransformCopiesMoveSet();
  await testHyperBeamRechargeRules();
  await testSleepWakeConsumesTurn();
  await testFocusEnergyBoostsCritRate();
  await testFlyAndDigSemiInvulnerability();
  await testTwoTurnChargeMoves();
  console.log('Gen 1 mechanics regression tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

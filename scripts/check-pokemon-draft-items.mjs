import {BattleStreams, Teams} from '@pkmn/sim';

function createStreams() {
  return BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
}

async function runBattle({p1Set, p2Set, turns, waitMs = 7000}) {
  const streams = createStreams();
  let log = '';
  const p1Requests = [];

  void (async () => {
    for await (const chunk of streams.omniscient) log += `${chunk}\n`;
  })();

  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) p1Requests.push(JSON.parse(line.slice(9)));
      }
    }
  })();

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen1customgame'})}
>player p1 ${JSON.stringify({name: 'P1', team: Teams.pack([p1Set])})}
>player p2 ${JSON.stringify({name: 'P2', team: Teams.pack([p2Set])})}`);

  let delay = 180;
  for (const [p1Choice, p2Choice] of turns) {
    setTimeout(() => streams.p1.write(p1Choice), delay);
    setTimeout(() => streams.p2.write(p2Choice), delay + 40);
    delay += 650;
  }

  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return {log, p1Requests};
}

function assert(condition, message, detail = '') {
  if (!condition) throw new Error(detail ? `${message}\n${detail}` : message);
}

async function checkLeftovers() {
  const {log} = await runBattle({
    p1Set: {species: 'Snorlax', item: 'leftovers', moves: ['bodyslam']},
    p2Set: {species: 'Chansey', moves: ['seismictoss']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/\|\-heal\|p1a: Snorlax\|.*\[from\] item: Leftovers/.test(log), 'Leftovers did not heal after upkeep.', log);
}

async function checkBlackSludge() {
  const heal = await runBattle({
    p1Set: {species: 'Muk', item: 'blacksludge', moves: ['harden']},
    p2Set: {species: 'Chansey', moves: ['seismictoss']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/\|\-heal\|p1a: Muk\|.*\[from\] item: Black Sludge/.test(heal.log), 'Black Sludge did not heal a Poison-type user.', heal.log);

  const hurt = await runBattle({
    p1Set: {species: 'Snorlax', item: 'blacksludge', moves: ['harden']},
    p2Set: {species: 'Chansey', moves: ['softboiled']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/\|\-damage\|p1a: Snorlax\|.*\[from\] item: Black Sludge/.test(hurt.log), 'Black Sludge did not damage a non-Poison user.', hurt.log);
}

async function checkFocusSash() {
  const {log} = await runBattle({
    p1Set: {species: 'Abra', item: 'focussash', moves: ['teleport']},
    p2Set: {species: 'Snorlax', moves: ['bodyslam']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/Focus Sash/.test(log), 'Focus Sash never activated on a lethal hit.', log);
}

async function checkLumBerry() {
  const {log} = await runBattle({
    p1Set: {species: 'Snorlax', item: 'lumberry', moves: ['bodyslam']},
    p2Set: {species: 'Zapdos', moves: ['thunderwave']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/Lum Berry/.test(log), 'Lum Berry did not cure status.', log);
}

async function checkSitrusBerry() {
  const {log} = await runBattle({
    p1Set: {species: 'Snorlax', item: 'sitrusberry', moves: ['harden']},
    p2Set: {species: 'Chansey', moves: ['seismictoss']},
    turns: [['move 1', 'move 1'], ['move 1', 'move 1'], ['move 1', 'move 1']],
    waitMs: 7000,
  });
  assert(/Sitrus Berry/.test(log), 'Sitrus Berry did not trigger under half HP.', log);
}

async function checkLifeOrb() {
  const {log} = await runBattle({
    p1Set: {species: 'Alakazam', item: 'lifeorb', moves: ['psychic']},
    p2Set: {species: 'Chansey', moves: ['softboiled']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/\|\-damage\|p1a: Alakazam\|.*\[from\] item: Life Orb/.test(log), 'Life Orb recoil did not occur.', log);
}

async function checkAirBalloon() {
  const {log} = await runBattle({
    p1Set: {species: 'Pikachu', item: 'airballoon', moves: ['thunderbolt']},
    p2Set: {species: 'Sandslash', moves: ['earthquake']},
    turns: [['move 1', 'move 1']],
    waitMs: 3200,
  });
  assert(/\|\-item\|p1a: Pikachu\|Air Balloon/.test(log) && /\|\-immune\|p1a: Pikachu/.test(log), 'Air Balloon did not grant Ground immunity.', log);
}

await checkLeftovers();
await checkBlackSludge();
await checkFocusSash();
await checkLumBerry();
await checkSitrusBerry();
await checkLifeOrb();
await checkAirBalloon();

console.log('Pokemon draft item checks passed.');

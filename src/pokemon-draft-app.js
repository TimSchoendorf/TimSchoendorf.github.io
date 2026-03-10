import {BattleStreams, Dex, Teams} from '@pkmn/sim';
import {
  drawPack,
  generateSet,
  pickOpponentDraft,
  previewMoves,
  chooseBattleAction,
  chooseTeamOrder,
  totalStats,
} from './pokemon-draft-core.js';

const app = document.getElementById('app');

const state = {
  phase: 'draft',
  draftedIds: new Set(),
  playerDraft: [],
  opponentDraft: [],
  playerPreview: [],
  opponentPreview: [],
  round: 1,
  pack: [],
  battle: null,
  playerRequest: null,
  playerTeamState: [],
  opponentTeamState: [],
  active: {p1: null, p2: null},
  logs: [],
  message: 'Waehle dein erstes Draft-Pokemon.',
  lastMove: {p1: '', p2: ''},
};

function typeGradient(types) {
  const palette = {
    Normal: ['#d8d2be', '#f2efe2'], Fire: ['#ff9b6d', '#ffd3a8'], Water: ['#79b8ff', '#c7e3ff'],
    Electric: ['#ffd85e', '#fff1b8'], Grass: ['#77d391', '#d9f7df'], Ice: ['#90f0ff', '#d8fbff'],
    Fighting: ['#ff8577', '#ffd0c8'], Poison: ['#c887ff', '#ead2ff'], Ground: ['#d2b171', '#f7e3b3'],
    Flying: ['#9fc3ff', '#e0ecff'], Psychic: ['#ff87c8', '#ffd8ef'], Bug: ['#b7d863', '#e7f5b7'],
    Rock: ['#cbb37b', '#ecdfc1'], Ghost: ['#9d95ff', '#ddd9ff'], Dragon: ['#7ea4ff', '#d8e4ff'],
    Dark: ['#8b7f79', '#d1c8c3'], Steel: ['#b8c8d6', '#ebf1f6'], Fairy: ['#ffb6e2', '#ffe6f5'],
  };
  const first = palette[types[0]] || ['#7ad7ff', '#dff8ff'];
  const second = palette[types[1]] || first;
  return `linear-gradient(135deg, ${first[0]}, ${second[1]})`;
}

function toPercent(condition) {
  if (!condition || condition.endsWith(' fnt')) return 0;
  const [value, max] = condition.split('/').map((part) => Number(part));
  if (!max) return 100;
  return Math.max(0, Math.round((value / max) * 100));
}

function logLine(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 80);
}

function render() {
  app.innerHTML = `
    <div class="draft-shell">
      <aside class="column left">
        <a class="back-link" href="../index.html#games">Zurueck zur Startseite</a>
        <div class="title-block">
          <div class="eyebrow">Pokemon Team Draft Battler</div>
          <h1>Kanto Circuit</h1>
          <p>${state.phase === 'draft'
            ? 'Drafte aus dem 150er-Kanto-Pool ein 3er-Team. Danach kaempfst du mit echter Battle-Engine gegen ein gegnerisches Draft-Team.'
            : state.phase === 'preview'
              ? 'Ordne dein Team fuer den Opener. Lead und Backline machen im 3v3 Draft den Unterschied.'
            : 'Die Draftphase ist abgeschlossen. Jetzt entscheidet das Team, die Moves und die Engine.'}</p>
        </div>
        <div class="panel">
          <div class="panel-title">Status</div>
          <div class="metric-grid">
            <div class="metric"><span>Pool</span><strong>150</strong></div>
            <div class="metric"><span>Runde</span><strong>${state.round > 3 ? 'Battle' : `${state.round}/3`}</strong></div>
            <div class="metric"><span>Team</span><strong>${state.playerDraft.length}/3</strong></div>
            <div class="metric"><span>Format</span><strong>3v3 Singles</strong></div>
          </div>
        </div>
        <div class="panel team-panel">
          <div class="panel-title">Dein Draft</div>
          ${renderRoster(state.playerDraft, true)}
        </div>
        <div class="panel team-panel">
          <div class="panel-title">Gegnerischer Draft</div>
          ${renderRoster(state.opponentDraft, false)}
        </div>
      </aside>
      <main class="column center">
        ${state.phase === 'draft' ? renderDraftStage() : state.phase === 'preview' ? renderPreviewStage() : renderBattleStage()}
      </main>
      <aside class="column right">
        <div class="panel">
          <div class="panel-title">Engine Notes</div>
          <ul class="notes">
            <li>Sets werden aus legalen Learnsets der ersten 150 Species erzeugt.</li>
            <li>Kampf-Requests laufen ueber die Showdown-kompatible @pkmn/sim Engine.</li>
            <li>Moves, Abilities, Status und Battle-Logik werden von der Engine aufgeloest.</li>
          </ul>
        </div>
        <div class="panel">
          <div class="panel-title">Log</div>
          <div class="log-list">${state.logs.map((line) => `<div class="log-line">${line}</div>`).join('')}</div>
        </div>
      </aside>
    </div>
  `;

  if (state.phase === 'draft') {
    document.querySelectorAll('[data-draft-id]').forEach((button) => {
      button.addEventListener('click', () => draftSpecies(button.dataset.draftId));
    });
  } else if (state.phase === 'preview') {
    document.querySelectorAll('[data-move-index]').forEach((button) => {
      button.addEventListener('click', () => movePreviewMon(Number(button.dataset.moveIndex), Number(button.dataset.moveDir)));
    });
    document.getElementById('startBattleBtn')?.addEventListener('click', startBattle);
  } else {
    document.querySelectorAll('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => submitChoice(button.dataset.choice));
    });
    document.getElementById('newDraftBtn')?.addEventListener('click', resetDraft);
  }
}

function renderRoster(team, revealDetails) {
  if (!team.length) return '<div class="empty-card">Noch keine Picks.</div>';
  return team.map((species) => `
    <div class="roster-card" style="background:${typeGradient(species.types)}">
      <div class="roster-head">
        <strong>${species.name}</strong>
        <span>#${species.num}</span>
      </div>
      <div class="types">${species.types.map((type) => `<span>${type}</span>`).join('')}</div>
      ${revealDetails ? `<div class="tiny">BST ${totalStats(species.baseStats)}</div>` : '<div class="tiny">Draft-Pick bestaetigt</div>'}
    </div>
  `).join('');
}

function renderDraftStage() {
  return `
    <section class="hero-panel">
      <div>
        <div class="eyebrow">Draft Phase</div>
        <h2>Waehle eines von drei Pokemon</h2>
      </div>
      <div class="draft-message">${state.message}</div>
    </section>
    <section class="draft-grid">
      ${state.pack.map((species) => `
        <button class="draft-card" data-draft-id="${species.id}" style="background:${typeGradient(species.types)}">
          <div class="draft-num">#${species.num}</div>
          <h3>${species.name}</h3>
          <div class="types">${species.types.map((type) => `<span>${type}</span>`).join('')}</div>
          <div class="stat-strip">
            <span>HP ${species.baseStats.hp}</span>
            <span>ATK ${species.baseStats.atk}</span>
            <span>SPA ${species.baseStats.spa}</span>
            <span>SPE ${species.baseStats.spe}</span>
          </div>
          <div class="tiny">Abilities: ${species.abilities.join(', ')}</div>
          <div class="move-preview">${previewMoves(species, Dex).map((move) => `<span>${move}</span>`).join('')}</div>
        </button>
      `).join('')}
    </section>
  `;
}

function renderPreviewStage() {
  return `
    <section class="hero-panel">
      <div>
        <div class="eyebrow">Team Preview</div>
        <h2>Ordne dein Team</h2>
      </div>
      <div class="draft-message">${state.message}</div>
    </section>
    <section class="preview-grid">
      <div class="preview-panel">
        <div class="panel-title">Deine Reihenfolge</div>
        <div class="preview-list">
          ${state.playerPreview.map((species, index) => `
            <div class="preview-card" style="background:${typeGradient(species.types)}">
              <div>
                <strong>${index + 1}. ${species.name}</strong>
                <div class="tiny">${species.types.join(' / ')}</div>
              </div>
              <div class="preview-controls">
                <button class="mini-btn" data-move-index="${index}" data-move-dir="-1" ${index === 0 ? 'disabled' : ''}>hoch</button>
                <button class="mini-btn" data-move-index="${index}" data-move-dir="1" ${index === state.playerPreview.length - 1 ? 'disabled' : ''}>runter</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="preview-panel">
        <div class="panel-title">CPU Reihenfolge</div>
        <div class="preview-list">
          ${state.opponentPreview.map((species, index) => `
            <div class="preview-card" style="background:${typeGradient(species.types)}">
              <div>
                <strong>${index + 1}. ${species.name}</strong>
                <div class="tiny">${species.types.join(' / ')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    <section class="action-panel">
      <button class="secondary-btn" id="startBattleBtn">Battle starten</button>
    </section>
  `;
}

function renderBattleStage() {
  const playerActive = state.active.p1;
  const opponentActive = state.active.p2;
  const choiceButtons = renderChoiceButtons();
  return `
    <section class="hero-panel battle">
      <div>
        <div class="eyebrow">Battle Phase</div>
        <h2>Draft Clash</h2>
      </div>
      <div class="draft-message">${state.message}</div>
    </section>
    <section class="battle-field">
      <div class="combatant top">
        ${renderCombatant(opponentActive, 'Gegner')}
      </div>
      <div class="arena-center">
        <div class="arena-ring"></div>
        <div class="turn-banner">
          <div><span class="tiny">Letzter Zug CPU</span><strong>${state.lastMove.p2 || 'noch keiner'}</strong></div>
          <div><span class="tiny">Letzter Zug Du</span><strong>${state.lastMove.p1 || 'noch keiner'}</strong></div>
        </div>
        <div class="arena-log">${state.logs.slice(0, 6).map((line) => `<div>${line}</div>`).join('')}</div>
      </div>
      <div class="combatant bottom">
        ${renderCombatant(playerActive, 'Du')}
      </div>
    </section>
    <section class="bench-grid">
      <div class="bench-panel">
        <div class="panel-title">Deine Bank</div>
        ${renderBench(state.playerTeamState)}
      </div>
      <div class="bench-panel">
        <div class="panel-title">Gegnerische Bank</div>
        ${renderBench(state.opponentTeamState)}
      </div>
    </section>
    <section class="action-panel">
      <div class="panel-title">Aktionen</div>
      <div class="choice-grid">${choiceButtons}</div>
      <button class="secondary-btn" id="newDraftBtn">Neuer Draft</button>
    </section>
  `;
}

function renderBench(team) {
  const bench = team.filter((mon) => !mon.active);
  if (!bench.length) return '<div class="empty-card">Keine Reserven sichtbar.</div>';
  return `<div class="bench-list">${bench.map((mon) => `
    <div class="bench-card" style="background:${typeGradient(mon.types || ['Normal'])}">
      <strong>${mon.name}</strong>
      <div class="hp-bar slim"><div class="hp-fill" style="width:${toPercent(mon.condition)}%"></div></div>
      <div class="tiny">${mon.condition}</div>
    </div>
  `).join('')}</div>`;
}

function renderCombatant(mon, label) {
  if (!mon) {
    return `<div class="combat-card"><div class="tiny">${label}</div><strong>Wartet auf Aktivierung</strong></div>`;
  }
  return `
    <div class="combat-card" style="background:${typeGradient(mon.types || ['Normal'])}">
      <div class="tiny">${label}</div>
      <strong>${mon.name}</strong>
      <div>${mon.condition || 'unbekannt'}</div>
      <div class="hp-bar"><div class="hp-fill" style="width:${toPercent(mon.condition)}%"></div></div>
      <div class="status-row">
        <span class="tiny">${mon.item || ''}</span>
        <span class="status-pill">${mon.status || 'OK'}</span>
      </div>
    </div>
  `;
}

function renderChoiceButtons() {
  const request = state.playerRequest;
  if (!request) return '<div class="empty-card">Warte auf den naechsten Request der Engine.</div>';
  if (request.forceSwitch) {
    return request.side.pokemon
      .map((mon, index) => ({mon, index}))
      .filter(({mon}) => !mon.active && !mon.condition.endsWith(' fnt'))
      .map(({mon, index}) => `<button class="choice-btn switch" data-choice="switch ${index + 1}">${mon.details.split(',')[0]}</button>`)
      .join('');
  }
  if (request.active?.[0]) {
    return request.active[0].moves
      .map((move, index) => `<button class="choice-btn" data-choice="move ${index + 1}">${move.move}<span>${move.pp}/${move.maxpp} PP</span></button>`)
      .join('');
  }
  return '<div class="empty-card">Kein Zug verfuegbar.</div>';
}

function nextPack() {
  state.pack = drawPack(state.draftedIds, 3);
  render();
}

function draftSpecies(id) {
  const picked = state.pack.find((species) => species.id === id);
  if (!picked) return;
  state.playerDraft.push(picked);
  state.draftedIds.add(picked.id);

  const opponentPick = pickOpponentDraft(state.pack.filter((species) => species.id !== id), state.opponentDraft);
  state.opponentDraft.push(opponentPick);
  state.draftedIds.add(opponentPick.id);

  logLine(`Du draftest ${picked.name}. Gegner nimmt ${opponentPick.name}.`);

  if (state.playerDraft.length >= 3) {
    state.phase = 'preview';
    state.playerPreview = state.playerDraft.slice();
    state.opponentPreview = chooseTeamOrder(state.opponentDraft);
    state.message = 'Bestimme deinen Lead und die Backline.';
    render();
    return;
  }

  state.round += 1;
  state.message = `Runde ${state.round}: Suche Synergien und Coverage.`;
  nextPack();
}

function updatePlayerStateFromRequest(request) {
  state.playerTeamState = request.side.pokemon.map((mon, index) => {
    const drafted = state.playerPreview[index] || state.playerDraft[index];
    return {
      name: drafted?.name || mon.details.split(',')[0],
      types: drafted?.types || ['Normal'],
      condition: mon.condition,
      active: mon.active,
      item: mon.item,
      status: mon.status || (mon.condition.endsWith(' fnt') ? 'fainted' : ''),
    };
  });
  state.active.p1 = state.playerTeamState.find((mon) => mon.active) || state.playerTeamState[0];
}

function ensureOpponentTeamState() {
  if (!state.opponentTeamState.length) {
    state.opponentTeamState = state.opponentDraft.map((species) => ({
      name: species.name,
      types: species.types,
      condition: '100/100',
      active: false,
      status: '',
      item: '',
    }));
  }
}

function parseBattleLine(line) {
  if (!line.startsWith('|')) return;
  const parts = line.split('|');
  const type = parts[1];

  if (type === 'move') {
    const actorSlot = parts[2] || '';
    const actor = actorSlot.split(': ').pop();
    const move = parts[3];
    if (actorSlot.startsWith('p1')) state.lastMove.p1 = move;
    if (actorSlot.startsWith('p2')) state.lastMove.p2 = move;
    logLine(`${actor} nutzt ${move}.`);
  } else if (type === 'switch') {
    const slot = parts[2];
    const name = slot.split(': ').pop();
    const condition = parts[4];
    if (slot.startsWith('p2')) {
      ensureOpponentTeamState();
      state.opponentTeamState.forEach((mon) => { mon.active = mon.name === name; });
      const target = state.opponentTeamState.find((mon) => mon.name === name);
      if (target) {
        target.condition = condition;
        target.active = true;
        state.active.p2 = target;
      }
    } else if (slot.startsWith('p1')) {
      const target = state.playerTeamState.find((mon) => mon.name === name);
      if (target) {
        state.playerTeamState.forEach((mon) => { mon.active = mon.name === name; });
        target.condition = condition;
        target.active = true;
        state.active.p1 = target;
      }
    }
  } else if (type === '-damage' || type === '-heal') {
    const targetSlot = parts[2];
    const condition = parts[3];
    const targetName = targetSlot.split(': ').pop();
    const roster = targetSlot.startsWith('p2') ? state.opponentTeamState : state.playerTeamState;
    const target = roster.find((mon) => mon.name === targetName);
    if (target) target.condition = condition;
    if (targetSlot.startsWith('p2') && target) state.active.p2 = target;
    if (targetSlot.startsWith('p1') && target) state.active.p1 = target;
  } else if (type === 'faint') {
    const targetSlot = parts[2];
    const targetName = targetSlot.split(': ').pop();
    const roster = targetSlot.startsWith('p2') ? state.opponentTeamState : state.playerTeamState;
    const target = roster.find((mon) => mon.name === targetName);
    if (target) target.condition = '0 fnt';
    logLine(`${targetName} faellt aus.`);
  } else if (type === 'win') {
    state.message = `${parts[2]} gewinnt den Draft Clash.`;
    logLine(state.message);
    state.playerRequest = null;
  } else if (type === 'turn') {
    state.message = `Zug ${parts[2]}.`;
  }
}

async function startBattle() {
  state.phase = 'battle';
  state.round = 4;
  state.message = 'Teams gebaut. Die Engine startet.';
  ensureOpponentTeamState();
  render();

  const playerTeam = state.playerPreview.map((species) => generateSet(species, Dex));
  const opponentTeam = state.opponentPreview.map((species) => generateSet(species, Dex));

  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

  state.battle = {streams};

  void (async () => {
    for await (const chunk of streams.p1) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|request|')) {
          const request = JSON.parse(line.slice(9));
          state.playerRequest = request;
          if (request.teamPreview) {
            streams.p1.write('team 1, 2, 3');
          } else {
            updatePlayerStateFromRequest(request);
            render();
          }
        } else if (line.startsWith('|error|')) {
          logLine(line.replace('|error|', ''));
        }
      }
    }
  })();

  void (async () => {
    for await (const chunk of streams.p2) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('|request|')) continue;
        const request = JSON.parse(line.slice(9));
        if (request.teamPreview) {
          streams.p2.write('team 1, 2, 3');
        } else {
          const choice = chooseBattleAction(request, Dex, state.opponentPreview, state.active.p1);
          streams.p2.write(choice);
        }
      }
    }
  })();

  void (async () => {
    for await (const chunk of streams.omniscient) {
      chunk.split('\n').forEach(parseBattleLine);
      render();
    }
  })();

  await streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen9customgame'})}
>player p1 ${JSON.stringify({name: 'Du', team: Teams.pack(playerTeam)})}
>player p2 ${JSON.stringify({name: 'CPU', team: Teams.pack(opponentTeam)})}`);
}

function submitChoice(choice) {
  if (!state.battle || !state.playerRequest) return;
  state.battle.streams.p1.write(choice);
}

function movePreviewMon(index, direction) {
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= state.playerPreview.length) return;
  [state.playerPreview[index], state.playerPreview[swapIndex]] = [state.playerPreview[swapIndex], state.playerPreview[index]];
  render();
}

function resetDraft() {
  state.phase = 'draft';
  state.draftedIds = new Set();
  state.playerDraft = [];
  state.opponentDraft = [];
  state.playerPreview = [];
  state.opponentPreview = [];
  state.round = 1;
  state.pack = [];
  state.battle = null;
  state.playerRequest = null;
  state.playerTeamState = [];
  state.opponentTeamState = [];
  state.active = {p1: null, p2: null};
  state.logs = [];
  state.message = 'Waehle dein erstes Draft-Pokemon.';
  state.lastMove = {p1: '', p2: ''};
  nextPack();
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#12070e;--bg2:#25111f;--cream:#fff5e7;--ink:#211218;--muted:#bda8a6;--line:rgba(255,255,255,.12);--accent:#ff875e;--accent2:#ffcc67}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:"Segoe UI",sans-serif;background:radial-gradient(circle at top left,rgba(255,135,94,.18),transparent 25%),radial-gradient(circle at bottom right,rgba(255,204,103,.18),transparent 24%),linear-gradient(180deg,#14070d,#24111d 52%,#0f111f);color:var(--cream);padding:24px}
    .draft-shell{width:min(1320px,100%);margin:0 auto;display:grid;grid-template-columns:300px 1fr 300px;gap:20px}.column{background:rgba(18,11,20,.82);border:1px solid var(--line);border-radius:30px;box-shadow:0 28px 60px rgba(0,0,0,.32);backdrop-filter:blur(18px);padding:20px}.left,.right{display:grid;align-content:start;gap:16px}.center{display:grid;gap:18px}
    .back-link{text-decoration:none;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.06)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:#ffb184;font-size:.8rem}.title-block h1{margin:8px 0 10px;font-size:clamp(2.1rem,4.4vw,4rem);line-height:.92}.title-block p{color:var(--muted)}
    .panel,.hero-panel,.draft-card,.roster-card,.metric,.combat-card,.choice-btn,.empty-card,.draft-message,.summary,.log-line{border:1px solid var(--line);border-radius:22px;background:rgba(255,255,255,.04)}
    .panel{padding:16px}.panel-title{font-size:.84rem;text-transform:uppercase;letter-spacing:.16em;color:#ffbe9c;margin-bottom:12px}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:12px}.metric span{display:block;color:var(--muted);font-size:.78rem}.metric strong{font-size:1.15rem}
    .team-panel{display:grid;gap:10px}.roster-card{padding:12px;color:#1a1012}.roster-head{display:flex;justify-content:space-between;gap:10px}.types,.move-preview{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.types span,.move-preview span{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.38);font-size:.8rem}.tiny{font-size:.82rem;opacity:.9}
    .hero-panel{padding:18px;display:flex;justify-content:space-between;gap:16px;align-items:end}.draft-message{padding:14px 16px;min-height:64px;max-width:360px}.draft-grid,.preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.preview-grid{grid-template-columns:repeat(2,1fr)}.preview-panel{padding:18px;border-radius:24px;background:rgba(255,255,255,.03);border:1px solid var(--line)}.preview-list{display:grid;gap:12px}.preview-card{padding:14px;color:#1a1012;border-radius:20px;display:flex;justify-content:space-between;gap:10px;align-items:center}.preview-controls{display:flex;gap:8px}.mini-btn{padding:8px 10px;border:none;border-radius:12px;background:rgba(255,255,255,.55);font:inherit;cursor:pointer}
    .draft-card{padding:18px;text-align:left;color:#1a1012;cursor:pointer;transition:transform .16s ease}.draft-card:hover{transform:translateY(-3px)}.draft-num{font-size:.82rem;opacity:.7}.draft-card h3{margin:8px 0 10px;font-size:1.6rem}.stat-strip{display:flex;flex-wrap:wrap;gap:10px;font-size:.84rem;margin-top:10px}
    .battle-field{display:grid;gap:14px;padding:18px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.06))}.combatant.top{justify-self:end}.combatant.bottom{justify-self:start}.combat-card{min-width:260px;padding:18px;color:#1a1012}.hp-bar{height:12px;background:rgba(0,0,0,.14);border-radius:999px;overflow:hidden;margin-top:10px}.hp-bar.slim{height:9px}.hp-fill{height:100%;background:linear-gradient(90deg,#5be18c,#d6ffb8)}.status-row{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px}.status-pill{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.45);font-size:.8rem}
    .arena-center{min-height:220px;border-radius:26px;background:radial-gradient(circle at center,rgba(255,204,103,.18),transparent 36%),rgba(255,255,255,.03);display:grid;place-items:center;position:relative;overflow:hidden}.arena-ring{width:220px;height:220px;border-radius:50%;border:2px solid rgba(255,255,255,.12)}.turn-banner{position:absolute;top:18px;left:18px;right:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.turn-banner div{padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.06)}.arena-log{position:absolute;inset:auto 18px 18px 18px;display:grid;gap:6px;font-size:.88rem;color:#ffe6da}
    .bench-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.bench-panel{padding:16px;border-radius:24px;background:rgba(255,255,255,.03);border:1px solid var(--line)}.bench-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.bench-card{padding:12px;color:#1a1012;border-radius:18px}
    .action-panel{display:grid;gap:14px;padding:18px;border-radius:26px;background:rgba(255,255,255,.03)}.choice-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.choice-btn,.secondary-btn{padding:14px 16px;border:none;font:inherit;font-weight:700;cursor:pointer}.choice-btn{display:flex;justify-content:space-between;gap:10px;color:#190f13;background:linear-gradient(180deg,#ffe6bf,#ffc27f)}.choice-btn.switch{background:linear-gradient(180deg,#ffd0e9,#ff9bd4)}.secondary-btn{border-radius:18px;background:linear-gradient(180deg,#ffe8bc,#ffd064);color:#190f13}
    .notes{margin:0;padding-left:18px;color:var(--muted)}.log-list{display:grid;gap:10px;max-height:420px;overflow:auto}.log-line{padding:12px 14px;color:#ffe6da}.empty-card{padding:14px 16px;color:var(--muted)}
    @media (max-width:1120px){.draft-shell{grid-template-columns:1fr}.draft-grid,.choice-grid,.preview-grid,.bench-grid,.bench-list,.turn-banner{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

injectStyles();
resetDraft();

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

const app = document.getElementById('app');
const AUTOSAVE_KEY = 'soanw-character-studio-v1';
const LEVEL_TO_PROF = {1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4};
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = {str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'};
const SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation',
  'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
  'Stealth', 'Survival',
];
const SPECIES = ['Dwarf', 'Elf', 'Giant', 'Human', 'Half-Humans', 'Harpy', 'Fairy', 'Kobold', 'Merfolk', 'Wildling', 'Changeling', 'Lizardfolk'];
const ACQUIRED_SPECIES = ['None', 'Wildling', 'Changeling', 'Lizardfolk', 'Template', 'Acquired Species'];
const CLASSES = ['Barbarian', 'Bard', 'Druid', 'Fighter', 'Mage', 'Monk', 'Paladin', 'Prophet', 'Ranger', 'Rogue', 'Sorcerer', 'Witch'];
const SUBCLASS_MAP = {
  Barbarian: ['Way of the Berserker', 'Way of the War Crier'],
  Bard: ['Mythos of Eloquence', 'Mythos of Legends'],
  Druid: ['Circle of the Beast', 'Circle of the Land', 'Circle of the Moon'],
  Fighter: ['Eldritch Knight', 'Soldier'],
  Mage: ['School of the Path', 'School of the Scholar'],
  Monk: ['Tradition of the Fist', 'Tradition of the Weapon'],
  Paladin: ['Oath of Ancients', 'Oath of Devotion', 'Oath of Vengeance'],
  Prophet: ['Glory Domain', 'Valor Domain', 'Peace Domain', 'Knowledge Domain', 'Duty Domain', 'Love Domain'],
  Ranger: ['Path of the Beastmaster', 'Path of the Hunter', 'Path of the Witcher'],
  Rogue: ['Assassin', 'Spellblade', 'Thief'],
  Sorcerer: ['Spark of the Plains', 'Spark of the Desert', 'Spark of the Mountain', 'Spark of the Coast', 'Spark of the Underground', 'Spark of the Forest'],
  Witch: ['Alchemy Coven', 'Forge Coven', 'Hedge Coven'],
};
const FEATS = [
  'Animal Friend', 'Athlete', 'Attractive', 'Downtown Delver', 'Magic Initiate', 'Freeruner', 'Maneuver Initiate',
  'Medic', 'Merchant', 'Mounted Combatant', 'Mobile', 'Pickpocket', 'Power Armor Pilot', 'Quick Pockets', 'Observant',
  'Skulker', 'Smooth Talker', 'Witchcraft Initiate', 'Zealot', 'Arcane Scholar', 'Doctor', 'Multi-Tasker',
  'Prepared Caster', 'Power Caster', 'Spell Sniper', 'War Caster', 'Resilient', 'Tough', 'Quick Reflexes',
  'Harmless', 'Lightly Armored', 'Moderately Armored', 'Heavily Armored', 'Medium Armor Master', 'Heavy Armor Master',
  'Shield Master', 'Critical Striker', 'Dual Wielder', 'Firearms Training', 'Grappler', 'Mage Slayer', 'Rapid Shooter',
  'Skirmisher', 'Sniper', 'Weapons Training', 'Change Master', 'Controlled Shifter', 'Dwarven Tradition', 'Elvan Accuracy',
  'Fairy Strength', 'Friend of the Forest', 'Giant Toughness', 'Human Prodigiousness', 'Kobold Reflexes', 'Merfolk Land Adaptation', 'Squat Nimbleness',
];
const SPECIES_FEATS = {
  Dwarf: ['Dwarven Tradition'],
  Elf: ['Elvan Accuracy'],
  Giant: ['Giant Toughness'],
  Human: ['Human Prodigiousness'],
  Harpy: ['Mobile', 'Observant'],
  Fairy: ['Fairy Strength'],
  Kobold: ['Kobold Reflexes', 'Squat Nimbleness'],
  Merfolk: ['Merfolk Land Adaptation'],
  Wildling: ['Friend of the Forest', 'Change Master', 'Controlled Shifter'],
  Changeling: ['Change Master', 'Controlled Shifter'],
  Lizardfolk: ['Athlete', 'Grappler'],
};
const CLASS_MAGIC_ACCESS = {
  Barbarian: {maneuvers: true},
  Bard: {arias: true},
  Druid: {wild: true},
  Fighter: {maneuvers: true},
  Mage: {elemental: true},
  Monk: {maneuvers: true},
  Paladin: {divine: true, maneuvers: true},
  Prophet: {divine: true},
  Ranger: {wild: true, maneuvers: true},
  Rogue: {maneuvers: true},
  Sorcerer: {elemental: true},
  Witch: {witchcraft: true, elemental: true},
};
const SUBCLASS_MAGIC_ACCESS = {
  'Eldritch Knight': {elemental: true},
  Spellblade: {elemental: true},
  'Path of the Witcher': {wild: true},
};
const BUILDER_STEPS = [
  {id: 'profile', label: 'Profile'},
  {id: 'species', label: 'Species'},
  {id: 'class', label: 'Class'},
  {id: 'abilities', label: 'Abilities'},
  {id: 'proficiencies', label: 'Skills'},
  {id: 'loadout', label: 'Loadout'},
  {id: 'magic', label: 'Magic'},
  {id: 'notes', label: 'Finish'},
];
const SPELL_SECTION_LABELS = {
  arias: 'Arias',
  divine: 'Divine Magic',
  elemental: 'Elemental Magic',
  wild: 'Wild Magic',
  witchcraft: 'Witchcraft',
  maneuvers: 'Maneuvers',
};
const EQUIPMENT_REFERENCES = ['Weapons', 'Firearms', 'Armor and Shields', 'Basic Gear', 'Tools', 'Consumables', 'Vehicles'];

const state = {
  tab: 'builder',
  builderStep: 'profile',
  handbook: [],
  search: '',
  selectedSection: 'Introduction',
  selectedPage: '',
  character: loadState(),
  filteredPages: [],
};

function defaultCharacter() {
  return {
    profile: {name: '', player: '', pronouns: '', concept: '', level: 1, origin: '', species: 'Human', acquiredSpecies: 'None', className: 'Fighter', subclass: 'Soldier'},
    abilities: {str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10},
    combat: {hp: 12, vitality: 10, armorClass: 12, speed: 9, initiativeBonus: 0, exhaustion: 0, encumbrance: 0, carryLimit: 0},
    proficiencies: {skills: [], tools: '', languages: '', savingThrows: '', armor: '', weapons: ''},
    build: {feats: [], traits: '', classFeatures: '', speciesNotes: '', background: ''},
    loadout: {equipment: '', weapons: '', armor: '', consumables: '', vehicle: '', money: ''},
    magic: {arias: [], divine: [], elemental: [], wild: [], witchcraft: [], maneuvers: [], notes: ''},
    notes: {appearance: '', backstory: '', allies: '', goals: '', misc: ''},
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTOSAVE_KEY) || 'null');
    return parsed ? {...defaultCharacter(), ...parsed} : defaultCharacter();
  } catch {
    return defaultCharacter();
  }
}

function saveState() {
  window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state.character));
}

function mod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

function proficiencyBonus() {
  return LEVEL_TO_PROF[state.character.profile.level] || 2;
}

function handbookSections() {
  return [...new Set(state.handbook.map((entry) => entry.section))];
}

function normalizeTitle(value) {
  return String(value || '').replace(/[\s_-]+$/g, '').trim().toLowerCase();
}

function handbookSection(sectionName) {
  return state.handbook.find((entry) => entry.section === sectionName);
}

function handbookPage(sectionName, title) {
  const section = handbookSection(sectionName);
  return section?.pages.find((page) => normalizeTitle(page.title) === normalizeTitle(title)) || null;
}

function pageLines(page) {
  return String(page?.text || '')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean);
}

function pageIsMostlyChrome(page) {
  const lines = pageLines(page);
  if (!lines.length) return true;
  const chromeWords = [
    'SoaNW Player\'s Handbook', 'File', 'Home', 'Insert', 'Draw', 'View', 'Help', 'Viewing',
    '(Ctrl+Alt+C, Ctrl+Alt+V)', 'Styles', 'Tags', 'Conflicting change.', 'Math Assistant',
    'Math Options', 'Immersive Reader', 'Add page', 'Add section', 'Technical', 'Archive', 'Title.',
  ];
  const allPageTitles = new Set(state.handbook.flatMap((entry) => entry.pages.map((entryPage) => normalizeTitle(entryPage.title))));
  const meaningful = lines.filter((line) => !chromeWords.includes(line));
  const navigational = meaningful.filter((line) => handbookSections().includes(line) || allPageTitles.has(normalizeTitle(line)));
  const hasReadingArea = lines.some((line) => /^Reading Area/.test(line));
  return meaningful.length < 12 || (hasReadingArea && navigational.length / meaningful.length > 0.45);
}

function sanitizePageText(page) {
  const noise = new Set([
    'SoaNW Player\'s Handbook', 'File', 'Home', 'Insert', 'Draw', 'View', 'Help', 'Viewing',
    '(Ctrl+Alt+C, Ctrl+Alt+V)', 'Styles', 'Tags', 'Conflicting change.', 'Math Assistant', 'Math Options',
    'Immersive Reader', 'Title.', 'Add page', 'Add section', 'Technical', 'Archive',
  ]);
  const lines = String(page.text || '')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !noise.has(line))
    .filter((line) => !handbookSections().includes(line))
    .filter((line) => !/^Reading Area/.test(line));

  const titleIndex = Math.max(0, lines.indexOf(page.title));
  const sliced = lines.slice(titleIndex >= 0 ? titleIndex : 0);
  const cutIndex = sliced.findIndex((line) => line === 'Math Assistant' || line === 'Add page');
  const cleaned = (cutIndex >= 0 ? sliced.slice(0, cutIndex) : sliced).join('\n');
  const marker = cleaned.slice(0, Math.floor(cleaned.length / 2));
  const repeatedAt = cleaned.indexOf(marker, Math.floor(cleaned.length / 3));
  const result = repeatedAt > 120 ? cleaned.slice(0, repeatedAt).trim() : cleaned.trim();
  return pageIsMostlyChrome(page) ? '' : result;
}

function buildSpellGroups() {
  const bySection = Object.fromEntries(state.handbook.map((entry) => [entry.section, entry.pages.map((page) => page.title)]));
  return {
    arias: (bySection.Arias || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    divine: (bySection['Divine Magic'] || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    elemental: (bySection['Elemental Magic'] || []).filter((name) => !/Chapter|Lore of|Novice|Apprentice|Adept|Expert|Master|Spell$/.test(name)),
    wild: (bySection['Wild Magic'] || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    witchcraft: (bySection.Witchcraft || []).filter((name) => !/Chapter|Potion Formulas|Enchantements|Novice|Apprentice|Adept|Expert|Master|Ingredients/.test(name)),
    maneuvers: (bySection.Maneuvers || []).filter((name) => !/Chapter|Beginner|Veteran|Elite|Focus-?$|Stance-?$/.test(name)),
  };
}

function currentStepIndex() {
  return BUILDER_STEPS.findIndex((step) => step.id === state.builderStep);
}

function availableFeats() {
  const speciesSpecific = SPECIES_FEATS[state.character.profile.species] || [];
  const speciesFeatSet = new Set(Object.values(SPECIES_FEATS).flat());
  const access = magicAccess();
  const isCaster = access.arias || access.divine || access.elemental || access.wild || access.witchcraft;
  const isMartial = access.maneuvers;
  return FEATS.filter((feat) => {
    if (speciesFeatSet.has(feat) && !speciesSpecific.includes(feat)) return false;
    if (['Arcane Scholar', 'Prepared Caster', 'Power Caster', 'Spell Sniper', 'War Caster'].includes(feat) && !isCaster) return false;
    if (['Critical Striker', 'Dual Wielder', 'Grappler', 'Rapid Shooter', 'Skirmisher', 'Sniper', 'Weapons Training'].includes(feat) && !isMartial && isCaster) return false;
    return true;
  });
}

function magicAccess() {
  const byClass = CLASS_MAGIC_ACCESS[state.character.profile.className] || {};
  const bySubclass = SUBCLASS_MAGIC_ACCESS[state.character.profile.subclass] || {};
  return {...byClass, ...bySubclass};
}

function availableSpellGroups() {
  const groups = buildSpellGroups();
  const access = magicAccess();
  return Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, access[key] ? value : []]));
}

function classHandbookEntry() {
  return handbookPage('Classes', state.character.profile.className);
}

function speciesHandbookEntry() {
  return handbookPage('Species', state.character.profile.species);
}

function acquiredSpeciesEntry() {
  if (state.character.profile.acquiredSpecies === 'None') return null;
  return handbookPage('Species', state.character.profile.acquiredSpecies);
}

function subclassHandbookEntry() {
  return handbookPage('Classes', state.character.profile.subclass);
}

function selectedPageRecord() {
  const section = state.handbook.find((entry) => entry.section === state.selectedSection);
  return section?.pages.find((page) => page.title === state.selectedPage) || null;
}

function renderOptionList(options, selected, field) {
  return `
    <div class="pill-grid">
      ${options.map((option) => `
        <button class="pill ${selected.includes(option) ? 'active' : ''}" data-toggle-field="${field}" data-toggle-value="${option}">${option}</button>
      `).join('')}
    </div>
  `;
}

function renderChoiceCards(options, selected, field, detailMap = {}, emptyText = '') {
  if (!options.length) return `<div class="empty-state compact">${emptyText || 'Keine Optionen verfuegbar.'}</div>`;
  return `
    <div class="choice-grid">
      ${options.map((option) => `
        <button class="choice-card ${selected === option ? 'active' : ''}" data-choose-field="${field}" data-choose-value="${option}">
          <strong>${option}</strong>
          ${detailMap[option] ? `<span>${detailMap[option]}</span>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

function handbookPreview(page, fallback) {
  const cleaned = sanitizePageText(page);
  if (!cleaned) return fallback || 'Diese Unterseite wurde gefunden, liefert in der Share-Ansicht aber keinen sauberen Fliesstext.';
  return cleaned.split('\n').slice(0, 16).join('\n');
}

function openCompendiumButton(section, title, label = 'Im Compendium oeffnen') {
  if (!section || !title) return '';
  return `<button class="ghost-btn" data-open-section="${section}" data-open-page="${title}">${label}</button>`;
}

function stepIsComplete(stepId) {
  const c = state.character;
  if (stepId === 'profile') return Boolean(c.profile.name.trim() && c.profile.concept.trim());
  if (stepId === 'species') return Boolean(c.profile.species);
  if (stepId === 'class') return Boolean(c.profile.className && c.profile.subclass);
  if (stepId === 'abilities') return ABILITIES.every((key) => Number(c.abilities[key]) > 0);
  if (stepId === 'proficiencies') return c.proficiencies.skills.length > 0;
  if (stepId === 'loadout') return Boolean(c.loadout.equipment.trim() || c.loadout.weapons.trim() || c.loadout.armor.trim());
  if (stepId === 'magic') {
    const lists = Object.values(c.magic).filter(Array.isArray);
    const required = Object.values(magicAccess()).some(Boolean);
    return !required || lists.some((items) => items.length > 0);
  }
  if (stepId === 'notes') return true;
  return false;
}

function stepDescription(stepId) {
  if (stepId === 'profile') return 'Lege Konzept, Name und Stufe fest.';
  if (stepId === 'species') return 'Species und erworbene Form bestimmen spaetere Optionen.';
  if (stepId === 'class') return 'Klasse schaltet Subclass und Magiepfade frei.';
  if (stepId === 'abilities') return 'Hier entstehen die abgeleiteten Kampfwerte.';
  if (stepId === 'proficiencies') return 'Skills und Feats werden eingegrenzt.';
  if (stepId === 'loadout') return 'Ausruestung nach den Handbook-Kapiteln.';
  if (stepId === 'magic') return 'Nur freigeschaltete Listen und Maneuvers.';
  return 'Zum Schluss Notizen und Kampagnenhaken.';
}

function referencePanel(title, page, section) {
  return panel(title, `
    <pre class="reader-text compact">${handbookPreview(page)}</pre>
    <div class="inline-actions">${openCompendiumButton(section, page?.title)}</div>
  `);
}

function groupedHandbookOptions(sectionName, excludePattern) {
  return (handbookSection(sectionName)?.pages || [])
    .map((page) => page.title)
    .filter((title) => !excludePattern?.test(title));
}

function selectedMagicEntries() {
  return Object.entries(SPELL_SECTION_LABELS).flatMap(([key, label]) => state.character.magic[key].map((title) => ({key, label, title})));
}

function panel(title, body, subtitle = '') {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">${title}</div>
          ${subtitle ? `<div class="muted">${subtitle}</div>` : ''}
        </div>
      </div>
      ${body}
    </section>
  `;
}

function renderBuilder() {
  const spells = availableSpellGroups();
  const c = state.character;
  const step = state.builderStep;
  const speciesDetails = Object.fromEntries(SPECIES.map((item) => [item, handbookPreview(handbookPage('Species', item), '').split('\n').slice(0, 2).join(' ')]));
  const subclassDetails = Object.fromEntries((SUBCLASS_MAP[c.profile.className] || []).map((item) => [item, handbookPreview(handbookPage('Classes', item), '').split('\n').slice(0, 2).join(' ')]));
  const featDetails = Object.fromEntries(availableFeats().map((item) => [item, handbookPreview(handbookPage('Customization', item), '').split('\n').slice(0, 2).join(' ')]));
  const activeMagicLists = Object.entries(spells).filter(([, items]) => items.length);
  const selectedMagic = selectedMagicEntries();
  let body = '';
  if (step === 'profile') {
    body = `
      ${panel('Step 1 - Identity', `
        <div class="split-shell">
          <div class="form-grid two">
            <label><span>Name</span><input data-field="profile.name" value="${c.profile.name}"></label>
            <label><span>Player</span><input data-field="profile.player" value="${c.profile.player}"></label>
            <label><span>Pronouns</span><input data-field="profile.pronouns" value="${c.profile.pronouns}"></label>
            <label><span>Concept</span><input data-field="profile.concept" value="${c.profile.concept}"></label>
            <label><span>Origin</span><input data-field="profile.origin" value="${c.profile.origin}"></label>
            <label><span>Level</span><input type="number" min="1" max="10" data-field="profile.level" value="${c.profile.level}"></label>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Build Order</div>
            <h3>Von grob zu spezifisch</h3>
            <p class="muted">Zuerst Konzept und Stufe, dann Species, dann Klasse. Spaetere Schritte verengen sich automatisch, sobald diese Kernentscheidungen gesetzt sind.</p>
            <div class="summary-row">
              <div class="summary-chip">Pflicht: Name</div>
              <div class="summary-chip">Pflicht: Concept</div>
              <div class="summary-chip">Level 1-10</div>
            </div>
          </div>
        </div>
      `, 'Der Wizard ist jetzt bewusst sequenziell. Ohne solides Konzept werden spaetere Entscheidungen unklar.')}
      ${referencePanel('Character Creation', handbookPage('Introduction', 'Creating a Character'), 'Introduction')}
    `;
  } else if (step === 'species') {
    body = `
      ${panel('Step 2 - Species', `
        <div class="stack">
          <div>
            <div class="eyebrow">Core Species</div>
            ${renderChoiceCards(SPECIES, c.profile.species, 'profile.species', speciesDetails)}
          </div>
          <div class="form-grid two">
            <label><span>Acquired Species</span><select data-field="profile.acquiredSpecies">${ACQUIRED_SPECIES.map((item) => `<option ${item === c.profile.acquiredSpecies ? 'selected' : ''}>${item}</option>`).join('')}</select></label>
            <label><span>Species Notes</span><textarea data-field="build.speciesNotes">${c.build.speciesNotes}</textarea></label>
          </div>
          <div class="summary-row">
            ${(SPECIES_FEATS[c.profile.species] || []).map((feat) => `<div class="summary-chip">${feat}</div>`).join('') || '<div class="summary-chip">Keine species-exklusiven Feats gefunden</div>'}
          </div>
        </div>
      `, 'Species beeinflusst verfuegbare Species-Feats und die Referenztexte im weiteren Build.')}
      <div class="split-shell">
        ${referencePanel('Chosen Species', speciesHandbookEntry(), 'Species')}
        ${acquiredSpeciesEntry() ? referencePanel('Acquired Species', acquiredSpeciesEntry(), 'Species') : panel('Acquired Species', '<div class="empty-state compact">Keine zusaetzliche Species gewaehlt.</div>')}
      </div>
    `;
  } else if (step === 'class') {
    body = `
      ${panel('Step 3 - Class', `
        <div class="stack">
          <div>
            <div class="eyebrow">Class</div>
            ${renderChoiceCards(CLASSES, c.profile.className, 'profile.className')}
          </div>
          <div>
            <div class="eyebrow">Subclass</div>
            ${renderChoiceCards(SUBCLASS_MAP[c.profile.className] || [], c.profile.subclass, 'profile.subclass', subclassDetails, 'Diese Klasse hat aktuell keine Subclass-Liste.')}
          </div>
          <div class="form-grid two">
            <label><span>Class Features</span><textarea data-field="build.classFeatures">${c.build.classFeatures}</textarea></label>
            <label><span>Traits / Background</span><textarea data-field="build.traits">${c.build.traits}</textarea></label>
          </div>
          <div class="summary-row">
            ${Object.entries(magicAccess()).filter(([, enabled]) => enabled).map(([key]) => `<div class="summary-chip">${SPELL_SECTION_LABELS[key] || key}</div>`).join('') || '<div class="summary-chip">Keine Spell- oder Maneuver-Liste freigeschaltet</div>'}
          </div>
        </div>
      `, 'Klasse schaltet die Subclass-Liste um und bestimmt, welche Magie- oder Maneuver-Kapitel spaeter auswählbar sind.')}
      <div class="split-shell">
        ${referencePanel('Chosen Class', classHandbookEntry(), 'Classes')}
        ${referencePanel('Chosen Subclass', subclassHandbookEntry(), 'Classes')}
      </div>
    `;
  } else if (step === 'abilities') {
    body = `
      ${panel('Step 4 - Abilities', `
        <div class="split-shell">
          <div class="stack">
            <div class="ability-grid">
              ${ABILITIES.map((key) => `
                <label class="ability-card">
                  <span>${ABILITY_LABELS[key]}</span>
                  <input type="number" min="1" max="30" data-field="abilities.${key}" value="${c.abilities[key]}">
                  <strong>${mod(c.abilities[key]) >= 0 ? '+' : ''}${mod(c.abilities[key])}</strong>
                </label>
              `).join('')}
            </div>
            <div class="form-grid three">
              <label><span>Hit Points</span><input type="number" data-field="combat.hp" value="${c.combat.hp}"></label>
              <label><span>Vitality</span><input type="number" data-field="combat.vitality" value="${c.combat.vitality}"></label>
              <label><span>Armor Class</span><input type="number" data-field="combat.armorClass" value="${c.combat.armorClass}"></label>
              <label><span>Speed (m)</span><input type="number" data-field="combat.speed" value="${c.combat.speed}"></label>
              <label><span>Initiative Bonus</span><input type="number" data-field="combat.initiativeBonus" value="${c.combat.initiativeBonus}"></label>
              <label><span>Exhaustion</span><input type="number" min="0" max="6" data-field="combat.exhaustion" value="${c.combat.exhaustion}"></label>
            </div>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Derived Values</div>
            <div class="stat-table">
              <div><span>Proficiency</span><strong>+${proficiencyBonus()}</strong></div>
              <div><span>Initiative</span><strong>${mod(c.abilities.dex) + Number(c.combat.initiativeBonus || 0) >= 0 ? '+' : ''}${mod(c.abilities.dex) + Number(c.combat.initiativeBonus || 0)}</strong></div>
              <div><span>Passive Perception</span><strong>${10 + mod(c.abilities.wis)}</strong></div>
              <div><span>Carry Limit</span><strong>${c.combat.carryLimit || '-'}</strong></div>
            </div>
            <p class="muted">Diese Werte stehen absichtlich seitlich, damit die Zahleneingabe nicht mit den abgeleiteten Kampfwerten kollidiert.</p>
          </div>
        </div>
      `, 'Ab hier werden die Kernwerte gesetzt, auf denen Kampf und Skills aufbauen.')}
      ${referencePanel('Playing the Game', handbookPage('Playing the Game', 'Creating Ability Scores') || handbookPage('Playing the Game', 'Ability Checks') || handbookPage('Introduction', 'Creating a Character'), 'Playing the Game')}
    `;
  } else if (step === 'proficiencies') {
    body = `
      ${panel('Step 5 - Skills & Feats', `
        <div class="split-shell">
          <div class="stack">
            <label><span>Skill Proficiencies</span>${renderOptionList(SKILLS, c.proficiencies.skills, 'proficiencies.skills')}</label>
            <label><span>Available Feats</span>${renderOptionList(availableFeats(), c.build.feats, 'build.feats')}</label>
            <div class="form-grid two">
              <label><span>Saving Throws</span><textarea data-field="proficiencies.savingThrows">${c.proficiencies.savingThrows}</textarea></label>
              <label><span>Armor</span><textarea data-field="proficiencies.armor">${c.proficiencies.armor}</textarea></label>
              <label><span>Weapons</span><textarea data-field="proficiencies.weapons">${c.proficiencies.weapons}</textarea></label>
              <label><span>Tools</span><textarea data-field="proficiencies.tools">${c.proficiencies.tools}</textarea></label>
              <label><span>Languages</span><textarea data-field="proficiencies.languages">${c.proficiencies.languages}</textarea></label>
              <label><span>Background / Hook</span><textarea data-field="build.background">${c.build.background}</textarea></label>
            </div>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Filtered Feats</div>
            <p class="muted">Species-exklusive Feats werden sofort nach der Species-Auswahl gefiltert. Caster- und Martial-Feats werden auf Basis deiner aktuellen Klassenfreischaltungen ausgeduennt.</p>
            <div class="mini-list">
              ${availableFeats().slice(0, 8).map((feat) => `<button class="mini-link" data-open-section="Customization" data-open-page="${feat}">${feat}</button>`).join('')}
            </div>
          </div>
        </div>
      `, 'Diese Auswahl ist jetzt nicht mehr statisch: Species und Klasse schraenken die Liste real ein.')}
      <div class="split-shell">
        ${referencePanel('Feat Rules', handbookPage('Customization', 'Feats'), 'Customization')}
        ${c.build.feats[0] ? referencePanel(`Selected Feat: ${c.build.feats[0]}`, handbookPage('Customization', c.build.feats[0]), 'Customization') : panel('Feat Reference', '<div class="empty-state compact">Waehle mindestens ein Feat, um hier direkt dessen Regeltext zu sehen.</div>')}
      </div>
    `;
  } else if (step === 'loadout') {
    body = `
      ${panel('Step 6 - Loadout', `
        <div class="split-shell">
          <div class="stack">
            <div class="form-grid three">
              <label><span>Encumbrance</span><input type="number" data-field="combat.encumbrance" value="${c.combat.encumbrance}"></label>
              <label><span>Carry Limit</span><input type="number" data-field="combat.carryLimit" value="${c.combat.carryLimit}"></label>
              <label><span>Money / Wealth</span><input data-field="loadout.money" value="${c.loadout.money}"></label>
            </div>
            <div class="form-grid two">
              <label><span>Equipment</span><textarea data-field="loadout.equipment">${c.loadout.equipment}</textarea></label>
              <label><span>Weapons</span><textarea data-field="loadout.weapons">${c.loadout.weapons}</textarea></label>
              <label><span>Armor</span><textarea data-field="loadout.armor">${c.loadout.armor}</textarea></label>
              <label><span>Consumables</span><textarea data-field="loadout.consumables">${c.loadout.consumables}</textarea></label>
              <label class="full"><span>Vehicle</span><textarea data-field="loadout.vehicle">${c.loadout.vehicle}</textarea></label>
            </div>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Equipment Chapters</div>
            <div class="mini-list">
              ${EQUIPMENT_REFERENCES.map((title) => `<button class="mini-link" data-open-section="Equipment" data-open-page="${title}">${title}</button>`).join('')}
            </div>
            <p class="muted">Die Ausruestung wird absichtlich als freie Zusammenstellung erfasst, aber die relevanten Kapitel sind direkt nebenan verlinkt.</p>
          </div>
        </div>
      `, 'Loadout und Gewichtsangaben greifen jetzt unmittelbar auf die Equipment-Unterseiten zurueck.')}
      <div class="split-shell">
        ${referencePanel('Weapons', handbookPage('Equipment', 'Weapons'), 'Equipment')}
        ${referencePanel('Armor and Shields', handbookPage('Equipment', 'Armor and Shields'), 'Equipment')}
      </div>
    `;
  } else if (step === 'magic') {
    body = `
      ${panel('Step 7 - Magic & Maneuvers', `
        ${activeMagicLists.length ? `
          <div class="stack">
            ${activeMagicLists.map(([key, items]) => `
              <label>
                <span>${SPELL_SECTION_LABELS[key]}</span>
                <div class="spell-picker">${renderOptionList(items, c.magic[key], `magic.${key}`)}</div>
              </label>
            `).join('')}
            <label><span>Magic Notes</span><textarea data-field="magic.notes">${c.magic.notes}</textarea></label>
          </div>
        ` : '<div class="empty-state compact">Diese Klasse/Subclass schaltet aktuell keine Zauberliste oder Maneuver-Liste frei.</div>'}
      `, 'Die Auswahl stammt jetzt direkt aus den Unterseiten der jeweiligen Magie-Kapitel und wird pro Klasse/Subclass freigeschaltet.')}
      <div class="split-shell">
        ${referencePanel('Spellcasting Rules', handbookPage('Magic', 'Casting Spells') || handbookPage('Magic', 'Chapter 10: The Rules of Spellcasting'), 'Magic')}
        ${selectedMagic[0] ? referencePanel(`${selectedMagic[0].label}: ${selectedMagic[0].title}`, handbookPage(selectedMagic[0].label, selectedMagic[0].title), selectedMagic[0].label) : panel('Selected Magic', '<div class="empty-state compact">Waehle einen Spell oder Maneuver, um hier direkt seine Unterseite zu sehen.</div>')}
      </div>
    `;
  } else if (step === 'notes') {
    body = `
      ${panel('Step 8 - Finish', `
        <div class="split-shell">
          <div class="form-grid two">
            <label><span>Appearance</span><textarea data-field="notes.appearance">${c.notes.appearance}</textarea></label>
            <label><span>Backstory</span><textarea data-field="notes.backstory">${c.notes.backstory}</textarea></label>
            <label><span>Allies & Companions</span><textarea data-field="notes.allies">${c.notes.allies}</textarea></label>
            <label><span>Goals</span><textarea data-field="notes.goals">${c.notes.goals}</textarea></label>
            <label class="full"><span>Misc</span><textarea data-field="notes.misc">${c.notes.misc}</textarea></label>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Ready To Export</div>
            <div class="stat-table">
              <div><span>Species</span><strong>${c.profile.species}</strong></div>
              <div><span>Class</span><strong>${c.profile.className}</strong></div>
              <div><span>Subclass</span><strong>${c.profile.subclass || '-'}</strong></div>
              <div><span>Selected Magic</span><strong>${selectedMagic.length}</strong></div>
            </div>
            <p class="muted">Hier endet der Wizard. Export und Reimport arbeiten mit dem kompletten Character State.</p>
          </div>
        </div>
      `, 'Jetzt bleiben nur noch frei formulierbare Details und der Export.')}
      ${referencePanel('Campaign Notes Reference', handbookPage('Introduction', 'Introduction') || handbookPage('Playing the Game', 'Social Interaction'), 'Introduction')}
    `;
  }
  return `
    <section class="wizard-strip">
      ${BUILDER_STEPS.map((item, index) => `<button class="wizard-step ${item.id === step ? 'active' : ''} ${stepIsComplete(item.id) ? 'done' : ''}" data-step="${item.id}"><span>${index + 1}</span><div><strong>${item.label}</strong><small>${stepDescription(item.id)}</small></div></button>`).join('')}
    </section>
    <section class="panel soft">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Current Step</div>
          <h3>${BUILDER_STEPS[currentStepIndex()]?.label || 'Builder'}</h3>
        </div>
        <div class="summary-row">
          <div class="summary-chip">${stepIsComplete(step) ? 'Schritt komplett' : 'Schritt unvollstaendig'}</div>
          <div class="summary-chip">Progress ${BUILDER_STEPS.filter((item) => stepIsComplete(item.id)).length}/${BUILDER_STEPS.length}</div>
        </div>
      </div>
    </section>
    ${body}
    <section class="wizard-nav">
      <button class="tab-btn ${currentStepIndex() === 0 ? 'disabled' : ''}" data-step-nav="-1" ${currentStepIndex() === 0 ? 'disabled' : ''}>Zurueck</button>
      <button class="primary-btn" data-step-nav="1">${currentStepIndex() === BUILDER_STEPS.length - 1 ? 'Fertig' : 'Weiter'}</button>
    </section>
  `;
}

function renderCompendium() {
  const page = selectedPageRecord();
  const sections = handbookSections();
  const currentPages = state.handbook.find((entry) => entry.section === state.selectedSection)?.pages || [];
  return `
    <section class="panel compendium-shell">
      <div class="compendium-sidebar">
        <label class="search-box"><span>Suchen</span><input id="searchInput" value="${state.search}" placeholder="Spell, class, condition ..."></label>
        <div class="filter-list">
          ${sections.map((section) => `<button class="filter-btn ${section === state.selectedSection ? 'active' : ''}" data-section="${section}">${section}</button>`).join('')}
        </div>
        <div class="page-list">
          ${(state.search ? state.filteredPages : currentPages).map((item) => `<button class="page-btn ${item.title === state.selectedPage ? 'active' : ''}" data-page="${item.title}">${item.title}</button>`).join('')}
        </div>
      </div>
      <div class="compendium-reader">
        ${page ? `
          <div class="reader-head">
            <div>
              <div class="eyebrow">${state.selectedSection}</div>
              <h2>${page.title}</h2>
            </div>
          </div>
          <pre class="reader-text">${sanitizePageText(page) || 'Diese OneNote-Seite enthaelt in der Freigabe kaum lesbaren Text. Der Titel bleibt aber als Referenz im Compendium vorhanden.'}</pre>
        ` : '<div class="empty-state">Waehle links einen Abschnitt oder suche direkt nach Regeln.</div>'}
      </div>
    </section>
  `;
}

function renderExport() {
  return `
    <section class="panel">
      <div class="eyebrow">PDF Pipeline</div>
      <h2>Export & Import</h2>
      <p class="muted">Der Export erzeugt ein lesbares Charakterblatt plus eingebettete JSON-Daten im PDF. Ein importiertes PDF aus diesem Studio stellt den Charakterstand wieder her.</p>
      <div class="export-actions">
        <button class="primary-btn" id="exportPdfBtn">PDF exportieren</button>
        <label class="upload-btn">PDF importieren<input type="file" id="importPdfInput" accept="application/pdf"></label>
      </div>
      <div class="panel soft">
        <div class="eyebrow">Was drin ist</div>
        <ul class="notes">
          <li>Charakter-Basisdaten, Build, Zauber, Maneuvers, Ausruestung und Notizen</li>
          <li>Eingebetteter Wiederherstellungspayload fuer PDF-Reimport</li>
          <li>Kompatibel mit lokal gespeicherten PDFs aus diesem Character Studio</li>
        </ul>
      </div>
    </section>
  `;
}

function renderSummary() {
  const c = state.character;
  const skillCount = c.proficiencies.skills.length;
  const spellCount = c.magic.arias.length + c.magic.divine.length + c.magic.elemental.length + c.magic.wild.length + c.magic.witchcraft.length;
  const maneuverCount = c.magic.maneuvers.length;
  return `
    <div class="summary-card sticky">
      <a class="back-link" href="../index.html#games">Zurueck zur Startseite</a>
      <div class="eyebrow">SoaNW Character Studio</div>
      <h1>${c.profile.name || 'Unbenannter Charakter'}</h1>
      <p class="muted">${c.profile.species} ${c.profile.className} ${c.profile.subclass ? `- ${c.profile.subclass}` : ''}</p>
      <div class="summary-stats">
        <div><span>Level</span><strong>${c.profile.level}</strong></div>
        <div><span>Proficiency</span><strong>+${proficiencyBonus()}</strong></div>
        <div><span>HP</span><strong>${c.combat.hp}</strong></div>
        <div><span>Vitality</span><strong>${c.combat.vitality}</strong></div>
        <div><span>AC</span><strong>${c.combat.armorClass}</strong></div>
        <div><span>Speed</span><strong>${c.combat.speed}m</strong></div>
      </div>
      <div class="ability-summary">
        ${ABILITIES.map((key) => `<div><span>${ABILITY_LABELS[key].slice(0,3).toUpperCase()}</span><strong>${c.abilities[key]}</strong><small>${mod(c.abilities[key]) >= 0 ? '+' : ''}${mod(c.abilities[key])}</small></div>`).join('')}
      </div>
      <div class="summary-foot">
        <span>${skillCount} Skills</span>
        <span>${spellCount} Spells</span>
        <span>${maneuverCount} Maneuvers</span>
      </div>
    </div>
  `;
}

function render() {
  app.innerHTML = `
    <div class="studio-shell">
      <aside class="left-rail">${renderSummary()}</aside>
      <main class="main-column">
        <section class="hero">
          <div>
            <div class="eyebrow">D&D-inspired P&P Builder</div>
            <h2>SoaNW Character Studio</h2>
            <p class="muted">Builder, Regel-Compendium und PDF-Workflow fuer das geteilte SoaNW Player's Handbook aus OneDrive.</p>
          </div>
          <div class="tab-row">
            ${['builder', 'compendium', 'export'].map((tab) => `<button class="tab-btn ${state.tab === tab ? 'active' : ''}" data-tab="${tab}">${tab === 'builder' ? 'Builder' : tab === 'compendium' ? 'Compendium' : 'Export'}</button>`).join('')}
          </div>
        </section>
        ${state.tab === 'builder' ? renderBuilder() : state.tab === 'compendium' ? renderCompendium() : renderExport()}
      </main>
    </div>
  `;
  bindEvents();
}

function setByPath(path, value) {
  const keys = path.split('.');
  let target = state.character;
  while (keys.length > 1) target = target[keys.shift()];
  target[keys[0]] = value;
}

function toggleArrayValue(path, value) {
  const keys = path.split('.');
  let target = state.character;
  while (keys.length > 1) target = target[keys.shift()];
  const arr = target[keys[0]];
  target[keys[0]] = arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];
}

function applyFieldChange(path, value) {
  setByPath(path, value);
  if (path === 'profile.className') {
    state.character.profile.subclass = SUBCLASS_MAP[value]?.[0] || '';
    const access = {...(CLASS_MAGIC_ACCESS[value] || {}), ...(SUBCLASS_MAGIC_ACCESS[state.character.profile.subclass] || {})};
    for (const key of ['arias', 'divine', 'elemental', 'wild', 'witchcraft', 'maneuvers']) {
      if (!access[key]) state.character.magic[key] = [];
    }
  }
  if (path === 'profile.subclass') {
    const access = magicAccess();
    for (const key of ['arias', 'divine', 'elemental', 'wild', 'witchcraft', 'maneuvers']) {
      if (!access[key]) state.character.magic[key] = [];
    }
  }
  if (path === 'profile.species') {
    const allowedFeats = new Set(availableFeats());
    state.character.build.feats = state.character.build.feats.filter((feat) => allowedFeats.has(feat));
  }
}

function handleFieldInput(event) {
  const input = event.target;
  const path = input.dataset.field;
  if (!path) return;
  const value = input.type === 'number' ? Number(input.value) : input.value;
  applyFieldChange(path, value);
  saveState();
  render();
}

function refreshSearch() {
  const term = state.search.trim().toLowerCase();
  if (!term) {
    state.filteredPages = [];
    return;
  }
  state.filteredPages = state.handbook.flatMap((entry) => entry.pages
    .filter((page) => page.title.toLowerCase().includes(term) || sanitizePageText(page).toLowerCase().includes(term))
    .map((page) => ({...page, section: entry.section})));
}

async function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit: 'pt', format: 'a4'});
  const c = state.character;
  const lines = [
    ['Name', c.profile.name || '-'],
    ['Player', c.profile.player || '-'],
    ['Species', `${c.profile.species} ${c.profile.acquiredSpecies !== 'None' ? `/ ${c.profile.acquiredSpecies}` : ''}`.trim()],
    ['Class', `${c.profile.className} / ${c.profile.subclass || '-'}`],
    ['Level', String(c.profile.level)],
    ['HP / Vitality / AC', `${c.combat.hp} / ${c.combat.vitality} / ${c.combat.armorClass}`],
    ['Speed / Prof', `${c.combat.speed}m / +${proficiencyBonus()}`],
    ['Skills', c.proficiencies.skills.join(', ') || '-'],
    ['Feats', c.build.feats.join(', ') || '-'],
    ['Spells', [...c.magic.arias, ...c.magic.divine, ...c.magic.elemental, ...c.magic.wild, ...c.magic.witchcraft].join(', ') || '-'],
    ['Maneuvers', c.magic.maneuvers.join(', ') || '-'],
    ['Equipment', c.loadout.equipment || '-'],
    ['Notes', [c.notes.appearance, c.notes.backstory, c.notes.goals].filter(Boolean).join(' | ') || '-'],
  ];
  doc.setFillColor(18, 16, 28);
  doc.rect(0, 0, 595, 120, 'F');
  doc.setTextColor(255, 245, 231);
  doc.setFontSize(28);
  doc.text('SoaNW Character Studio', 40, 60);
  doc.setFontSize(12);
  doc.text('D&D-inspired character sheet and restore payload', 40, 84);
  doc.setTextColor(30, 24, 32);
  let y = 150;
  for (const [label, value] of lines) {
    const wrapped = doc.splitTextToSize(String(value), 360);
    doc.setFont(undefined, 'bold');
    doc.text(label, 40, y);
    doc.setFont(undefined, 'normal');
    doc.text(wrapped, 180, y);
    y += Math.max(26, wrapped.length * 14 + 8);
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
  }
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(state.character))));
  doc.addPage();
  doc.setFontSize(14);
  doc.text('SOANW PDF RESTORE DATA', 40, 50);
  doc.setFontSize(8);
  doc.text('Import this PDF back into the studio to restore the character.', 40, 66);
  payload.match(/.{1,70}/g)?.forEach((chunk, index) => {
    doc.text(`SOANW_JSON_${index}:${chunk}`, 40, 90 + index * 10);
  });
  doc.save(`${(c.profile.name || 'soanw-character').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

async function importPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buffer}).promise;
  let extracted = '';
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    extracted += text.items.map((item) => item.str).join('\n');
  }
  const chunks = extracted
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('SOANW_JSON_'))
    .map((line) => {
      const [, order, chunk] = line.match(/^SOANW_JSON_(\d+):(.+)$/) || [];
      return {order: Number(order), chunk: (chunk || '').replace(/[^A-Za-z0-9+/=_-]/g, '')};
    })
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.chunk);
  if (!chunks.length) throw new Error('Kein importierbarer SoaNW-Payload im PDF gefunden.');
  state.character = JSON.parse(decodeURIComponent(escape(atob(chunks.join('')))));
  saveState();
  render();
}

function bindEvents() {
  document.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', handleFieldInput);
    input.addEventListener('change', handleFieldInput);
  });
  document.querySelectorAll('[data-toggle-field]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleArrayValue(button.dataset.toggleField, button.dataset.toggleValue);
      saveState();
      render();
    });
  });
  document.querySelectorAll('[data-choose-field]').forEach((button) => {
    button.addEventListener('click', () => {
      applyFieldChange(button.dataset.chooseField, button.dataset.chooseValue);
      saveState();
      render();
    });
  });
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    state.tab = button.dataset.tab;
    render();
  }));
  document.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => {
    state.builderStep = button.dataset.step;
    render();
  }));
  document.querySelectorAll('[data-step-nav]').forEach((button) => button.addEventListener('click', () => {
    if (Number(button.dataset.stepNav) > 0 && !stepIsComplete(state.builderStep)) return;
    const next = currentStepIndex() + Number(button.dataset.stepNav);
    if (next < 0 || next >= BUILDER_STEPS.length) return;
    state.builderStep = BUILDER_STEPS[next].id;
    render();
  }));
  document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => {
    state.selectedSection = button.dataset.section;
    const firstPage = state.handbook.find((entry) => entry.section === state.selectedSection)?.pages[0];
    state.selectedPage = firstPage?.title || '';
    state.search = '';
    state.filteredPages = [];
    render();
  }));
  document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => {
    state.selectedPage = button.dataset.page;
    const found = state.filteredPages.find((page) => page.title === button.dataset.page);
    if (found?.section) state.selectedSection = found.section;
    render();
  }));
  document.querySelectorAll('[data-open-page]').forEach((button) => button.addEventListener('click', () => {
    state.tab = 'compendium';
    state.selectedSection = button.dataset.openSection;
    state.selectedPage = button.dataset.openPage;
    state.search = '';
    state.filteredPages = [];
    render();
  }));
  document.getElementById('searchInput')?.addEventListener('input', (event) => {
    state.search = event.target.value;
    refreshSearch();
    render();
  });
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportPdf);
  document.getElementById('importPdfInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importPdf(file);
    } catch (error) {
      alert(error.message);
    }
  });
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#11111a;--bg2:#201924;--panel:#191622;--soft:#221d2b;--line:rgba(255,255,255,.11);--text:#f8f4ef;--muted:#b9afbf;--accent:#f0c36c;--accent2:#7fd1ff;--ink:#211923}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(circle at top left,rgba(127,209,255,.16),transparent 24%),radial-gradient(circle at bottom right,rgba(240,195,108,.14),transparent 26%),linear-gradient(180deg,#100f18,#1b1420 52%,#120f18);color:var(--text);padding:24px}button,input,select,textarea{font:inherit}
    .studio-shell{width:min(1480px,100%);margin:0 auto;display:grid;grid-template-columns:320px minmax(0,1fr);gap:20px}.left-rail{display:grid}.summary-card,.panel,.hero,.tab-btn,.pill,.filter-btn,.page-btn,.primary-btn,.upload-btn,.choice-card,.ghost-btn,.wizard-step,.guide-card,.search-box{border:1px solid var(--line);border-radius:24px;background:rgba(25,22,34,.82);backdrop-filter:blur(14px)}.summary-card.sticky{position:sticky;top:24px;padding:20px}.back-link{text-decoration:none;display:inline-flex;margin-bottom:14px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text)}h1,h2,h3{margin:0}.muted{color:var(--muted)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.78rem;color:var(--accent)}
    .summary-stats,.ability-summary{display:grid;gap:10px}.summary-stats{grid-template-columns:repeat(2,1fr);margin:18px 0}.summary-stats div,.ability-summary div,.summary-chip,.summary-pill{padding:12px;border-radius:18px;background:rgba(255,255,255,.04)}.summary-stats span,.ability-summary span{display:block;color:var(--muted);font-size:.78rem}.ability-summary{grid-template-columns:repeat(3,1fr)}.ability-summary strong{display:block;font-size:1.1rem}.ability-summary small{color:var(--accent2)}.summary-foot{display:flex;gap:10px;flex-wrap:wrap;color:var(--muted)}
    .main-column{display:grid;gap:18px}.hero{padding:18px;display:flex;justify-content:space-between;gap:18px;align-items:end}.tab-row{display:flex;gap:10px;flex-wrap:wrap}.tab-btn{padding:12px 16px;color:var(--text);cursor:pointer}.tab-btn.active,.primary-btn,.upload-btn{background:linear-gradient(135deg,#f0c36c,#ffdd96);color:var(--ink)}.tab-btn.disabled{opacity:.45;cursor:default}
    .panel{padding:18px;display:grid;gap:16px}.panel.soft{background:rgba(255,255,255,.04)}.panel-head{display:flex;justify-content:space-between;gap:12px}.form-grid{display:grid;gap:14px}.form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}label{display:grid;gap:8px}label.full{grid-column:1/-1}input,select,textarea{width:100%;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text)}textarea{min-height:112px;resize:vertical}
    .ability-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.ability-card{padding:14px;border-radius:20px;background:rgba(255,255,255,.04)}.ability-card strong{font-size:1.4rem}.summary-row{display:flex;gap:10px;flex-wrap:wrap}.summary-chip{color:var(--text)}
    .pill-grid{display:flex;flex-wrap:wrap;gap:8px}.pill,.filter-btn,.page-btn,.wizard-step,.ghost-btn,.mini-link{padding:10px 12px;color:var(--text);cursor:pointer}.pill.active,.filter-btn.active,.page-btn.active,.wizard-step.active,.choice-card.active{background:linear-gradient(135deg,#7fd1ff,#b4e7ff);color:var(--ink)}
    .wizard-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.wizard-step{display:flex;align-items:center;gap:12px;text-align:left;border-radius:22px;background:rgba(255,255,255,.04)}.wizard-step.done{box-shadow:inset 0 0 0 1px rgba(240,195,108,.35)}.wizard-step span{display:grid;place-items:center;min-width:30px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.08)}.wizard-step small{display:block;color:inherit;opacity:.72}.wizard-nav{display:flex;justify-content:space-between;gap:12px}.reader-text.compact{max-height:360px}
    .split-shell{display:grid;grid-template-columns:1.3fr .9fr;gap:16px;align-items:start}.stack{display:grid;gap:16px}.guide-card{padding:18px;display:grid;gap:14px}.choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.choice-card{padding:14px;display:grid;gap:8px;text-align:left;color:var(--text);cursor:pointer;min-height:108px}.choice-card strong{font-size:1rem}.choice-card span{color:var(--muted);font-size:.9rem;line-height:1.35}.ghost-btn{background:rgba(255,255,255,.04)}.inline-actions,.mini-list{display:flex;gap:8px;flex-wrap:wrap}.mini-link{border-radius:999px;background:rgba(255,255,255,.04)}.stat-table{display:grid;gap:10px}.stat-table div{display:flex;justify-content:space-between;gap:12px;padding:12px;border-radius:16px;background:rgba(255,255,255,.04)}.compact{font-size:.95rem}.empty-state.compact{padding:18px}.spell-picker{max-height:220px;overflow:auto;padding:10px;border-radius:18px;background:rgba(255,255,255,.03)}
    .compendium-shell{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.compendium-sidebar,.compendium-reader{display:grid;gap:12px}.search-box{padding:14px;border-radius:20px;background:rgba(255,255,255,.04)}.filter-list,.page-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto}.reader-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.reader-text{margin:0;padding:18px;border-radius:22px;background:rgba(255,255,255,.04);white-space:pre-wrap;font-family:Georgia,serif;line-height:1.58;overflow:auto}
    .export-actions{display:flex;gap:12px;flex-wrap:wrap}.primary-btn,.upload-btn{padding:14px 18px;font-weight:700;cursor:pointer}.upload-btn input{display:none}.notes{margin:0;padding-left:18px;display:grid;gap:8px}.empty-state{padding:28px;border-radius:22px;background:rgba(255,255,255,.04);color:var(--muted)}
    @media (max-width:1180px){.studio-shell,.compendium-shell,.form-grid.two,.form-grid.three,.ability-grid,.split-shell,.choice-grid,.wizard-strip{grid-template-columns:1fr}.left-rail{order:2}.main-column{order:1}.summary-card.sticky{position:static}.hero,.wizard-nav{flex-direction:column;align-items:flex-start}}
    @media (max-width:720px){body{padding:16px}.summary-stats,.ability-summary{grid-template-columns:1fr}.panel,.summary-card.sticky,.hero,.tab-btn,.pill,.filter-btn,.page-btn,.primary-btn,.upload-btn{border-radius:18px}}
  `;
  document.head.appendChild(style);
}

async function init() {
  injectStyles();
  const response = await fetch('soanw-handbook.json');
  state.handbook = await response.json();
  state.selectedSection = state.handbook[0]?.section || 'Introduction';
  state.selectedPage = state.handbook[0]?.pages[0]?.title || '';
  refreshSearch();
  render();
}

init().catch((error) => {
  app.innerHTML = `<div style="color:white;padding:24px">Fehler beim Laden des Character Studios: ${error.message}</div>`;
});

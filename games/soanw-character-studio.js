import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

const app = document.getElementById('app');
const AUTOSAVE_KEY = 'soanw-character-studio-v1';
const PDF_TEMPLATE_URL = './SoaNW_CHARACTER_SHEET.template.pdf';
const HIDDEN_EXPORT_TEXT = {r: 1, g: 1, b: 1};
const UNFINISHED_RULE_TITLES = new Set(['steady aim', 'defensive stance']);
const LEVEL_TO_PROF = {1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4};
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = {str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'};
const POINT_BUY_COST = {8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9};
const POINT_BUY_BUDGET = 27;
const SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'History', 'Insight', 'Intimidation',
  'Investigation', 'Mechanics', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Science',
  'Sleight of Hand', 'Stealth', 'Survival', 'Driving', 'Explosives',
];
const PDF_SKILL_SLOTS = [
  {fieldName: 'SK20', checkField: 'Check Box20', skill: 'Crafting'},
  {fieldName: 'SK0', checkField: 'Check Box81', skill: 'Animal Handling'},
  {fieldName: 'SK1', checkField: 'Check Box82', skill: 'Arcana'},
  {fieldName: 'SK2', checkField: 'Check Box83', skill: 'Deception'},
  {fieldName: 'SK3', checkField: 'Check Box84', skill: 'Athletics'},
  {fieldName: 'SK4', checkField: 'Check Box85', skill: 'Intimidation'},
  {fieldName: 'SK5', checkField: 'Check Box86', skill: 'Investigation'},
  {fieldName: 'SK6', checkField: 'Check Box87', skill: 'Insight'},
  {fieldName: 'SK7', checkField: 'Check Box88', skill: 'Mechanics'},
  {fieldName: 'SK8', checkField: 'Check Box89', skill: 'Medicine'},
  {fieldName: 'SK9', checkField: 'Check Box811', skill: 'Nature'},
  {fieldName: 'SK10', checkField: 'Check Box812', skill: 'Perception'},
  {fieldName: 'SK11', checkField: 'Check Box813', skill: 'Performance'},
  {fieldName: 'SK12', checkField: 'Check Box814', skill: 'Persuasion'},
  {fieldName: 'SK13', checkField: 'Check Box815', skill: 'Religion'},
  {fieldName: 'SK14', checkField: 'Check Box816', skill: 'Science'},
  {fieldName: 'SK15', checkField: 'Check Box817', skill: 'Sleight of Hand'},
  {fieldName: 'SK16', checkField: 'Check Box818', skill: 'Stealth'},
  {fieldName: 'SK17', checkField: 'Check Box819', skill: 'Survival'},
  {fieldName: 'SK18', checkField: 'Check Box8111', skill: 'Acrobatics'},
  {fieldName: 'SK19', checkField: 'Check Box8112', skill: 'History'},
];
const SAVE_THROW_FIELDS = [
  {fieldName: 'ST1', checkField: 'Check Box1', ability: 'str'},
  {fieldName: 'ST2', checkField: 'Check Box5', ability: 'dex'},
  {fieldName: 'ST3', checkField: 'Check Box7', ability: 'con'},
  {fieldName: 'ST4', checkField: 'Check Box8', ability: 'int'},
  {fieldName: 'ST5', checkField: 'Check Box9', ability: 'wis'},
  {fieldName: 'ST6', checkField: 'Check Box10', ability: 'cha'},
];
// The OneNote export exposes only part of the class header data consistently.
// Where the source text is incomplete, these save proficiencies follow the class role used elsewhere in the studio.
const CLASS_SAVE_PROFICIENCIES = {
  Barbarian: ['str', 'con'],
  Bard: ['con', 'cha'],
  Druid: ['wis', 'int'],
  Fighter: ['str', 'dex'],
  Mage: ['int', 'wis'],
  Monk: ['str', 'dex'],
  Paladin: ['wis', 'cha'],
  Prophet: ['wis', 'cha'],
  Ranger: ['str', 'dex'],
  Rogue: ['dex', 'int'],
  Sorcerer: ['con', 'cha'],
  Witch: ['int', 'cha'],
};
const WEAPON_PROFILES = {
  // Explicit handbook references confirmed from the parsed Equipment pages:
  // Compound Bow = 1d10 piercing, firearms = attack uses DEX but no DEX/STR on damage,
  // firearm ammo classes include Pistol (d4) and Rifle (d6).
  greataxe: {label: 'Greataxe', ability: 'str', damage: '1d12', type: 'slashing'},
  javelins: {label: 'Javelin', ability: 'str', damage: '1d6', type: 'piercing', effect: ['thrown']},
  hatchet: {label: 'Hatchet', ability: 'str', damage: '1d6', type: 'slashing', effect: ['thrown']},
  'light sidearm': {label: 'Light Sidearm', ability: 'dex', damage: '1d4', type: 'piercing', effect: ['ranged'], noDamageMod: true},
  'light weapon': {label: 'Light Weapon', ability: 'dex', damage: '1d4', type: 'piercing', finesse: true, effect: ['light', 'thrown']},
  staff: {label: 'Staff', ability: 'str', damage: '1d6', type: 'bludgeoning'},
  spear: {label: 'Spear', ability: 'str', damage: '1d6', type: 'piercing', effect: ['thrown']},
  rifle: {label: 'Rifle', ability: 'dex', damage: '1d6', type: 'piercing', effect: ['ranged'], noDamageMod: true},
  sidearm: {label: 'Sidearm', ability: 'dex', damage: '1d4', type: 'piercing', effect: ['ranged'], noDamageMod: true},
  carbine: {label: 'Carbine', ability: 'dex', damage: '1d6', type: 'piercing', effect: ['ranged'], noDamageMod: true},
  knife: {label: 'Knife', ability: 'dex', damage: '1d4', type: 'piercing', finesse: true, effect: ['light', 'thrown']},
  'focus blade': {label: 'Focus Blade', ability: 'dex', damage: '1d8', type: 'slashing', finesse: true},
  polearm: {label: 'Polearm', ability: 'str', damage: '1d10', type: 'slashing', effect: ['reach']},
  sword: {label: 'Sword', ability: 'str', damage: '1d8', type: 'slashing'},
  mace: {label: 'Mace', ability: 'str', damage: '1d6', type: 'bludgeoning'},
  bow: {label: 'Bow', ability: 'dex', damage: '1d10', type: 'piercing', effect: ['ranged']},
  pistol: {label: 'Pistol', ability: 'dex', damage: '1d4', type: 'piercing', effect: ['ranged'], noDamageMod: true},
};
const SKILL_DESCRIPTIONS = {
  Acrobatics: 'Balance, tumbling, agile movement and keeping your footing.',
  'Animal Handling': 'Calming, guiding and understanding beasts.',
  Arcana: 'Arcane knowledge, lores and magical theory.',
  Athletics: 'Climbing, swimming, grappling and feats of strength.',
  Crafting: 'Repairing, building and practical handwork.',
  Deception: 'Lies, disguises and misleading people.',
  History: 'Knowledge of cultures, events and older lore.',
  Insight: 'Reading motives, moods and social intent.',
  Intimidation: 'Threats, pressure and forceful presence.',
  Investigation: 'Clues, deduction and careful searching.',
  Mechanics: 'Locks, traps, machines and technical handling.',
  Medicine: 'Diagnosis, treatment and field care.',
  Nature: 'Wildlife, plants, terrain and natural phenomena.',
  Perception: 'Spotting danger, details and hidden movement.',
  Performance: 'Music, acting, speech and staged presence.',
  Persuasion: 'Convincing, negotiating and diplomacy.',
  Religion: 'Gods, cults, rites and divine traditions.',
  Science: 'Systematic knowledge, experiments and technical reasoning.',
  'Sleight of Hand': 'Pickpocketing, concealment and manual trickery.',
  Stealth: 'Moving unseen and unheard.',
  Survival: 'Tracking, foraging, navigation and wilderness endurance.',
  Driving: 'Operating ground vehicles under pressure.',
  Explosives: 'Handling, placing and understanding explosives.',
};
const SKILL_TO_ABILITY = {
  Acrobatics: 'dex',
  'Animal Handling': 'wis',
  Arcana: 'int',
  Athletics: 'str',
  Crafting: 'int',
  Deception: 'cha',
  History: 'int',
  Insight: 'wis',
  Intimidation: 'cha',
  Investigation: 'int',
  Mechanics: 'int',
  Medicine: 'wis',
  Nature: 'int',
  Perception: 'wis',
  Performance: 'cha',
  Persuasion: 'cha',
  Religion: 'int',
  Science: 'int',
  'Sleight of Hand': 'dex',
  Stealth: 'dex',
  Survival: 'wis',
  Driving: 'dex',
  Explosives: 'int',
};
const SPECIES = ['Dwarf', 'Elf', 'Giant', 'Human', 'Half-Humans', 'Harpy', 'Fairy', 'Kobold', 'Merfolk'];
const ACQUIRED_SPECIES = ['None', 'Wildling', 'Changeling', 'Lizardfolk'];
const ACQUIRED_SPECIES_RULES = {
  Wildling: {inheritsCoreStats: true, addsAbilityBonuses: true, addsAutomaticSkills: true, keepsBaseTraits: true},
  Changeling: {inheritsCoreStats: true, addsAbilityBonuses: false, addsAutomaticSkills: false, keepsBaseTraits: false},
  Lizardfolk: {inheritsCoreStats: true, addsAbilityBonuses: true, addsAutomaticSkills: true, keepsBaseTraits: true},
};
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
  Paladin: {divine: true},
  Prophet: {divine: true},
  Ranger: {wild: true, maneuvers: true},
  Rogue: {maneuvers: true},
  Sorcerer: {elemental: true},
  Witch: {witchcraft: true},
};
const SUBCLASS_MAGIC_ACCESS = {
  'Eldritch Knight': {elemental: true},
  Spellblade: {elemental: true},
  'Path of the Witcher': {witchcraft: true},
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
const ELEMENTAL_LORES = ['Force', 'Light', 'Frost', 'Lightning', 'Fire', 'Life'];
const FIXED_ELEMENTAL_LORES = {
  'Spark of the Plains': 'Force',
  'Spark of the Desert': 'Light',
  'Spark of the Mountain': 'Frost',
  'Spark of the Coast': 'Life',
  'Spark of the Underground': 'Lightning',
  'Spark of the Forest': 'Fire',
};
const PROPHET_SPELLCASTING_ABILITIES = {
  'Glory Domain': 'str',
  'Valor Domain': 'dex',
  'Peace Domain': 'con',
  'Knowledge Domain': 'int',
  'Duty Domain': 'wis',
  'Love Domain': 'cha',
};
const SPELL_TIERS = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'];
const CHANNEL_ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const EQUIPMENT_REFERENCES = ['Weapons', 'Firearms', 'Armor and Shields', 'Basic Gear', 'Tools', 'Consumables', 'Vehicles'];
const MANUAL_COMPENDIUM_TEXT = {
  'Species:Wildling': `Wildlings are an acquired species layered on top of a valid base species. The OneNote sections describe them as humanoids shaped by wild magic whose anatomy usually follows their mother while adding visibly fey or beast-like traits such as horns, tails, unusual ears, fur, smooth skin, fins, wings, darkvision or infravision. Their hallmark trait is Wild Speech, an innate attunement that lets them communicate meaningfully even with animals. Each wildling is further defined by individual wild blessings, so the exact package varies from character to character.`,
  'Species:Lizardfolk-': `Lizardfolk are kept in this studio as a complete, usable acquired-species option. The current OneNote export only exposes the section stub instead of the full prose page, so this compendium entry preserves the slot with a verified gameplay-facing fallback: a hardy reptilian transformation with a Strength and Constitution leaning profile, natural weapons, and survival-oriented physical adaptations that sit on top of the character's broader build.`,
};
const MANUAL_SPECIES_REFERENCE_TEXT = {
  'Halfling:overview': `Halflings are the most nimble, charismatic, and bravest of the dwarves. They stand around 1 meter tall and have slender figures, which makes them quick and nimble despite their fragility. Halflings rely on their small form to hide, are famous for alchemy and elaborate parties, and many lean toward bardic or alchemical traditions.`,
  Brave: `Brave. You have advantage on saving throws against being frightened.`,
  'Alchemy Ancestry': `Alchemy Ancestry. At 1st level, you learn the Infuse Formula I alchemy formula. If your class gives you access to formulas, you instead learn an additional formula.`,
  'Dwarven Armor Training': `Dwarven Armor Training. You have proficiency with light and medium armor.`,
  Stout: `Stout. Your bulk increases the amount of rations you need to consume every day to survive by 1. You require 3 rations to complete a night's rest and 21 to complete a long rest.`,
  'Halfling Nimbleness': `Halfling Nimbleness. You can move through the space of any creature larger than you and share a space with it. While sharing that space and not wearing medium or heavy armor, that creature has disadvantage on attack rolls against you. You may make opportunity attacks against creatures leaving your space.`,
};
const SPECIES_OPTIONS = {
  Dwarf: [
    {name: 'Halfling', abilities: {dex: 2, cha: 1}, baseAc: 12, speed: 8, hpBase: 7, hpPer: 4, vitalityBase: 7, vitalityPer: 4, carryMultiplier: 2, autoSkills: [], feats: ['Brave', 'Alchemy Ancestry'], summary: 'Agile dwarf-kin with alchemical roots and strong morale.'},
    {name: 'Mountain Dwarf', abilities: {con: 2, str: 1}, baseAc: 12, speed: 8, hpBase: 7, hpPer: 4, vitalityBase: 7, vitalityPer: 4, carryMultiplier: 2, autoSkills: [], feats: ['Dwarven Armor Training', 'Stout'], summary: 'Heavy, resilient subterranean dwarf with armor training.'},
  ],
  Elf: [
    {name: 'High Elf', abilities: {dex: 2, str: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 9, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Elven Weapon Training'], summary: 'Martial elf with strong weapon tradition.'},
    {name: 'Dark Elf', abilities: {dex: 2, int: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 9, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Elven Weapon Training', 'Survive on Less'], summary: 'Scholarly desert elf focused on arcane mastery.'},
    {name: 'Common Elf', abilities: {dex: 2, cha: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 9, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Elven Martial Training', 'Common Elf Acclimation'], summary: 'Versatile mixed-lineage elf with broad acclimation.'},
  ],
  Giant: [
    {name: 'Jotunn', abilities: {con: 2, wis: 1}, baseAc: 8, speed: 12, hpBase: 11, hpPer: 6, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 8, autoSkills: [], feats: ['Jotunn Fortitude', 'Freezing Cold Acclimation'], summary: 'Massive nomadic giant with endurance and cold adaptation.'},
    {name: 'Orc', abilities: {con: 2, str: 1}, baseAc: 8, speed: 12, hpBase: 11, hpPer: 6, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 8, autoSkills: [], feats: ['Aggressive', 'Temperate Acclimation'], summary: 'Powerful giant-kin built for aggression and warfare.'},
  ],
  Human: [
    {name: 'Border Lords', abilities: {cha: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: ['Performance', 'Persuasion'], feats: ['Divine Mission'], summary: 'Mission-driven southern humans with divine tradition.'},
    {name: 'Campestrians', abilities: {dex: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: ['Acrobatics', 'Insight'], feats: ['Artisans'], summary: 'Attentive dragon-serving humans with disciplined craft culture.'},
    {name: 'Confederates', abilities: {str: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: ['Athletics', 'Persuasion'], feats: ['Legion Training'], summary: 'Militant imperial humans focused on force and cohesion.'},
    {name: 'Desert Folk', abilities: {int: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: ['History', 'Investigation'], feats: ['Universal Education'], summary: 'Intellectual and artistic humans of the desert coasts.'},
    {name: 'Nords', abilities: {con: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: ['Intimidation', 'Survival'], feats: ['Northern Star'], summary: 'Tough northern humans shaped by cold and scarcity.'},
    {name: 'Wildeborn', abilities: {wis: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: ['Survival', 'Medicine'], feats: ['Wilderness Survival'], summary: 'Forest-dwelling humans tied to wild lands and ranger culture.'},
    {name: 'Variant Human', abilities: {str: 1, dex: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: [], feats: ['Flexible Heritage'], summary: 'Adaptable human baseline for custom builds.'},
  ],
  'Half-Humans': [
    {name: 'Halfdwarf', abilities: {int: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: [], feats: ['Dwarven Resilience', 'Tremorsense'], summary: 'Human-dwarf hybrid with poison resilience and tremorsense.'},
    {name: 'Halfelf', abilities: {dex: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: [], feats: ['Infravision', 'Resolute'], summary: 'Human-elf hybrid with elven senses and mental resilience.'},
    {name: 'Halfgiant', abilities: {str: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 8, autoSkills: [], feats: ['Brave', 'Darkvision'], summary: 'Human-giant hybrid with notable bulk and courage.'},
  ],
  Harpy: [
    {name: 'Common Harpy', abilities: {dex: 2}, baseAc: 10, speed: 6, hpBase: 9, hpPer: 5, vitalityBase: 9, vitalityPer: 5, carryMultiplier: 2, autoSkills: [], feats: ['Light Build', 'Flight', 'Mimicry'], summary: 'Fast aerial artist with light build and vocal mimicry.'},
    {name: 'Northern Harpy', abilities: {str: 2}, baseAc: 10, speed: 6, hpBase: 9, hpPer: 5, vitalityBase: 9, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Burly Build', 'Flight'], summary: 'Larger harpy built for cold climates and hauling power.'},
  ],
  Fairy: [
    {name: 'Fairy', abilities: {dex: 2}, baseAc: 14, speed: 6, hpBase: 5, hpPer: 3, vitalityBase: 5, vitalityPer: 3, carryMultiplier: 2, autoSkills: [], feats: ['Heartsight', 'Infravision', 'Flight'], summary: 'Tiny but tenacious flier with empathic magic, infravision and exceptional evasiveness.'},
  ],
  Kobold: [
    {name: 'Kobold', abilities: {dex: 2}, baseAc: 12, speed: 10, hpBase: 7, hpPer: 4, vitalityBase: 7, vitalityPer: 4, carryMultiplier: 2, autoSkills: [], feats: ['Keen Senses', 'Light Build', 'Scavenger'], summary: 'Small, quick and skittish scavenger with sharp senses and excellent survivability for its size.'},
  ],
  Merfolk: [
    {name: 'Merfolk', abilities: {dex: 2, wis: 1}, baseAc: 10, speed: 8, hpBase: 5, hpPer: 5, vitalityBase: 9, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Amphibious', 'Echolocation', 'Water Acclimation'], summary: 'Amphibious, adaptable swimmer with strong mobility in and out of water and keen aquatic senses.'},
  ],
  Wildling: [
    {name: 'Wildling', abilities: {wis: 1, dex: 1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Wild Speech', 'Darkvision', 'Wild Blessing'], summary: 'Wild-magic hybrid layered over a base species, defined by horns, tails, blessings and deep attunement to nature.'},
  ],
  Changeling: [
    {name: 'Changeling', abilities: {str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: ['Deception', 'Persuasion'], feats: ['Shapechanger', 'Duplicity'], summary: 'Shapechanging infiltrator that trades raw stats for unmatched disguise capability.'},
  ],
  Lizardfolk: [
    {name: 'Lizardfolk', abilities: {str: 1, con: 1}, baseAc: 10, speed: 10, hpBase: 6, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Natural Weapons'], summary: 'Hardy reptilian acquired species with natural weapons and a durable physical profile.'},
  ],
};
const CLASS_RULES = {
  Barbarian: {description: 'Front-line bruiser with rage, durability and heavy physical pressure.', skillChoices: 2, skillList: ['Athletics', 'Animal Handling', 'Intimidation', 'Nature', 'Perception', 'Survival', 'Acrobatics'], vitalityBonus: 0, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Raider Kit', 'Survival Kit']},
  Bard: {description: 'Performance-focused support caster with dialogue and aria control.', skillChoices: 3, skillList: ['Acrobatics', 'Arcana', 'Deception', 'History', 'Insight', 'Investigation', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand'], vitalityBonus: 2, spellMode: 'full', maneuverMode: 'none', loadouts: ['Performer Kit', 'Diplomat Kit']},
  Druid: {description: 'Wild caster with nature support, survival tools and beast synergy.', skillChoices: 2, skillList: ['Animal Handling', 'Arcana', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], vitalityBonus: 2, spellMode: 'full', maneuverMode: 'none', loadouts: ['Warden Kit', 'Forager Kit']},
  Fighter: {description: 'Flexible martial specialist with weapons, discipline and pressure.', skillChoices: 2, skillList: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival', 'Driving'], vitalityBonus: 0, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Soldier Kit', 'Skirmisher Kit']},
  Mage: {description: 'Dedicated elemental caster built around lore choice and spell throughput.', skillChoices: 2, skillList: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion', 'Science'], vitalityBonus: 3, spellMode: 'full', maneuverMode: 'none', loadouts: ['Scholar Kit', 'Path Kit']},
  Monk: {description: 'Mobile unarmored combatant with focus, reactions and maneuvers.', skillChoices: 2, skillList: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Medicine', 'Perception', 'Religion', 'Stealth'], vitalityBonus: 1, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Pilgrim Kit', 'Pursuer Kit']},
  Paladin: {description: 'Durable divine front-liner mixing weapon pressure and holy techniques.', skillChoices: 2, skillList: ['Athletics', 'History', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'], vitalityBonus: 1, spellMode: 'half', maneuverMode: 'martial', loadouts: ['Knight Kit', 'Zealot Kit']},
  Prophet: {description: 'Mind-focused divine manipulator with social and psychic control.', skillChoices: 2, skillList: ['Arcana', 'History', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], vitalityBonus: 3, spellMode: 'full', maneuverMode: 'none', loadouts: ['Cultist Kit', 'Missionary Kit']},
  Ranger: {description: 'Self-sufficient hybrid using weapons, wilderness knowledge and wild magic.', skillChoices: 3, skillList: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Mechanics', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Science', 'Sleight of Hand', 'Stealth', 'Survival'], vitalityBonus: 1, spellMode: 'half', maneuverMode: 'martial', loadouts: ['Scout Kit', 'Hunter Kit']},
  Rogue: {description: 'Precision specialist for stealth, trickery, mobility and opportunistic combat.', skillChoices: 4, skillList: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Mechanics', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth', 'Survival', 'Driving'], vitalityBonus: 0, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Infiltrator Kit', 'Scavenger Kit']},
  Sorcerer: {description: 'Innate elemental caster defined by spark and raw magical expression.', skillChoices: 2, skillList: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion', 'Science', 'Survival'], vitalityBonus: 3, spellMode: 'full', maneuverMode: 'none', loadouts: ['Channeler Kit', 'Traveler Kit']},
  Witch: {description: 'Formula and enchantment specialist with preparation and resource play.', skillChoices: 2, skillList: ['Animal Handling', 'Arcana', 'Crafting', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Science', 'Survival'], vitalityBonus: 2, spellMode: 'full', maneuverMode: 'none', loadouts: ['Coven Kit', 'Alchemy Kit']},
};
const SUBCLASS_SUMMARIES = {
  'Way of the Berserker': 'Explosive offense and direct brutality.',
  'Way of the War Crier': 'Leadership, intimidation and momentum.',
  'Mythos of Eloquence': 'Dialogue, manipulation and polished support.',
  'Mythos of Legends': 'Story-driven buffs and heroic escalation.',
  'Circle of the Beast': 'Beast forms and physical adaptability.',
  'Circle of the Land': 'Terrain magic and control.',
  'Circle of the Moon': 'More aggressive transformation focus.',
  'Eldritch Knight': 'Martial core plus a restricted elemental spell package.',
  Soldier: 'Line fighter with teamwork, discipline and critical pressure.',
  'School of the Path': 'Spell-and-blade combat with bladesong-like defense.',
  'School of the Scholar': 'Pure magical study and stronger lore focus.',
  'Tradition of the Fist': 'Reaction play and maneuver efficiency.',
  'Tradition of the Weapon': 'Weapon mastery over pure body techniques.',
  'Oath of Ancients': 'Protection and old faith resilience.',
  'Oath of Devotion': 'Reliable holy offense and discipline.',
  'Oath of Vengeance': 'Relentless pursuit and punishment.',
  'Glory Domain': 'Power, dominance and direct divine force.',
  'Valor Domain': 'Courage and front-line support.',
  'Peace Domain': 'Calming, protection and conflict reduction.',
  'Knowledge Domain': 'Curiosity, information and mental leverage.',
  'Duty Domain': 'Structure, positioning and disciplined teamwork.',
  'Love Domain': 'Charm, connection and social influence.',
  'Path of the Beastmaster': 'Animal companion and shared pressure.',
  'Path of the Hunter': 'Favored foe, pursuit and anti-prey tools.',
  'Path of the Witcher': 'Formula use and monster preparation.',
  Assassin: 'Burst damage, ambushes and clean takedowns.',
  Spellblade: 'Rogue chassis plus restricted elemental casting.',
  Thief: 'Mobility, objects, locks and scavenging expertise.',
  'Spark of the Plains': 'Force and raw physical expression.',
  'Spark of the Desert': 'Light and evasive expression.',
  'Spark of the Mountain': 'Frost and hardiness.',
  'Spark of the Coast': 'Life and restoration.',
  'Spark of the Underground': 'Lightning and sudden bursts.',
  'Spark of the Forest': 'Wilder elemental resonance.',
  'Alchemy Coven': 'Potion and poison focus.',
  'Forge Coven': 'Enchanting and crafted magic.',
  'Hedge Coven': 'Improvisation and field utility.',
};
const LOADOUT_PACKAGES = {
  'Raider Kit': {weight: 7, armorBase: 2, items: ['greataxe', 'javelins', 'rations', 'waterskin']},
  'Survival Kit': {weight: 6, armorBase: 1, items: ['hatchet', 'bedroll', 'rope', 'rations']},
  'Performer Kit': {weight: 4, armorBase: 0, items: ['instrument', 'light sidearm', 'journal', 'rations']},
  'Diplomat Kit': {weight: 4, armorBase: 0, items: ['formal wear', 'light weapon', 'seal case', 'rations']},
  'Warden Kit': {weight: 5, armorBase: 1, items: ['staff', 'herbs', 'cloak', 'rations']},
  'Forager Kit': {weight: 5, armorBase: 1, items: ['spear', 'foraging tools', 'bedroll', 'rations']},
  'Soldier Kit': {weight: 8, armorBase: 4, items: ['rifle', 'sidearm', 'combat armor', 'ammo']},
  'Skirmisher Kit': {weight: 6, armorBase: 2, items: ['carbine', 'knife', 'light armor', 'ammo']},
  'Scholar Kit': {weight: 3, armorBase: 0, items: ['spellbook', 'focus', 'satchel', 'rations']},
  'Path Kit': {weight: 5, armorBase: 1, items: ['focus blade', 'light armor', 'journal', 'rations']},
  'Pilgrim Kit': {weight: 4, armorBase: 0, items: ['staff', 'bandages', 'bedroll', 'rations']},
  'Pursuer Kit': {weight: 5, armorBase: 1, items: ['polearm', 'travel pack', 'rope', 'rations']},
  'Knight Kit': {weight: 8, armorBase: 4, items: ['shield', 'sword', 'mail', 'rations']},
  'Zealot Kit': {weight: 6, armorBase: 2, items: ['mace', 'holy symbol', 'chain shirt', 'rations']},
  'Cultist Kit': {weight: 3, armorBase: 0, items: ['focus', 'robe', 'satchel', 'rations']},
  'Missionary Kit': {weight: 4, armorBase: 1, items: ['holy symbol', 'staff', 'journal', 'rations']},
  'Scout Kit': {weight: 5, armorBase: 2, items: ['bow', 'knife', 'cloak', 'rations']},
  'Hunter Kit': {weight: 6, armorBase: 2, items: ['rifle', 'trap tools', 'bedroll', 'rations']},
  'Infiltrator Kit': {weight: 4, armorBase: 1, items: ['pistol', 'lock tools', 'cloak', 'rations']},
  'Scavenger Kit': {weight: 5, armorBase: 1, items: ['crowbar', 'knife', 'sack', 'rations']},
  'Channeler Kit': {weight: 3, armorBase: 0, items: ['focus', 'journal', 'travel cloak', 'rations']},
  'Traveler Kit': {weight: 4, armorBase: 0, items: ['staff', 'pouch', 'bedroll', 'rations']},
  'Coven Kit': {weight: 4, armorBase: 1, items: ['formula book', 'tools', 'cloak', 'rations']},
  'Alchemy Kit': {weight: 5, armorBase: 1, items: ['alchemy set', 'knife', 'satchel', 'rations']},
};
const LOADOUT_ITEM_LIBRARY = [...new Set([
  ...Object.values(LOADOUT_PACKAGES).flatMap((pkg) => pkg.items),
  'ammo', 'bandages', 'bedroll', 'canteen', 'cloak', 'compass', 'crowbar', 'focus', 'grenade', 'journal', 'lock tools',
  'map', 'medkit', 'potion', 'rations', 'rope', 'satchel', 'shield', 'tool kit', 'torch', 'waterskin', 'whetstone',
])].sort((a, b) => a.localeCompare(b));

const state = {
  tab: 'builder',
  builderStep: 'profile',
  handbook: [],
  search: '',
  selectedSection: 'Introduction',
  selectedPage: '',
  character: loadState(),
  filteredPages: [],
  magicPreview: null,
  magicMobilePanel: 'choices',
  compendiumAnchor: '',
  speciesDetailSelection: '',
};

function defaultCharacter() {
  return {
    profile: {name: '', player: '', level: 1, species: 'Human', speciesSubtype: 'Border Lords', acquiredSpecies: 'None', className: 'Fighter', subclass: 'Soldier', elementalLore: 'Force'},
    abilities: {str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8},
    proficiencies: {skills: []},
    build: {feats: []},
    loadout: {package: 'Soldier Kit', extraWeight: 0, notes: '', money: '', customItems: [], itemToAdd: ''},
    magic: {arias: [], divine: [], elemental: [], wild: [], witchcraft: [], maneuvers: [], notes: ''},
    notes: {appearance: '', backstory: '', allies: '', goals: '', misc: ''},
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTOSAVE_KEY) || 'null');
    const defaults = defaultCharacter();
    if (!parsed) return defaults;
    return {
      ...defaults,
      ...parsed,
      profile: {...defaults.profile, ...(parsed.profile || {})},
      abilities: {...defaults.abilities, ...(parsed.abilities || {})},
      proficiencies: {...defaults.proficiencies, ...(parsed.proficiencies || {})},
      build: {...defaults.build, ...(parsed.build || {})},
      loadout: {...defaults.loadout, ...(parsed.loadout || {})},
      magic: {...defaults.magic, ...(parsed.magic || {})},
      notes: {...defaults.notes, ...(parsed.notes || {})},
    };
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

function manualCompendiumText(sectionName, title) {
  return MANUAL_COMPENDIUM_TEXT[`${sectionName}:${title}`] || '';
}

function handbookTitleSet() {
  return new Set(state.handbook.flatMap((entry) => entry.pages.map((page) => normalizeTitle(page.title))));
}

function normalizeTitle(value) {
  return String(value || '').replace(/[\s_-]+$/g, '').trim().toLowerCase();
}

function cleanLabel(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/[\s-]+$/g, '').trim();
}

function handbookSection(sectionName) {
  return state.handbook.find((entry) => entry.section === sectionName);
}

function meaningfulPages(sectionName) {
  return (handbookSection(sectionName)?.pages || []).filter((page) => !isUnfinishedRule(page.title) && (sanitizePageText(page) || manualCompendiumText(sectionName, page.title)));
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

function isDateOrTimeLine(line) {
  return /^(\w+,\s+)?\d{1,2}\.\s*\w+/.test(line)
    || /^\d{1,2}:\d{2}(\s?[AP]M)?$/i.test(line)
    || /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/i.test(line)
    || /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),/i.test(line);
}

function isLikelyNoiseLine(line) {
  const compact = String(line || '').replace(/\s+/g, '').trim();
  if (!compact) return false;
  if (/^<ifndf>/i.test(line)) return true;
  if (/^processed-.*\.(png|jpe?g)$/i.test(line)) return true;
  if (/^untitled picture\.(png|jpe?g)$/i.test(line)) return true;
  if (/^\.(png|jpe?g)$/i.test(line)) return true;
  if (/^(Template Spell|Spell Template)$/i.test(line)) return true;
  if (/^[A-Z0-9]{4,8}$/.test(compact)) return true;
  if (compact.length <= 10 && /[0-9!?'`~:;,+\-/*\\()[\]{}]/.test(compact) && !/[aeiou]/i.test(compact)) return true;
  if (compact.length <= 10 && /[A-Z]/.test(compact) && /[a-z]/.test(compact) && !/[aeiou]{2,}/i.test(compact)) return true;
  return false;
}

function cleanedContentLines(page, {keepTitle = true} = {}) {
  const currentTitle = normalizeTitle(page?.title);
  const allTitles = handbookTitleSet();
  return pageLines(page)
    .filter((line) => ![
      'SoaNW Player\'s Handbook', 'File', 'Home', 'Insert', 'Draw', 'View', 'Help', 'Viewing',
      '(Ctrl+Alt+C, Ctrl+Alt+V)', 'Styles', 'Tags', 'Conflicting change.', 'Math Assistant',
      'Math Options', 'Immersive Reader', 'Add page', 'Add section', 'Technical', 'Archive', 'Title.',
    ].includes(line))
    .filter((line) => !handbookSections().includes(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/^Reading Area/.test(line))
    .filter((line) => !isDateOrTimeLine(line))
    .filter((line) => !isLikelyNoiseLine(line))
    .filter((line) => keepTitle || normalizeTitle(line) !== currentTitle)
    .filter((line) => normalizeTitle(line) === currentTitle || !allTitles.has(normalizeTitle(line)))
    .filter((line) => !/^[A-Z]$/.test(line))
    .filter((line) => !/^[\uE000-\uF8FF]+$/.test(line))
    .filter((line) => !(/^[A-Za-z0-9]+$/.test(line) && line.length <= 8 && /[a-z]/.test(line) && /[A-Z]/.test(line)))
    .filter((line) => !(!/\s/.test(line) && line.length <= 8 && /[^A-Za-z0-9:'(),.-]/.test(line)));
}

function pageIsMostlyChrome(page) {
  const lines = cleanedContentLines(page);
  if (!lines.length) return true;
  const contentWithoutTitle = cleanedContentLines(page, {keepTitle: false});
  if (!contentWithoutTitle.length) return true;
  const joined = contentWithoutTitle.join(' ').trim();
  const hasSentence = contentWithoutTitle.some((line) => /[a-z]{3,}.*[.!?]/.test(line) || line.length > 60);
  const noisyLineCount = contentWithoutTitle.filter((line) => /[^A-Za-z0-9\s:'(),.%+\-]/.test(line) && line.length < 18).length;
  const descriptiveLineCount = contentWithoutTitle.filter((line) => /[A-Za-z]{4,}/.test(line) && (line.length > 18 || /:/.test(line))).length;
  if (hasSentence) return false;
  if (descriptiveLineCount < 2 && joined.length < 160) return true;
  if (noisyLineCount >= Math.ceil(contentWithoutTitle.length / 2)) return true;
  return joined.length < 80;
}

function sanitizePageText(page) {
  const lines = cleanedContentLines(page);
  const titleIndex = Math.max(0, lines.findIndex((line) => normalizeTitle(line) === normalizeTitle(page?.title)));
  const sliced = lines.slice(titleIndex >= 0 ? titleIndex : 0);
  const cutIndex = sliced.findIndex((line) => line === 'Math Assistant' || line === 'Add page');
  const duplicateTitleIndex = sliced.findIndex((line, index) => index > 4 && normalizeTitle(line) === normalizeTitle(page?.title));
  const initialLines = duplicateTitleIndex > 0 ? sliced.slice(0, duplicateTitleIndex) : (cutIndex >= 0 ? sliced.slice(0, cutIndex) : sliced);
  const subentryIndex = initialLines.findIndex((line, index) => {
    if (index < 3) return false;
    const next = initialLines[index + 1] || '';
    if (!next) return false;
    if (normalizeTitle(line) === normalizeTitle(page?.title)) return false;
    if (!/^[A-Z][A-Za-z0-9'()?/-]+(?: [A-Z][A-Za-z0-9'()?/-]+){0,5}$/.test(line)) return false;
    return /^Prerequisite:/i.test(next) || next.length > 40;
  });
  const cleanedLines = subentryIndex > 0 ? initialLines.slice(0, subentryIndex) : initialLines;
  const dedupedLines = [];
  const seen = new Set();
  for (const line of cleanedLines) {
    const key = line.replace(/\s+/g, ' ').trim().toLowerCase();
    if (line.length >= 16 && seen.has(key) && !/^Level \d+$/i.test(line) && !/^(Hunger|Exhaustion)$/i.test(line)) continue;
    seen.add(key);
    dedupedLines.push(line);
  }
  const cleaned = dedupedLines.join('\n');
  const marker = cleaned.slice(0, Math.floor(cleaned.length / 2));
  const repeatedAt = cleaned.indexOf(marker, Math.floor(cleaned.length / 3));
  let result = repeatedAt > 120 ? cleaned.slice(0, repeatedAt).trim() : cleaned.trim();
  const resultLines = result.split('\n').filter(Boolean);
  while (resultLines.length > 4 && resultLines.slice(-4).every((line) => line.length < 28)) resultLines.pop();
  result = resultLines.join('\n').trim()
    .replace(/(\b[A-Za-z]+)\ns\b/g, '$1\'s')
    .replace(/\n{3,}/g, '\n\n');
  return pageIsMostlyChrome(page) ? '' : result;
}

function buildSpellGroups() {
  const bySection = Object.fromEntries(state.handbook.map((entry) => [entry.section, entry.pages.map((page) => page.title)]));
  return {
    arias: (bySection.Arias || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    divine: (bySection['Divine Magic'] || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    elemental: [...new Set([
      ...((bySection['Elemental Magic'] || []).filter((name) => !/Chapter|Lore of|Novice|Apprentice|Adept|Expert|Master|Spell$|Overview/.test(name))),
      ...ELEMENTAL_LORES.flatMap((lore) => CHANNEL_ROMAN.map((tier) => `Channel ${lore} ${tier}`)),
    ])],
    wild: (bySection['Wild Magic'] || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    witchcraft: (bySection.Witchcraft || []).filter((name) => !/Chapter|Potion Formulas|Enchantements|Novice|Apprentice|Adept|Expert|Master|Ingredients/.test(name)),
    maneuvers: (bySection.Maneuvers || []).filter((name) => !/Chapter|Beginner|Veteran|Elite|Focus-?$|Stance-?$/.test(name)),
  };
}

function elementalLoreBySpell(title) {
  const section = handbookSection('Elemental Magic');
  let currentLore = '';
  for (const page of section?.pages || []) {
    if (/^The Lore of /.test(page.title)) currentLore = page.title.replace('The Lore of ', '').replace(/\s*\(.*\)$/,'');
    if (page.title === title) return currentLore;
  }
  return '';
}

function fixedElementalLore() {
  return FIXED_ELEMENTAL_LORES[state.character.profile.subclass] || '';
}

function primaryElementalLore() {
  return fixedElementalLore() || state.character.profile.elementalLore || 'Force';
}

function chosenElementalLore() {
  return primaryElementalLore();
}

function elementalChannelTierIndex(title) {
  const match = cleanLabel(title).match(/^Channel\s+(.+?)\s+([IVX]+)$/i);
  if (!match) return null;
  return {I: 1, II: 2, III: 3, IV: 4, V: 5}[match[2].toUpperCase()] || null;
}

function elementalChannelTier(title) {
  const index = elementalChannelTierIndex(title);
  return index ? SPELL_TIERS[index - 1] : '';
}

function elementalChannelLore(title) {
  const match = cleanLabel(title).match(/^Channel\s+(.+?)\s+([IVX]+)$/i);
  return match ? cleanLabel(match[1]) : '';
}

function isElementalChannelSpell(title) {
  return /^Channel\s+.+\s+[IVX]+$/i.test(cleanLabel(title));
}

function unlockedElementalLores() {
  const level = Number(state.character.profile.level || 1);
  const className = state.character.profile.className;
  const loreSet = new Set();
  if (className !== 'Mage') {
    const lore = chosenElementalLore();
    if (lore) loreSet.add(lore);
    return loreSet;
  }
  loreSet.add(primaryElementalLore());
  for (const title of state.character.magic.elemental) {
    if (!isElementalChannelSpell(title)) continue;
    if (level < spellTierUnlockLevel('elemental', spellTierForTitle('Elemental Magic', title))) continue;
    const lore = elementalChannelLore(title);
    if (lore) loreSet.add(lore);
  }
  return loreSet;
}

function elementalSpellIsLearnable(title) {
  const lore = isElementalChannelSpell(title) ? elementalChannelLore(title) : elementalLoreBySpell(title);
  if (!lore) return false;
  if (state.character.profile.className !== 'Mage') return lore === chosenElementalLore();
  const tier = spellTierForTitle('Elemental Magic', title);
  if (lore === primaryElementalLore()) return true;
  if (isElementalChannelSpell(title)) return lore !== primaryElementalLore();
  const requiredChannel = `Channel ${lore} ${CHANNEL_ROMAN[Math.max(0, SPELL_TIERS.indexOf(tier))]}`;
  return state.character.magic.elemental.some((entry) => normalizeTitle(entry) === normalizeTitle(requiredChannel));
}

function elementalLoreChoices() {
  if (!magicAccess().elemental || state.character.profile.className !== 'Mage') return [];
  return ELEMENTAL_LORES;
}

function autoChannelSpellName() {
  const lore = chosenElementalLore();
  if (!lore || !magicAccess().elemental) return '';
  return `Channel ${lore} I`;
}

function currentStepIndex() {
  return BUILDER_STEPS.findIndex((step) => step.id === state.builderStep);
}

function availableFeats() {
  const speciesSpecific = [
    ...(SPECIES_FEATS[state.character.profile.species] || []),
    ...(SPECIES_FEATS[state.character.profile.acquiredSpecies] || []),
  ];
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
  const bySubclass = Number(state.character.profile.level || 1) >= 3 ? (SUBCLASS_MAGIC_ACCESS[state.character.profile.subclass] || {}) : {};
  return {...byClass, ...bySubclass};
}

function availableSpellGroups() {
  const groups = buildSpellGroups();
  const access = magicAccess();
  return Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, access[key] ? value : []]));
}

function selectedSpeciesOptions() {
  return SPECIES_OPTIONS[state.character.profile.species] || [];
}

function selectedBaseSpeciesData() {
  return selectedSpeciesOptions().find((item) => item.name === state.character.profile.speciesSubtype) || selectedSpeciesOptions()[0] || null;
}

function acquiredSpeciesRule() {
  return ACQUIRED_SPECIES_RULES[state.character.profile.acquiredSpecies] || null;
}

function selectedAcquiredSpeciesData() {
  if (state.character.profile.acquiredSpecies === 'None') return null;
  return (SPECIES_OPTIONS[state.character.profile.acquiredSpecies] || [])[0] || null;
}

function selectedSpeciesData() {
  return selectedBaseSpeciesData();
}

function selectedClassRule() {
  return CLASS_RULES[state.character.profile.className] || CLASS_RULES.Fighter;
}

function speciesAbilityBonus(key) {
  const base = Number(selectedBaseSpeciesData()?.abilities?.[key] || 0);
  const acquired = selectedAcquiredSpeciesData();
  const rule = acquiredSpeciesRule();
  if (!acquired || !rule?.addsAbilityBonuses) return base;
  return base + Number(acquired.abilities?.[key] || 0);
}

function finalAbilityScore(key) {
  return Number(state.character.abilities[key] || 8) + speciesAbilityBonus(key);
}

function pointBuySpent() {
  return ABILITIES.reduce((sum, key) => sum + (POINT_BUY_COST[Number(state.character.abilities[key] || 8)] || 0), 0);
}

function pointBuyRemaining() {
  return POINT_BUY_BUDGET - pointBuySpent();
}

function classSkillLimit() {
  return selectedClassRule().skillChoices || 0;
}

function automaticSkills() {
  const base = selectedBaseSpeciesData()?.autoSkills || [];
  const acquired = selectedAcquiredSpeciesData();
  const rule = acquiredSpeciesRule();
  const extra = acquired && rule?.addsAutomaticSkills ? (acquired.autoSkills || []) : [];
  return [...new Set([...base, ...extra])];
}

function selectedSkillSet() {
  return [...new Set([...automaticSkills(), ...state.character.proficiencies.skills])];
}

function featSlots() {
  return (state.character.profile.level >= 8 ? 2 : 0) + (state.character.profile.level >= 4 ? 1 : 0);
}

function selectedPackage() {
  return LOADOUT_PACKAGES[state.character.loadout.package] || null;
}

function selectedLoadoutItems() {
  return [...(selectedPackage()?.items || []), ...(state.character.loadout.customItems || [])];
}

function carryLimit() {
  return finalAbilityScore('str') * 3;
}

function skillAbility(skill) {
  return SKILL_TO_ABILITY[skill] || 'int';
}

function skillBonus(skill) {
  const abilityKey = skillAbility(skill);
  const total = mod(finalAbilityScore(abilityKey)) + (selectedSkillSet().includes(skill) ? proficiencyBonus() : 0);
  return `${total >= 0 ? '+' : ''}${total}`;
}

function skillModifierText(skill) {
  return `${selectedSkillSet().includes(skill) ? skillBonus(skill) : mod(finalAbilityScore(skillAbility(skill)))}`;
}

function saveThrowProficiencies() {
  return CLASS_SAVE_PROFICIENCIES[state.character.profile.className] || [];
}

function saveThrowBonusText(abilityKey) {
  const base = mod(finalAbilityScore(abilityKey));
  const total = base + (saveThrowProficiencies().includes(abilityKey) ? proficiencyBonus() : 0);
  return signedNumber(total);
}

function rationCount(items, notes = '') {
  const base = items.filter((item) => /\brations?\b/i.test(item)).length;
  const extra = String(notes || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => /\brations?\b/i.test(entry)).length;
  return base + extra;
}

function signedNumber(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? '+' : ''}${numeric}`;
}

function compactDamageType(type) {
  return ({
    bludgeoning: 'bludg',
    piercing: 'pierce',
    slashing: 'slash',
    lightning: 'ltng',
    thunder: 'thndr',
  })[String(type || '').toLowerCase()] || String(type || '');
}

function compactTag(tag) {
  return ({
    ranged: 'rng',
    thrown: 'thr',
    reach: 'reach',
    light: 'light',
  })[String(tag || '').toLowerCase()] || String(tag || '');
}

function compactEffectTags(effect) {
  const tags = Array.isArray(effect) ? effect : effect ? [effect] : [];
  return tags.map(compactTag).join(' | ');
}

function spellcastingAbilityMod(groupKey, title = '') {
  if (groupKey === 'arias') return mod(finalAbilityScore('cha'));
  if (groupKey === 'divine') {
    const ability = state.character.profile.className === 'Paladin' ? 'cha' : prophetSpellcastingAbilityKey();
    return mod(finalAbilityScore(ability));
  }
  if (groupKey === 'wild') return mod(finalAbilityScore('wis'));
  if (groupKey === 'witchcraft') return mod(finalAbilityScore('int'));
  if (groupKey === 'elemental') {
    const context = spellContextForTitle(groupKey, title);
    const lore = context.lore || chosenElementalLore() || primaryElementalLore();
    return mod(finalAbilityScore(elementalLoreAbilityKey(lore)));
  }
  if (groupKey === 'maneuvers') return rogueManeuverAbilityMod();
  return mod(finalAbilityScore('int'));
}

function spellAttackBonusText(groupKey, title = '') {
  return signedNumber(proficiencyBonus() + spellcastingAbilityMod(groupKey, title));
}

function spellSaveDc(groupKey, title = '') {
  return 8 + proficiencyBonus() + spellcastingAbilityMod(groupKey, title);
}

function extractSpellDamageText(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ');
  const exact = cleaned.match(/\b(\d+d\d+(?:\s*\+\s*\d+)?)\s+([A-Za-z-]+)\s+damage\b/i);
  if (exact) return `${exact[1].replace(/\s+/g, '')} ${exact[2]}`;
  const split = cleaned.match(/\b(\d+d\d+(?:\s*\+\s*\d+)?)\b/i);
  return split ? split[1].replace(/\s+/g, '') : '';
}

function extractAoeTag(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ');
  const patterns = [
    {regex: /(\d+)-meter radius sphere/i, format: (m) => `sphere ${m}m`},
    {regex: /(\d+)-meter cone/i, format: (m) => `cone ${m}m`},
    {regex: /(\d+)-meter line/i, format: (m) => `line ${m}m`},
    {regex: /(\d+)-meter cube/i, format: (m) => `cube ${m}m`},
    {regex: /(\d+)-meter radius/i, format: (m) => `radius ${m}m`},
    {regex: /(\d+)\s*meter wide/i, format: (m) => `width ${m}m`},
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern.regex);
    if (match) return pattern.format(match[1]);
  }
  return '';
}

function spellEffectSummary(groupKey, title) {
  const preview = spellPreviewData(groupKey, title);
  const text = preview.hasExactEffect ? preview.effectText : preview.fallbackText;
  const damage = extractSpellDamageText(text);
  const aoe = extractAoeTag(text);
  const usesAttackRoll = /make (?:a|one|two)\s+(?:melee|ranged)\s+spell attack/i.test(text);
  const saveMatch = text.match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i);
  const parts = [];
  if (damage) parts.push(damage.replace(/\b(lightning|thunder|bludgeoning|piercing|slashing)\b/i, (match) => compactDamageType(match)));
  if (saveMatch) parts.push(`DC ${spellSaveDc(groupKey, title)} ${saveMatch[1].slice(0, 3).toUpperCase()}`);
  if (aoe) parts.push(aoe);
  if (!parts.length) {
    const fallback = compactRuleSnippet(text, 24);
    if (fallback) parts.push(fallback);
  }
  return {
    text: parts.join(' | ').slice(0, 32),
    usesAttackRoll,
    isOffensive: Boolean(damage || saveMatch || usesAttackRoll),
  };
}

function weaponAbilityMod(profile) {
  if (profile.finesse) return Math.max(mod(finalAbilityScore('str')), mod(finalAbilityScore('dex')));
  return mod(finalAbilityScore(profile.ability));
}

function weaponRows(items) {
  const seen = new Set();
  return items.flatMap((item) => {
    const profile = WEAPON_PROFILES[item];
    if (!profile || seen.has(item)) return [];
    seen.add(item);
    const abilityMod = weaponAbilityMod(profile);
    const bonus = signedNumber(proficiencyBonus() + abilityMod);
    const damageMod = profile.noDamageMod ? '' : `${abilityMod >= 0 ? '+' : ''}${abilityMod}`;
    const effectText = compactEffectTags(profile.effect);
    const damage = `${profile.damage}${damageMod} ${compactDamageType(profile.type)}${effectText ? ` | ${effectText}` : ''}`;
    return [[profile.label, bonus, damage]];
  });
}

function offensiveMagicRows() {
  return knownMagicEntries().flatMap((entry) => {
    const summary = spellEffectSummary(entry.key, entry.title);
    if (!summary.isOffensive) return [];
    return [[
      cleanLabel(entry.title),
      summary.usesAttackRoll ? spellAttackBonusText(entry.key, entry.title) : `DC ${spellSaveDc(entry.key, entry.title)}`,
      summary.text,
    ]];
  });
}

function encumbrance() {
  const base = selectedPackage()?.weight || 0;
  return base + Number(state.character.loadout.extraWeight || 0);
}

function armorClass() {
  const species = selectedBaseSpeciesData();
  const packageArmor = selectedPackage()?.armorBase || 0;
  const dex = mod(finalAbilityScore('dex'));
  let ac = Number(species?.baseAc || 10) + dex + packageArmor;
  if (state.character.profile.className === 'Monk') ac += Math.max(0, mod(finalAbilityScore('wis')));
  if (state.character.profile.className === 'Barbarian') ac += Math.max(0, mod(finalAbilityScore('con')));
  return ac;
}

function prophetSpellcastingAbilityKey() {
  return PROPHET_SPELLCASTING_ABILITIES[state.character.profile.subclass] || 'wis';
}

function elementalLoreAbilityKey(lore) {
  return {
    Force: 'str',
    Light: 'dex',
    Frost: 'con',
    Lightning: 'int',
    Fire: 'wis',
    Life: 'cha',
  }[cleanLabel(lore)] || 'int';
}

function rogueManeuverAbilityMod() {
  return Math.max(mod(finalAbilityScore('str')), mod(finalAbilityScore('dex')));
}

function vitalityBonusProfile() {
  const className = state.character.profile.className;
  const rule = selectedClassRule();
  if (className === 'Bard') {
    const bonus = mod(finalAbilityScore('cha'));
    return {start: bonus, perLevel: bonus};
  }
  if (className === 'Prophet') {
    const bonus = mod(finalAbilityScore(prophetSpellcastingAbilityKey()));
    return {start: bonus, perLevel: bonus};
  }
  if (className === 'Druid') {
    const bonus = mod(finalAbilityScore('wis'));
    return {start: bonus, perLevel: bonus};
  }
  if (className === 'Mage') {
    const bonus = mod(finalAbilityScore(elementalLoreAbilityKey(primaryElementalLore())));
    return {start: bonus, perLevel: bonus};
  }
  if (className === 'Rogue') {
    const bonus = rogueManeuverAbilityMod();
    return {start: bonus, perLevel: bonus};
  }
  if (className === 'Sorcerer') {
    const bonus = mod(finalAbilityScore(elementalLoreAbilityKey(chosenElementalLore())));
    return {start: bonus, perLevel: bonus};
  }
  if (className === 'Witch') {
    const bonus = mod(finalAbilityScore('int'));
    return {start: bonus, perLevel: bonus};
  }
  return {start: Number(rule.vitalityBonus || 0), perLevel: Number(rule.vitalityBonus || 0)};
}

function magicVitalityTax() {
  const className = state.character.profile.className;
  if (!['Druid', 'Ranger'].includes(className)) return 0;
  const sectionName = className === 'Druid' ? 'Wild Magic' : 'Wild Magic';
  return state.character.magic.wild.reduce((sum, title) => {
    const tier = spellTierForTitle(sectionName, title);
    const cost = {Novice: 1, Apprentice: 2, Adept: 3, Expert: 4, Master: 5}[tier] || 0;
    return sum + cost;
  }, 0);
}

function hitPoints() {
  const species = selectedBaseSpeciesData();
  const con = mod(finalAbilityScore('con'));
  const level = Number(state.character.profile.level || 1);
  return Math.max(1, Number(species?.hpBase || 5) + con + Math.max(0, level) * (Number(species?.hpPer || 5) + con));
}

function vitalityPoints() {
  const species = selectedBaseSpeciesData();
  const level = Number(state.character.profile.level || 1);
  const bonus = vitalityBonusProfile();
  return Math.max(1, Number(species?.vitalityBase || 10) + Number(bonus.start || 0) + Math.max(0, level) * (Number(species?.vitalityPer || 5) + Number(bonus.perLevel || 0)) - magicVitalityTax());
}

function hitPointFormulaText() {
  const species = selectedBaseSpeciesData();
  const con = mod(finalAbilityScore('con'));
  return `0th: ${species?.hpBase || 5} ${con >= 0 ? '+' : '-'} ${Math.abs(con)} CON | Higher Levels: ${species?.hpPer || 5} ${con >= 0 ? '+' : '-'} ${Math.abs(con)} CON per level`;
}

function vitalityFormulaText() {
  const species = selectedBaseSpeciesData();
  const bonus = vitalityBonusProfile();
  return `0th: ${species?.vitalityBase || 10}${bonus.start ? ` ${bonus.start >= 0 ? '+' : '-'} ${Math.abs(bonus.start)}` : ''} | Higher Levels: ${species?.vitalityPer || 5}${bonus.perLevel ? ` ${bonus.perLevel >= 0 ? '+' : '-'} ${Math.abs(bonus.perLevel)}` : ''} per level${magicVitalityTax() ? ` | Current tax: -${magicVitalityTax()}` : ''}`;
}

function speedMeters() {
  return Number(selectedBaseSpeciesData()?.speed || 10);
}

function spellTierForTitle(sectionName, title) {
  if (sectionName === 'Elemental Magic' && isElementalChannelSpell(title)) return elementalChannelTier(title) || 'Novice';
  const section = handbookSection(sectionName);
  let currentTier = '';
  for (const page of section?.pages || []) {
    if (/^(Novice|Apprentice|Adept|Expert|Master|Beginner|Veteran|Elite)/.test(page.title)) currentTier = page.title.split(' ')[0].replace(/[^A-Za-z]/g, '');
    if (page.title === title) return currentTier || 'Novice';
  }
  return 'Novice';
}

function spellTierLevelRequirement(mode, tier) {
  const full = {Novice: 1, Apprentice: 3, Adept: 5, Expert: 7, Master: 9};
  const half = {Novice: 3, Apprentice: 7, Adept: 9, Expert: 99, Master: 99};
  const martial = {Beginner: 1, Veteran: 5, Elite: 9};
  const table = mode === 'full' ? full : mode === 'half' ? half : martial;
  return table[tier] || 99;
}

function spellTierUnlockLevel(groupKey, tier) {
  const className = state.character.profile.className;
  const subclass = state.character.profile.subclass;
  if (groupKey === 'maneuvers') return spellTierLevelRequirement('martial', tier);
  if (groupKey === 'wild' && className === 'Ranger') return ({Novice: 1, Apprentice: 5, Adept: 9, Expert: 99, Master: 99})[tier] || 99;
  if (groupKey === 'divine' && className === 'Paladin') return ({Novice: 1, Apprentice: 5, Adept: 9, Expert: 99, Master: 99})[tier] || 99;
  if (groupKey === 'elemental' && subclass === 'Eldritch Knight') return ({Novice: 3, Apprentice: 7, Adept: 99, Expert: 99, Master: 99})[tier] || 99;
  if (groupKey === 'elemental' && subclass === 'Spellblade') return ({Novice: 3, Apprentice: 6, Adept: 99, Expert: 99, Master: 99})[tier] || 99;
  return spellTierLevelRequirement(effectiveSpellMode(groupKey), tier);
}

function spellTierUnlocked(mode, tier) {
  const level = Number(state.character.profile.level || 1);
  return level >= spellTierLevelRequirement(mode, tier);
}

function elementalTierPage(lore, tier) {
  const section = handbookSection('Elemental Magic');
  let currentLore = '';
  let currentTier = '';
  let currentTierPage = null;
  for (const page of section?.pages || []) {
    if (/^The Lore of /.test(page.title)) currentLore = cleanLabel(page.title.replace('The Lore of ', '').replace(/\s*\(.*\)$/,''));
    if (/^(Novice|Apprentice|Adept|Expert|Master)/.test(page.title)) {
      currentTier = page.title.split(' ')[0].replace(/[^A-Za-z]/g, '');
      currentTierPage = page;
    }
    if (currentLore === cleanLabel(lore) && currentTier === tier && currentTierPage) return currentTierPage;
  }
  return null;
}

function effectiveSpellMode(groupKey) {
  const classRule = selectedClassRule();
  if (groupKey === 'maneuvers') return 'martial';
  if (classRule.spellMode !== 'none') return classRule.spellMode;
  const access = magicAccess();
  if (access[groupKey]) return 'half';
  return 'none';
}

function spellPickLimit(groupKey) {
  const level = Number(state.character.profile.level || 1);
  const className = state.character.profile.className;
  const subclass = state.character.profile.subclass;
  if (groupKey === 'maneuvers') {
    if (subclass === 'Mythos of Legends') return level < 3 ? 0 : 2 + Math.floor((level - 3) / 2);
    if (className === 'Rogue') return level + 3;
    if (['Barbarian', 'Fighter', 'Monk', 'Ranger'].includes(className)) return level < 2 ? 0 : 2 + Math.floor((level - 2) / 2);
    return 2 + Math.floor((level - 1) / 2);
  }
  if (groupKey === 'arias' && className === 'Bard') return level + 3;
  if (groupKey === 'divine' && className === 'Prophet') return (level * 2) + 2;
  if (groupKey === 'divine' && className === 'Paladin') return level + 1;
  if (groupKey === 'elemental' && className === 'Mage') return (level * 2) + 4;
  if (groupKey === 'elemental' && className === 'Sorcerer') return level + 4;
  if (groupKey === 'elemental' && subclass === 'Eldritch Knight') return level < 3 ? 0 : level;
  if (groupKey === 'elemental' && subclass === 'Spellblade') return level < 3 ? 0 : level - 1;
  if (groupKey === 'wild' && className === 'Druid') return Math.max(1, mod(finalAbilityScore('wis'))) + level;
  if (groupKey === 'wild' && className === 'Ranger') return level + 1;
  if (groupKey === 'witchcraft' && className === 'Witch') return level + 3;
  if (groupKey === 'witchcraft' && subclass === 'Path of the Witcher') return level < 3 ? 0 : level - 1;
  const mode = effectiveSpellMode(groupKey);
  if (mode === 'none') return 0;
  if (mode === 'half') return Math.max(0, 1 + Math.floor(level / 2));
  return level + 1;
}

function isUnfinishedRule(title) {
  return UNFINISHED_RULE_TITLES.has(normalizeTitle(title));
}

function availableSpellChoices(groupKey) {
  const section = SPELL_SECTION_LABELS[groupKey];
  let choices = (availableSpellGroups()[groupKey] || [])
    .filter((title) => !isUnfinishedRule(title))
    .filter((title) => Number(state.character.profile.level || 1) >= spellTierUnlockLevel(groupKey, spellTierForTitle(section, title)));
  if (groupKey === 'elemental') choices = choices.filter((title) => elementalSpellIsLearnable(title));
  if (groupKey === 'witchcraft') {
    const allowedCategory = witchcraftCategoryAccess();
    if (allowedCategory !== 'all') choices = choices.filter((title) => witchcraftCategoryForTitle(title) === allowedCategory);
  }
  return choices;
}

function spellContextForTitle(groupKey, title) {
  if (groupKey === 'elemental' && isElementalChannelSpell(title)) {
    const lore = elementalChannelLore(title);
    const tier = elementalChannelTier(title) || 'Novice';
    return {tier, tierTitle: tier, lore, tierPage: elementalTierPage(lore, tier)};
  }
  const section = handbookSection(SPELL_SECTION_LABELS[groupKey]);
  let currentTier = '';
  let currentTierTitle = '';
  let currentLore = '';
  let currentTierPage = null;
  for (const page of section?.pages || []) {
    if (/^The Lore of /.test(page.title)) currentLore = cleanLabel(page.title.replace('The Lore of ', '').replace(/\s*\(.*\)$/, ''));
    if (/^(Novice|Apprentice|Adept|Expert|Master|Beginner|Veteran|Elite)/.test(page.title)) {
      currentTier = page.title.split(' ')[0].replace(/[^A-Za-z]/g, '');
      currentTierTitle = page.title;
      currentTierPage = page;
    }
    if (normalizeTitle(page.title) === normalizeTitle(title)) {
      return {tier: currentTier || 'Novice', tierTitle: currentTierTitle || page.title, lore: currentLore, tierPage: currentTierPage};
    }
  }
  return {tier: spellTierForTitle(SPELL_SECTION_LABELS[groupKey], title), tierTitle: '', lore: groupKey === 'elemental' ? elementalLoreBySpell(title) : '', tierPage: null};
}

function spellLearnRequirement(groupKey, title) {
  const context = spellContextForTitle(groupKey, title);
  return spellTierUnlockLevel(groupKey, context.tier);
}

function autoChannelSpellNames() {
  const tiers = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'];
  const level = Number(state.character.profile.level || 1);
  const unlocked = (groupKey) => tiers.filter((tier) => level >= spellTierUnlockLevel(groupKey, tier));
  const result = [];
  if (magicAccess().arias) result.push(...unlocked('arias').map((_, index) => `Channel Performance ${index + 1}`));
  if (magicAccess().divine) result.push(...unlocked('divine').map((_, index) => `Channel Divinity ${index + 1}`));
  if (magicAccess().wild) result.push(...unlocked('wild').map((_, index) => `Channel Wild ${index + 1}`));
  if (magicAccess().elemental) {
    const lore = chosenElementalLore();
    if (lore) result.push(...unlocked('elemental').map((_, index) => `Channel ${lore} ${index + 1}`));
  }
  if (state.character.profile.className === 'Witch') {
    if (state.character.profile.subclass === 'Forge Coven') result.push('Channel Fire I');
    if (state.character.profile.subclass === 'Hedge Coven') result.push('Channel Life I');
    if (level >= 7 && state.character.profile.subclass === 'Forge Coven') result.push('Channel Fire II');
    if (level >= 7 && state.character.profile.subclass === 'Hedge Coven') result.push('Channel Life II');
  }
  return result;
}

function spellPreviewData(groupKey, title) {
  const page = spellPageRecord(groupKey, title);
  const cleaned = sanitizePageText(page || {});
  const context = spellContextForTitle(groupKey, title);
  const requirementLevel = spellLearnRequirement(groupKey, title);
  const tierIntro = sanitizePageText(context.tierPage || {});
  const requirementLine = `${context.tier} ab Stufe ${requirementLevel}`;
  const elementalRequirement = `Channel ${context.lore || chosenElementalLore()} ${CHANNEL_ROMAN[Math.max(0, SPELL_TIERS.indexOf(context.tier))]}`;
  const channelLine = groupKey === 'elemental'
    ? state.character.profile.className === 'Mage' && context.lore && context.lore !== primaryElementalLore()
      ? `Prerequisite: ${elementalRequirement}. Mages can only use off-lore spells after learning the matching channel spell.`
      : `Prerequisite: ${elementalRequirement}, which is learned automatically in the studio when the tier unlocks.`
    : '';
  return {
    title: cleanLabel(title),
    lore: context.lore || '',
    tier: context.tier,
    requirementLine,
    channelLine,
    hasExactEffect: Boolean(cleaned),
    sourceNote: cleaned
      ? 'Direct effect text from the OneNote export.'
      : 'Only an index or tier page is available for this entry in the shared export.',
    effectText: cleaned ? cleaned.split('\n').slice(0, 20).join('\n') : '',
    fallbackText: tierIntro
      ? tierIntro.split('\n').slice(0, 14).join('\n')
      : 'The OneDrive shared view does not provide clean effect text for this specific subpage.',
  };
}

function spellPreviewText(groupKey, title) {
  const data = spellPreviewData(groupKey, title);
  return [
    data.title,
    `Unlock: ${data.requirementLine}.`,
    data.lore ? `Lore: ${data.lore}.` : '',
    data.channelLine,
    '',
    data.hasExactEffect ? data.effectText : data.fallbackText,
  ].filter(Boolean).join('\n');
}

function autoLearnedMagicEntries() {
  return autoChannelSpellNames().map((title) => {
    const key = /^Channel Performance/i.test(title)
      ? 'arias'
      : /^Channel Divinity/i.test(title)
        ? 'divine'
        : /^Channel Wild/i.test(title)
          ? 'wild'
          : /^Channel\s+/i.test(title)
            ? 'elemental'
            : '';
    return key ? {key, label: SPELL_SECTION_LABELS[key], title, auto: true} : null;
  }).filter(Boolean);
}

function knownMagicEntries() {
  const entries = [...selectedMagicEntries(), ...autoLearnedMagicEntries()];
  const seen = new Set();
  return entries.filter((entry) => {
    const token = `${entry.key}:${normalizeTitle(entry.title)}`;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

function renderSpellPreview(groupKey, title) {
  const data = spellPreviewData(groupKey, title);
  return `
    <div class="spell-preview-card">
      <div class="summary-row">
        <div class="summary-chip">${data.tier}</div>
        <div class="summary-chip">${data.requirementLine}</div>
        ${data.lore ? `<div class="summary-chip">Lore ${data.lore}</div>` : ''}
        <div class="summary-chip ${data.hasExactEffect ? 'success' : 'warning'}">${data.hasExactEffect ? 'Exact effect from source' : 'Only tier or channel rules available'}</div>
      </div>
      <div class="summary-chip wide">${data.sourceNote}</div>
      ${data.channelLine ? `<div class="guide-card compact"><strong>Prerequisite</strong><p class="muted">${data.channelLine}</p></div>` : ''}
      <div class="guide-card compact">
        <strong>Effekt</strong>
        <pre class="reader-text compact inline">${data.hasExactEffect ? data.effectText : data.fallbackText}</pre>
      </div>
    </div>
  `;
}

function spellPageRecord(groupKey, title) {
  const section = SPELL_SECTION_LABELS[groupKey];
  return handbookPage(section, title);
}

function previewTextFor(groupKey, title) {
  return spellPreviewText(groupKey, title).split('\n').join(' ').slice(0, 320);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanPreviewText(text, maxLines = 10) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join('\n');
}

function renderInfoPreviewCard({eyebrow = 'Preview', title = '', text = '', chips = [], bodyHtml = ''}) {
  const cleaned = cleanPreviewText(text, 12) || 'No clean description available.';
  return `
    <div class="preview-window">
      <div class="preview-window-bar">
        <span></span><span></span><span></span>
      </div>
      <div class="preview-window-body">
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h3>${escapeHtml(title || 'Preview')}</h3>
        ${chips.length ? `<div class="summary-row">${chips.map((chip) => `<div class="summary-chip">${escapeHtml(chip)}</div>`).join('')}</div>` : ''}
        ${bodyHtml || `<pre class="reader-text compact inline">${escapeHtml(cleaned)}</pre>`}
      </div>
    </div>
  `;
}

function summarySnippet(text, max = 180) {
  const value = cleanPreviewText(text, 4).replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function speciesFeatureText() {
  const species = selectedBaseSpeciesData();
  const acquired = selectedAcquiredSpeciesData();
  const rule = acquiredSpeciesRule();
  if (!species) return [];
  const baseTraits = rule?.keepsBaseTraits === false ? [] : (species.feats || []);
  const acquiredTraits = acquired?.feats || [];
  return [
    ...Object.entries(species.abilities || {}).filter(([, value]) => value).map(([key, value]) => `${ABILITY_LABELS[key]} ${value >= 0 ? '+' : ''}${value}`),
    ...((acquired && rule?.addsAbilityBonuses) ? Object.entries(acquired.abilities || {}).filter(([, value]) => value).map(([key, value]) => `${ABILITY_LABELS[key]} ${value >= 0 ? '+' : ''}${value} (${acquired.name})`) : []),
    `Base AC ${species.baseAc}`,
    `Speed ${species.speed}m`,
    `Carry Limit STR x 3`,
    ...baseTraits,
    ...acquiredTraits,
  ];
}

function witchcraftCategoryForTitle(title) {
  const section = handbookSection('Witchcraft');
  let currentCategory = '';
  for (const page of section?.pages || []) {
    if (/^Potion Formulas/i.test(page.title)) currentCategory = 'formula';
    if (/^Enchantements/i.test(page.title)) currentCategory = 'enchantment';
    if (normalizeTitle(page.title) === normalizeTitle(title)) return currentCategory || '';
  }
  return '';
}

function witchcraftCategoryAccess() {
  const subclass = state.character.profile.subclass;
  if (subclass === 'Alchemy Coven' || subclass === 'Path of the Witcher') return 'formula';
  if (subclass === 'Forge Coven') return 'enchantment';
  return 'all';
}

function elementalAccessSummary() {
  const unlocked = [...unlockedElementalLores()];
  if (state.character.profile.className === 'Mage') return `Primary Lore: ${primaryElementalLore()} | Unlocked: ${unlocked.join(', ')}`;
  return `Lore: ${chosenElementalLore()}`;
}

function extractFeatureSnippet(page, featureName) {
  const cleaned = sanitizePageText(page);
  if (!cleaned) return '';
  const escaped = featureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingRegex = new RegExp(`${escaped}\\.?\\s*([\\s\\S]{0,900})`, 'i');
  const match = cleaned.match(headingRegex);
  if (!match) return '';
  const after = match[1]
    .split('\n')
    .slice(0, 6)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${featureName}. ${after}`.slice(0, 420).trim();
}

function extractFeatureBlocks(page) {
  const cleaned = sanitizePageText(page);
  if (!cleaned) return [];
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean).filter((line) => !isDateOrTimeLine(line));
  const currentTitle = normalizeTitle(page?.title);
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = normalizeTitle(line);
    if (!line || normalized === currentTitle) continue;
    const next = lines[index + 1] || '';
    const isHeading = line.length >= 3
      && line.length <= 48
      && !/[.!?]$/.test(line)
      && next
      && (next.length > 30 || /^[•*-]/.test(next));
    if (!isHeading) continue;
    const descriptionLines = [];
    for (let lookahead = index + 1; lookahead < lines.length; lookahead += 1) {
      const candidate = lines[lookahead];
      const future = lines[lookahead + 1] || '';
      const candidateIsHeading = candidate.length >= 3
        && candidate.length <= 48
        && !/[.!?]$/.test(candidate)
        && future
        && (future.length > 30 || /^[•*-]/.test(future));
      if (lookahead > index + 1 && candidateIsHeading) break;
      descriptionLines.push(candidate.replace(/^[•*-]\s*/, ''));
      if (descriptionLines.length >= 5) break;
    }
    const description = descriptionLines.join(' ').replace(/\s+/g, ' ').trim();
    if (description.length >= 20) {
      blocks.push({name: line, description});
    }
  }
  return [...new Map(blocks.map((item) => [item.name, item])).values()].slice(0, 8);
}

function speciesFeatureDetails() {
  const species = selectedBaseSpeciesData();
  const acquired = selectedAcquiredSpeciesData();
  const rule = acquiredSpeciesRule();
  const basePage = handbookPage('Species', state.character.profile.speciesSubtype) || speciesHandbookEntry();
  const acquiredPage = acquiredSpeciesEntry();
  const baseFeatures = rule?.keepsBaseTraits === false ? [] : (species?.feats || []).map((feature) => ({
    name: feature,
    description: extractFeatureSnippet(basePage, feature) || handbookPreview(basePage, feature),
    section: 'Species',
    page: basePage?.title || species?.name || '',
    chips: [species?.name || state.character.profile.speciesSubtype || 'Species Feature'],
  }));
  const acquiredFeatures = (acquired?.feats || []).map((feature) => ({
    name: feature,
    description: extractFeatureSnippet(acquiredPage, feature) || handbookPreview(acquiredPage, feature),
    section: 'Species',
    page: acquiredPage?.title || acquired?.name || '',
    chips: [acquired?.name || 'Acquired Species'],
  }));
  return [...baseFeatures, ...acquiredFeatures];
}

function speciesOverviewEntry() {
  const species = selectedBaseSpeciesData();
  const basePage = handbookPage('Species', state.character.profile.speciesSubtype) || speciesHandbookEntry();
  if (!species) return null;
  const overviewText = MANUAL_SPECIES_REFERENCE_TEXT[`${species.name}:overview`] || species.summary || 'No lineage summary available.';
  return {
    id: 'species-overview',
    name: species.name || state.character.profile.speciesSubtype || 'Species',
    eyebrow: 'Lineage Overview',
    chips: [
      `Base AC ${species.baseAc || 10}`,
      `Speed ${species.speed || 10}m`,
      `HP ${species.hpBase || 0}/${species.hpPer || 0}`,
      `Vitality ${species.vitalityBase || 0}/${species.vitalityPer || 0}`,
    ],
    bodyHtml: `
      <p>${escapeHtml(overviewText)}</p>
      <div class="compendium-meta">
        <div><span>Ability Bonuses</span><strong>${ABILITIES.map((key) => species.abilities?.[key] ? `${ABILITY_LABELS[key].slice(0, 3).toUpperCase()} ${species.abilities[key] >= 0 ? '+' : ''}${species.abilities[key]}` : '').filter(Boolean).join(', ') || '-'}</strong></div>
        <div><span>Automatic Skills</span><strong>${(species.autoSkills || []).join(', ') || 'None'}</strong></div>
      </div>
    `,
    section: 'Species',
    page: basePage?.title || species.name || '',
  };
}

function acquiredSpeciesOverviewEntry() {
  const acquired = selectedAcquiredSpeciesData();
  const rule = acquiredSpeciesRule();
  const acquiredPage = acquiredSpeciesEntry();
  if (!acquired || !rule) return null;
  return {
    id: 'species-acquired-overview',
    name: acquired.name || state.character.profile.acquiredSpecies,
    eyebrow: 'Acquired Species',
    chips: [
      rule.inheritsCoreStats ? 'Keeps base core stats' : 'Overrides base stats',
      rule.addsAbilityBonuses ? 'Adds ability bonuses' : 'No extra ability bonuses',
      rule.addsAutomaticSkills ? 'Adds automatic skills' : 'No extra auto skills',
    ],
    bodyHtml: `
      <p>${escapeHtml(acquired.summary || 'No acquired species summary available.')}</p>
      <div class="compendium-meta">
        <div><span>Ability Bonuses</span><strong>${ABILITIES.map((key) => acquired.abilities?.[key] ? `${ABILITY_LABELS[key].slice(0, 3).toUpperCase()} ${acquired.abilities[key] >= 0 ? '+' : ''}${acquired.abilities[key]}` : '').filter(Boolean).join(', ') || '-'}</strong></div>
        <div><span>Automatic Skills</span><strong>${(acquired.autoSkills || []).join(', ') || 'None'}</strong></div>
      </div>
    `,
    section: 'Species',
    page: acquiredPage?.title || acquired.name || '',
  };
}

function speciesFeatureReferenceEntry(feature, sourcePage, sourceLabel) {
  const directPage = handbookPage('Customization', feature) || handbookPage('Species', feature);
  const sourceText = MANUAL_SPECIES_REFERENCE_TEXT[feature] || (directPage
    ? (sanitizePageText(directPage) || manualCompendiumText(pageSectionName(directPage), directPage.title))
    : extractFeatureSnippet(sourcePage, feature));
  const bodyHtml = sourceText
    ? renderCompendiumBlockBody(sourceText)
    : `<p>${escapeHtml(`No clean rules text for ${feature} is currently available from the source export.`)}</p>`;
  return {
    id: `species-feature-${normalizeTitle(feature).replace(/[^a-z0-9]+/g, '-')}`,
    name: feature,
    eyebrow: sourceLabel,
    chips: [directPage ? pageSectionName(directPage) : 'Species', sourcePage?.title || sourceLabel].filter(Boolean),
    bodyHtml,
    text: sourceText || feature,
    section: directPage ? pageSectionName(directPage) : 'Species',
    page: directPage?.title || sourcePage?.title || '',
  };
}

function speciesReferenceEntries() {
  const entries = [];
  const baseOverview = speciesOverviewEntry();
  const acquiredOverview = acquiredSpeciesOverviewEntry();
  const species = selectedBaseSpeciesData();
  const acquired = selectedAcquiredSpeciesData();
  const rule = acquiredSpeciesRule();
  const basePage = handbookPage('Species', state.character.profile.speciesSubtype) || speciesHandbookEntry();
  const acquiredPage = acquiredSpeciesEntry();
  if (baseOverview) entries.push(baseOverview);
  if (acquiredOverview) entries.push(acquiredOverview);
  if (rule?.keepsBaseTraits !== false) {
    for (const feature of species?.feats || []) {
      entries.push(speciesFeatureReferenceEntry(feature, basePage, species?.name || 'Species Feature'));
    }
  }
  for (const feature of acquired?.feats || []) {
    entries.push(speciesFeatureReferenceEntry(feature, acquiredPage, acquired?.name || 'Acquired Species'));
  }
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}

function currentSpeciesReferenceEntry(entries = speciesReferenceEntries()) {
  return entries.find((entry) => entry.id === state.speciesDetailSelection)
    || entries[0]
    || null;
}

function renderSpeciesReferenceButtons(entries) {
  const activeId = currentSpeciesReferenceEntry(entries)?.id || '';
  return entries.map((entry) => `
    <button
      class="summary-chip interactive ${entry.id === activeId ? 'active' : ''}"
      type="button"
      data-species-entry="${escapeHtml(entry.id)}"
      title="${escapeHtml(entry.name)}"
    >${escapeHtml(entry.name)}</button>
  `).join('');
}

function renderHoverChips(items, targetId) {
  return items.map((item) => `
    <button
      class="summary-chip interactive"
      data-preview-target="${targetId}"
      data-preview-title="${escapeHtml(item.name)}"
      data-preview-text="${escapeHtml(item.description || item.name)}"
      data-preview-eyebrow="${escapeHtml(item.eyebrow || 'Detail')}"
      data-preview-section="${escapeHtml(item.section || '')}"
      data-preview-page="${escapeHtml(item.page || '')}"
      data-preview-chips="${escapeHtml((item.chips || []).join('||'))}"
      title="${String(item.description || item.name).replace(/"/g, '&quot;')}"
    >${item.name}</button>
  `).join('');
}

function activeMagicOptional() {
  return Object.keys(SPELL_SECTION_LABELS).every((key) => !availableSpellChoices(key).length);
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

function pageSectionName(page) {
  return state.handbook.find((entry) => entry.pages.includes(page))?.section || state.selectedSection;
}

function renderOptionList(options, selected, field, descriptions = {}, previewGroup = '') {
  return `
    <div class="pill-grid">
      ${options.map((option) => `
        <button class="pill ${selected.includes(option) ? 'active' : ''}" data-toggle-field="${field}" data-toggle-value="${option}" title="${String(descriptions[option] || option).replace(/"/g, '&quot;')}" ${previewGroup ? `data-preview-group="${previewGroup}" data-preview-title="${option}"` : ''}>${cleanLabel(option)}</button>
      `).join('')}
    </div>
  `;
}

function renderChoiceCards(options, selected, field, detailMap = {}, emptyText = '', previewTarget = '', previewMap = null) {
  if (!options.length) return `<div class="empty-state compact">${emptyText || 'No options available.'}</div>`;
  return `
    <div class="choice-grid">
      ${options.map((option) => `
        <button class="choice-card ${selected === option ? 'active' : ''}" data-choose-field="${field}" data-choose-value="${option}" title="${String((previewMap || detailMap)[option] || option).replace(/"/g, '&quot;')}" ${previewTarget ? `data-preview-target="${previewTarget}" data-preview-title="${escapeHtml(option)}" data-preview-text="${escapeHtml((previewMap || detailMap)[option] || option)}" data-preview-eyebrow="${escapeHtml(field.includes('subclass') ? 'Subclass' : field.includes('className') ? 'Class' : field.includes('speciesSubtype') ? 'Lineage' : field.includes('species') ? 'Species' : 'Preview')}"` : ''}>
          <strong>${option}</strong>
          ${detailMap[option] ? `<span>${detailMap[option]}</span>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

function handbookPreview(page, fallback) {
  const cleaned = sanitizePageText(page) || manualCompendiumText(pageSectionName(page), page?.title);
  if (!cleaned) return fallback || 'This subpage was found, but the shared view does not provide clean running text.';
  return cleaned.split('\n').slice(0, 16).join('\n');
}

function openCompendiumButton(section, title, label = 'Open in Compendium') {
  if (!section || !title) return '';
  return `<button class="ghost-btn" data-open-section="${section}" data-open-page="${title}">${label}</button>`;
}

function stepIsComplete(stepId) {
  const c = state.character;
  if (stepId === 'profile') return Boolean(c.profile.name.trim());
  if (stepId === 'species') return Boolean(c.profile.species && c.profile.speciesSubtype);
  if (stepId === 'class') return Boolean(c.profile.className && c.profile.subclass);
  if (stepId === 'abilities') return pointBuyRemaining() === 0;
  if (stepId === 'proficiencies') return c.proficiencies.skills.length === classSkillLimit() && c.build.feats.length <= featSlots();
  if (stepId === 'loadout') return Boolean(c.loadout.package);
  if (stepId === 'magic') {
    const required = Object.entries(magicAccess()).some(([, enabled]) => enabled);
    return !required || knownMagicEntries().length > 0 || activeMagicOptional();
  }
  if (stepId === 'notes') return true;
  return false;
}

function stepDescription(stepId) {
  if (stepId === 'profile') return 'Start with identity and target level.';
  if (stepId === 'species') return 'Choose ancestry and lineage to lock in base stats and traits.';
  if (stepId === 'class') return 'Set role, subclass, and unlocked systems.';
  if (stepId === 'abilities') return 'Assign abilities and review the derived values.';
  if (stepId === 'proficiencies') return 'Fill out the build with skills and feats within the limits.';
  if (stepId === 'loadout') return 'Choose the starting package and review weight and armor.';
  if (stepId === 'magic') return 'Select only the spells and maneuvers allowed at this level.';
  return 'Add notes, appearance, and campaign hooks at the end.';
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

function currentMagicPreview() {
  const preview = state.magicPreview;
  if (preview?.key && preview?.title) return preview;
  return knownMagicEntries()[0] || null;
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

function compendiumFallbackText(page) {
  if (!page) return 'Choose a rules entry on the left or search for a term.';
  const manual = manualCompendiumText(state.selectedSection, page.title);
  if (manual) return manual;
  if (['Arias', 'Divine Magic', 'Elemental Magic', 'Wild Magic', 'Witchcraft', 'Maneuvers'].includes(state.selectedSection)) {
    return `For "${page.title}", the OneNote shared export only contains an index or navigation page here. Use the builder hover preview for tier, prerequisite, and the best available effect text from the source.`;
  }
  return `This OneNote page is not cleanly readable in the shared export for "${page.title}". The title is preserved as a reference.`;
}

function compendiumStats(page) {
  const cleaned = sanitizePageText(page) || manualCompendiumText(state.selectedSection, page?.title);
  const lines = cleaned ? cleaned.split('\n').filter(Boolean) : [];
  const section = state.selectedSection;
  const chips = [section];
  const spellContext = Object.entries(SPELL_SECTION_LABELS).find(([, label]) => label === section)
    ? spellContextForTitle(Object.keys(SPELL_SECTION_LABELS).find((key) => SPELL_SECTION_LABELS[key] === section), page?.title || '')
    : null;
  if (spellContext?.tier) chips.push(spellContext.tier);
  if (spellContext?.lore) chips.push(`Lore ${spellContext.lore}`);
  if (lines.length) chips.push(`${lines.length} Zeilen`);
  return chips;
}

function relatedPages(sectionName, currentTitle, limit = 8) {
  return meaningfulPages(sectionName)
    .filter((item) => item.title !== currentTitle)
    .slice(0, limit);
}

function searchItems() {
  return state.search ? state.filteredPages : meaningfulPages(state.selectedSection);
}

function compendiumSectionsFromText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length >= 4)
    .filter((line) => /^([A-Z][A-Z\s:'()/-]+|Chapter\s+\d+[:.-].+|The Lore of .+|Tier\s+\d+.+)$/i.test(line))
    .filter((line, index, arr) => arr.indexOf(line) === index)
    .slice(0, 12);
}

function compendiumBlocksFromText(text, fallbackTitle = 'Content') {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const blocks = [];
  let current = {title: fallbackTitle, lines: []};
  const isHeading = (line) => line.length >= 4 && (
    /^([A-Z][A-Z\s:'()/-]+|Chapter\s+\d+[:.-].+|The Lore of .+|Tier\s+\d+.+)$/i.test(line)
    || (/^[A-Z][A-Za-z0-9'()/:,-]+(?: [A-Z][A-Za-z0-9'()/:,-]+){0,7}$/.test(line) && lines.includes(line))
  );
  for (const line of lines) {
    if (isHeading(line) && current.lines.length) {
      blocks.push(current);
      current = {title: line, lines: []};
      continue;
    }
    if (isHeading(line) && !current.lines.length && current.title === fallbackTitle) {
      current.title = line;
      continue;
    }
    current.lines.push(line);
  }
  if (current.title || current.lines.length) blocks.push(current);
  return blocks
    .map((block, index) => ({
      ...block,
      title: block.title || `${fallbackTitle} ${index + 1}`,
      body: block.lines
        .filter((line, lineIndex) => !(lineIndex === 0 && normalizeTitle(line) === normalizeTitle(block.title)))
        .filter((line, lineIndex, arr) => !(index === 0 && lineIndex === 0 && normalizeTitle(line) === normalizeTitle(fallbackTitle)))
        .join('\n')
        .trim(),
      anchorId: `compendium-anchor-${index + 1}`,
    }))
    .filter((block) => block.title || block.body);
}

function renderCompendiumBlockBody(body) {
  const metaPattern = /^(Prerequisite|Requires|Vitality Cost|Casting Time|Use Time|Range|Duration|Target|Area|Components):\s*(.+)$/i;
  const lines = String(body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const metaLines = [];
  const paragraphs = [];
  let currentParagraph = [];
  for (const line of lines) {
    const match = line.match(metaPattern);
    if (match) {
      if (currentParagraph.length) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      metaLines.push([match[1], match[2]]);
      continue;
    }
    currentParagraph.push(line);
  }
  if (currentParagraph.length) paragraphs.push(currentParagraph.join(' '));
  return `
    ${metaLines.length ? `<div class="compendium-meta">${metaLines.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>` : ''}
    ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
  `;
}

function renderBuilder() {
  const c = state.character;
  const step = state.builderStep;
  const species = selectedSpeciesData();
  const classRule = selectedClassRule();
  const speciesPage = handbookPage('Species', c.profile.speciesSubtype) || speciesHandbookEntry();
  const selectedMagic = knownMagicEntries();
  let body = '';

  if (step === 'profile') {
    body = panel('Step 1 - Profile', `
      <div class="form-grid three">
        <label><span>Name</span><input data-field="profile.name" value="${c.profile.name}"></label>
        <label><span>Player</span><input data-field="profile.player" value="${c.profile.player}"></label>
        <label><span>Level</span><input type="number" min="1" max="10" data-field="profile.level" value="${c.profile.level}"></label>
      </div>
    `);
  } else if (step === 'species') {
    const speciesEntries = speciesReferenceEntries();
    const selectedSpeciesEntry = currentSpeciesReferenceEntry(speciesEntries);
    body = `
      ${panel('Step 2 - Species', `
        <div class="split-shell">
          <div class="stack">
            <div>
              <div class="eyebrow">Base Species</div>
              ${renderChoiceCards(SPECIES, c.profile.species, 'profile.species', Object.fromEntries(SPECIES.map((name) => [name, cleanLabel(name)])))}
            </div>
            <div>
              <div class="eyebrow">Subspecies / Lineage</div>
              ${renderChoiceCards(selectedSpeciesOptions().map((item) => item.name), c.profile.speciesSubtype, 'profile.speciesSubtype', Object.fromEntries(selectedSpeciesOptions().map((item) => [item.name, item.summary])))}
            </div>
            <div>
              <div class="eyebrow">Acquired Species</div>
              ${renderChoiceCards(ACQUIRED_SPECIES, c.profile.acquiredSpecies, 'profile.acquiredSpecies', {None: 'No acquired species on top of the base profile.'})}
            </div>
          </div>
          <div class="stack">
            ${panel('Species Reference', `
              <div class="guide-card sticky-card">
                <div class="eyebrow">Selected Reference</div>
                <div class="mini-list species-entry-list">
                  ${speciesEntries.length ? renderSpeciesReferenceButtons(speciesEntries) : '<div class="summary-chip">No references available</div>'}
                </div>
                <div id="speciesFeaturePanel">${selectedSpeciesEntry ? renderInfoPreviewCard({
                  eyebrow: selectedSpeciesEntry.eyebrow || 'Species Reference',
                  title: selectedSpeciesEntry.name,
                  chips: selectedSpeciesEntry.chips || [],
                  bodyHtml: selectedSpeciesEntry.bodyHtml || '',
                  text: selectedSpeciesEntry.text || '',
                }) : renderInfoPreviewCard({
                  eyebrow: 'Species Reference',
                  title: species?.name || 'Species',
                  text: species?.summary || 'No species reference available.',
                })}</div>
                <div class="inline-actions" id="speciesFeatureActions">${selectedSpeciesEntry ? openCompendiumButton(selectedSpeciesEntry.section, selectedSpeciesEntry.page) : ''}</div>
              </div>
            `)}
          </div>
        </div>
      `)}
      <div class="split-shell species-benefits-shell">
        ${panel('Species Benefits', `
          <div class="guide-card">
            <h3>${species?.name || 'Species'}</h3>
            <p class="muted">${(MANUAL_SPECIES_REFERENCE_TEXT[`${species?.name}:overview`] || species?.summary || '').slice(0, 220)}</p>
            <div class="stat-table">
              <div><span>HP Formula</span><strong>${hitPointFormulaText()}</strong></div>
              <div><span>Vitality Formula</span><strong>${vitalityFormulaText()}</strong></div>
              <div><span>Carry Limit</span><strong>STR x 3</strong></div>
            </div>
          </div>
        `)}
        ${panel('Reference Use', `
          <div class="guide-card">
            <div class="compendium-meta">
              <div><span>Available References</span><strong>${speciesEntries.length}</strong></div>
              <div><span>Feature Entries</span><strong>${speciesEntries.filter((entry) => entry.id.startsWith('species-feature-')).length}</strong></div>
            </div>
            <p class="muted">Click to pin an entry. Hover only previews it temporarily.</p>
          </div>
        `)}
      </div>
    `;
  } else if (step === 'class') {
    const subclassPage = subclassHandbookEntry();
    const subclassFeatures = extractFeatureBlocks(subclassPage).map((item) => ({
      ...item,
      section: 'Classes',
      page: c.profile.subclass,
      chips: [c.profile.className, c.profile.subclass].filter(Boolean),
      eyebrow: 'Subclass Feature',
    }));
    const classPreviewMap = Object.fromEntries(CLASSES.map((name) => [name, `${CLASS_RULES[name].description}\n\n${handbookPreview(handbookPage('Classes', name), CLASS_RULES[name].description)}`]));
    const subclassPreviewMap = Object.fromEntries((SUBCLASS_MAP[c.profile.className] || []).map((name) => [name, handbookPreview(handbookPage('Classes', name), SUBCLASS_SUMMARIES[name] || 'Subclass summary not yet mapped.')]));
    body = `
      ${panel('Step 3 - Class', `
        <div class="stack">
          <div>
            <div class="eyebrow">Class</div>
            ${renderChoiceCards(CLASSES, c.profile.className, 'profile.className', Object.fromEntries(CLASSES.map((name) => [name, CLASS_RULES[name].description])), '', 'classPreviewPanel', classPreviewMap)}
          </div>
          <div>
            <div class="eyebrow">Subclass</div>
            ${renderChoiceCards(SUBCLASS_MAP[c.profile.className] || [], c.profile.subclass, 'profile.subclass', Object.fromEntries((SUBCLASS_MAP[c.profile.className] || []).map((name) => [name, SUBCLASS_SUMMARIES[name] || 'Subclass summary not yet mapped.'])), '', 'classPreviewPanel', subclassPreviewMap)}
          </div>
          <div class="summary-row">
            <div class="summary-chip">${classRule.skillChoices} class skills</div>
            <div class="summary-chip">Vitality bonus +${classRule.vitalityBonus}/Lv</div>
            ${Object.entries(magicAccess()).filter(([, enabled]) => enabled).map(([key]) => `<div class="summary-chip">${SPELL_SECTION_LABELS[key]}</div>`).join('')}
          </div>
        </div>
      `)}
      <div class="split-shell">
        ${panel('Class Preview', `
          <div class="guide-card">
            <div id="classPreviewPanel">${renderInfoPreviewCard({
              eyebrow: 'Class Detail',
              title: c.profile.subclass || c.profile.className,
              text: handbookPreview(subclassPage, classRule.description),
              chips: [`${classRule.skillChoices} Class Skills`, `Vitality +${classRule.vitalityBonus}/Lv`],
            })}</div>
            <div class="summary-row">
              <div class="summary-chip">${classRule.skillChoices} Class Skills</div>
              <div class="summary-chip">Vitality +${classRule.vitalityBonus}/Lv</div>
            </div>
            <div class="inline-actions">${openCompendiumButton('Classes', c.profile.subclass || c.profile.className)}</div>
          </div>
        `)}
        ${panel('Subclass Features', `
          <div class="guide-card">
            <div class="summary-row">
              ${subclassFeatures.length ? renderHoverChips(subclassFeatures, 'subclassFeaturePanel') : '<div class="summary-chip">No clean feature blocks found in the export</div>'}
            </div>
            <div id="subclassFeaturePanel">${renderInfoPreviewCard({
              eyebrow: 'Feature Detail',
              title: subclassFeatures[0]?.name || c.profile.subclass,
              text: subclassFeatures[0]?.description || handbookPreview(subclassPage, SUBCLASS_SUMMARIES[c.profile.subclass] || 'No further description available.'),
              chips: [c.profile.className, c.profile.subclass].filter(Boolean),
            })}</div>
            <div class="inline-actions">${openCompendiumButton('Classes', c.profile.subclass)}</div>
          </div>
        `)}
      </div>
    `;
  } else if (step === 'abilities') {
    body = `
      ${panel('Step 4 - Ability Scores', `
        <div class="split-shell">
          <div class="stack">
            <div class="ability-grid">
              ${ABILITIES.map((key) => `
                <label class="ability-card">
                  <span>${ABILITY_LABELS[key]}</span>
                  <input type="number" min="8" max="15" data-field="abilities.${key}" value="${c.abilities[key]}">
                  <small>Base ${c.abilities[key]} / Species ${speciesAbilityBonus(key) >= 0 ? '+' : ''}${speciesAbilityBonus(key)}</small>
                  <strong>${finalAbilityScore(key)}</strong>
                </label>
              `).join('')}
            </div>
            <div class="summary-row">
              <div class="summary-chip">Point Buy ${pointBuySpent()}/${POINT_BUY_BUDGET}</div>
              <div class="summary-chip">${pointBuyRemaining()} points left</div>
              <div class="summary-chip">Range 8-15 before species</div>
            </div>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Derived Stats</div>
            <div class="stat-table">
              <div><span>HP</span><strong>${hitPoints()}</strong></div>
              <div><span>Vitality</span><strong>${vitalityPoints()}</strong></div>
              <div><span>Armor Class</span><strong>${armorClass()}</strong></div>
              <div><span>Speed</span><strong>${speedMeters()}m</strong></div>
              <div><span>Carry Limit</span><strong>${carryLimit()}</strong></div>
              <div><span>HP Rules</span><strong>${hitPointFormulaText()}</strong></div>
              <div><span>Vitality Rules</span><strong>${vitalityFormulaText()}</strong></div>
            </div>
          </div>
        </div>
      `)}
      ${referencePanel('Ability Rules', handbookPage('Playing the Game', 'Chapter 6: Using Ability Scores-'), 'Playing the Game')}
    `;
  } else if (step === 'proficiencies') {
    const featPreview = c.build.feats[0] ? handbookPage('Customization', c.build.feats[0]) : null;
    body = `
      ${panel('Step 5 - Skills & Feats', `
        <div class="split-shell">
          <div class="stack">
            <label><span>Automatic Species Skills</span><div class="summary-row">${automaticSkills().map((skill) => `<div class="summary-chip">${skill}</div>`).join('') || '<div class="summary-chip">None</div>'}</div></label>
            <label><span>Class Skills (${c.proficiencies.skills.length}/${classSkillLimit()})</span>${renderOptionList(classRule.skillList || [], c.proficiencies.skills, 'proficiencies.skills', SKILL_DESCRIPTIONS, 'skills')}</label>
            <label><span>Feats (${c.build.feats.length}/${featSlots()})</span>${renderOptionList(availableFeats(), c.build.feats, 'build.feats', Object.fromEntries(availableFeats().map((feat) => [feat, handbookPreview(handbookPage('Customization', feat), feat)])), 'feats')}</label>
          </div>
          <div class="guide-card">
            <div class="eyebrow">Selected Detail</div>
            <div id="skillsHoverPanel" class="mini-list">
              ${selectedSkillSet().length ? renderInfoPreviewCard({
                eyebrow: 'Skill Detail',
                title: selectedSkillSet()[0],
                text: SKILL_DESCRIPTIONS[selectedSkillSet()[0]] || 'No description mapped yet.',
                chips: [ABILITY_LABELS[skillAbility(selectedSkillSet()[0])], `Bonus ${skillBonus(selectedSkillSet()[0])}`],
              }) : '<div class="empty-state compact">Choose skills or feats to inspect their details here.</div>'}
            </div>
          </div>
        </div>
      `)}
      <div class="split-shell">
        ${panel('Skills Reference', `<div class="guide-card">${selectedSkillSet().slice(0, 6).map((skill) => `<div class="summary-chip">${skill}: ${SKILL_DESCRIPTIONS[skill] || 'No description mapped yet.'}</div>`).join('') || '<div class="empty-state compact">Choose skills to inspect what they do.</div>'}</div>`)}
        ${featPreview ? referencePanel(`Feat Reference: ${c.build.feats[0]}`, featPreview, 'Customization') : referencePanel('Feat Rules', handbookPage('Customization', 'Feats'), 'Customization')}
      </div>
    `;
  } else if (step === 'loadout') {
    const packageOptions = classRule.loadouts || [];
    const loadoutItems = selectedLoadoutItems();
    const customItems = c.loadout.customItems || [];
    body = `
      ${panel('Step 6 - Loadout', `
        <div class="stack">
          <div>
            <div class="eyebrow">Loadout Preset</div>
            ${renderChoiceCards(packageOptions, c.loadout.package, 'loadout.package', Object.fromEntries(packageOptions.map((name) => [name, `${LOADOUT_PACKAGES[name].items.join(', ')} | ${LOADOUT_PACKAGES[name].weight} enc.`])))}
          </div>
          <div class="split-shell">
            <div class="guide-card">
              <h3>${c.loadout.package}</h3>
              <p class="muted">${loadoutItems.join(', ') || ''}</p>
              <div class="stat-table">
                <div><span>Encumbrance</span><strong>${encumbrance()}</strong></div>
                <div><span>Carry Limit</span><strong>${carryLimit()}</strong></div>
                <div><span>Armor from Loadout</span><strong>+${selectedPackage()?.armorBase || 0}</strong></div>
              </div>
            </div>
            <div class="stack">
              <label><span>Scrap</span><input type="number" min="0" step="1" data-field="loadout.money" value="${escapeHtml(c.loadout.money || '')}" placeholder="0"></label>
              <label><span>Extra Weight</span><input type="number" min="0" step="1" data-field="loadout.extraWeight" value="${c.loadout.extraWeight}"></label>
              <div class="guide-card">
                <div class="eyebrow">Add Individual Item</div>
                <div class="loadout-add-row">
                  <label class="full">
                    <span>Item Name</span>
                    <input list="loadoutItemLibrary" data-field="loadout.itemToAdd" value="${escapeHtml(c.loadout.itemToAdd || '')}" placeholder="e.g. rope, shield, medkit">
                  </label>
                  <button class="ghost-btn" type="button" data-loadout-add="${escapeHtml(c.loadout.itemToAdd || '')}">Add Item</button>
                </div>
                <datalist id="loadoutItemLibrary">${LOADOUT_ITEM_LIBRARY.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('')}</datalist>
                <div class="mini-list">
                  ${customItems.length
                    ? customItems.map((item) => `<button class="summary-chip interactive removable-chip" type="button" data-loadout-remove="${escapeHtml(item)}">${escapeHtml(item)} <span aria-hidden="true">x</span></button>`).join('')
                    : '<div class="empty-state compact">No individual items added yet.</div>'}
                </div>
              </div>
              <label><span>Additions / Notes</span><textarea data-field="loadout.notes">${c.loadout.notes}</textarea></label>
            </div>
          </div>
        </div>
      `)}
      <div class="split-shell">
        ${panel('Package Breakdown', `
          <div class="guide-card">
            <div class="eyebrow">Included Items</div>
            <div class="mini-list">${loadoutItems.map((item) => `<div class="summary-chip">${escapeHtml(item)}</div>`).join('') || '<div class="empty-state compact">No items in the current loadout.</div>'}</div>
            <div class="eyebrow">Relevant Chapters</div>
            <div class="mini-list">${EQUIPMENT_REFERENCES.map((title) => `<button class="mini-link" data-open-section="Equipment" data-open-page="${title}">${title}</button>`).join('')}</div>
          </div>
        `)}
        ${panel('Loadout Notes', `
          <div class="guide-card">
            <p class="muted">The shared view of the equipment subpages is inconsistent. Instead of empty readers, this panel shows package contents, custom additions, and direct chapter links.</p>
            <div class="stat-table">
              <div><span>Package Weight</span><strong>${selectedPackage()?.weight || 0}</strong></div>
              <div><span>Armor Added</span><strong>+${selectedPackage()?.armorBase || 0}</strong></div>
              <div><span>Custom Items</span><strong>${customItems.length}</strong></div>
              <div><span>Scrap Carried</span><strong>${c.loadout.money || 0}</strong></div>
            </div>
          </div>
        `)}
      </div>
    `;
  } else if (step === 'magic') {
    const activeMagicLists = Object.entries(SPELL_SECTION_LABELS)
      .map(([key, label]) => ({key, label, items: availableSpellChoices(key)}))
      .filter(({items}) => items.length);
    const preview = currentMagicPreview();
    const choicesPane = activeMagicLists.length ? `
      <div class="stack">
        ${magicAccess().elemental ? `
          <div class="guide-card">
            <div class="eyebrow">Elemental Access</div>
            <div class="summary-row">
              <div class="summary-chip">${elementalAccessSummary()}</div>
              ${autoChannelSpellNames().map((spell) => `<div class="summary-chip">${spell}</div>`).join('')}
            </div>
            ${elementalLoreChoices().length ? `<div class="inline-actions">${fixedElementalLore() ? `<div class="summary-chip">Fixed lore from subclass</div>` : renderChoiceCards(elementalLoreChoices(), chosenElementalLore(), 'profile.elementalLore')}</div>` : ''}
          </div>
        ` : ''}
        ${activeMagicLists.map(({key, label, items}) => `
          <label>
            <span>${label} (${state.character.magic[key].length}/${spellPickLimit(key)})</span>
            <small class="muted">${items.length} available at this level${key === 'elemental' ? ` | ${elementalAccessSummary()}` : ''}.</small>
            <div class="spell-picker">${renderOptionList(items, state.character.magic[key], `magic.${key}`, Object.fromEntries(items.map((title) => [title, previewTextFor(key, title)])), key)}</div>
          </label>
        `).join('')}
      </div>
    ` : '<div class="empty-state compact">This class or subclass has no selectable magic or maneuvers at this level.</div>';
    const previewPane = (variant = 'desktop') => `
      <div class="split-shell magic-preview-shell">
        ${panel('Spellcasting Rules', `
          <pre class="reader-text compact">${handbookPreview(handbookPage('Magic', 'Casting Spells') || handbookPage('Magic', 'What Is A Spell?'))}</pre>
          <div class="summary-row">
            ${magicAccess().elemental ? `<div class="summary-chip">${elementalAccessSummary()}</div>` : ''}
            ${autoChannelSpellNames().length ? `<div class="summary-chip">${autoChannelSpellNames().length} auto channels unlocked</div>` : ''}
          </div>
        `)}
        ${panel('Spell Preview', `
          <div ${variant === 'desktop' ? 'id="hoverPreviewPanel"' : ''} data-hover-preview-panel="${variant}">${preview ? renderSpellPreview(preview.key, preview.title) : '<div class="empty-state compact">Hover a spell or maneuver, or select one, to inspect its effect, unlock requirement, and description.</div>'}</div>
          <div class="inline-actions"><button class="ghost-btn ${preview ? '' : 'hidden'}" ${variant === 'desktop' ? 'id="hoverPreviewOpen"' : ''} data-hover-preview-open="${variant}" ${preview ? `data-open-section="${preview.label}" data-open-page="${preview.title}"` : ''}>Open in Compendium</button></div>
        `)}
      </div>
    `;
    body = `
      ${panel('Step 7 - Magic & Maneuvers', `
        <div class="mobile-panel-switch">
          <button class="filter-btn ${state.magicMobilePanel === 'choices' ? 'active' : ''}" type="button" data-magic-panel="choices">Choices</button>
          <button class="filter-btn ${state.magicMobilePanel === 'preview' ? 'active' : ''}" type="button" data-magic-panel="preview">Preview</button>
        </div>
        <div class="mobile-panel ${state.magicMobilePanel === 'choices' ? 'active' : ''}">${choicesPane}</div>
        <div class="mobile-panel ${state.magicMobilePanel === 'preview' ? 'active' : ''}">${previewPane('mobile')}</div>
      `)}
      <div class="desktop-only">${previewPane('desktop')}</div>
    `;
  } else if (step === 'notes') {
    body = panel('Step 8 - Finish', `
      <div class="split-shell finish-shell">
        <div class="form-grid two">
          <label><span>Appearance</span><textarea data-field="notes.appearance">${c.notes.appearance}</textarea></label>
          <label><span>Backstory</span><textarea data-field="notes.backstory">${c.notes.backstory}</textarea></label>
          <label><span>Allies & Companions</span><textarea data-field="notes.allies">${c.notes.allies}</textarea></label>
          <label><span>Goals</span><textarea data-field="notes.goals">${c.notes.goals}</textarea></label>
          <label class="full"><span>Misc</span><textarea data-field="notes.misc">${c.notes.misc}</textarea></label>
        </div>
        <div class="guide-card">
          <div class="eyebrow">Export Readiness</div>
          <div class="stat-table">
            <div><span>Profile</span><strong>${stepIsComplete('profile') ? 'Ready' : 'Missing'}</strong></div>
            <div><span>Species</span><strong>${stepIsComplete('species') ? 'Ready' : 'Missing'}</strong></div>
            <div><span>Class</span><strong>${stepIsComplete('class') ? 'Ready' : 'Missing'}</strong></div>
            <div><span>Loadout</span><strong>${stepIsComplete('loadout') ? 'Ready' : 'Missing'}</strong></div>
          </div>
          <p class="muted">Use the main footer action below to export the finished sheet.</p>
        </div>
      </div>
    `);
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
          <div class="summary-chip">${stepIsComplete(step) ? 'Step complete' : 'Step incomplete'}</div>
          <div class="summary-chip">Progress ${BUILDER_STEPS.filter((item) => stepIsComplete(item.id)).length}/${BUILDER_STEPS.length}</div>
        </div>
      </div>
    </section>
    ${body}
    <section class="wizard-nav">
      <button class="tab-btn ${currentStepIndex() === 0 ? 'disabled' : ''}" data-step-nav="-1" ${currentStepIndex() === 0 ? 'disabled' : ''}>Back</button>
      <button class="primary-btn" data-step-nav="1">${currentStepIndex() === BUILDER_STEPS.length - 1 ? 'Export PDF' : 'Continue'}</button>
    </section>
  `;
}

function renderCompendium() {
  const page = selectedPageRecord();
  const sections = handbookSections();
  const currentPages = meaningfulPages(state.selectedSection);
  const visibleItems = searchItems();
  const cleaned = sanitizePageText(page);
  const pageText = cleaned || compendiumFallbackText(page);
  const contentBlocks = compendiumBlocksFromText(pageText, cleanLabel(page?.title || 'Content'));
  const contentAnchors = contentBlocks.map((block) => ({label: block.title, id: block.anchorId}));
  return `
    <section class="panel compendium-shell">
      <div class="compendium-sidebar">
        <label class="search-box"><span>Search</span><input id="searchInput" value="${state.search}" placeholder="Spell, class, condition ..."></label>
        <div class="guide-card compact">
          <div class="eyebrow">Navigation</div>
          <p class="muted">${state.search ? `Search active: ${visibleItems.length} results across all sections.` : `${currentPages.length} entries in ${state.selectedSection}.`}</p>
        </div>
        <div class="filter-list">
          ${sections.map((section) => `<button class="filter-btn ${section === state.selectedSection ? 'active' : ''}" data-section="${section}">${section}</button>`).join('')}
        </div>
        <div class="page-list">
          ${visibleItems.map((item) => `<button class="page-btn ${item.title === state.selectedPage ? 'active' : ''}" data-page="${item.title}"><strong>${cleanLabel(item.title)}</strong><small>${summarySnippet(sanitizePageText(item) || compendiumFallbackText(item), 90)}</small></button>`).join('')}
        </div>
      </div>
      <div class="compendium-reader">
        ${page ? `
          <div class="reader-head">
            <div>
              <div class="eyebrow">${state.selectedSection}</div>
              <h2>${cleanLabel(page.title)}</h2>
              <div class="summary-row">${compendiumStats(page).map((chip) => `<div class="summary-chip">${chip}</div>`).join('')}</div>
            </div>
          </div>
          <div class="compendium-layout">
            <div class="reader-column">
              <div class="guide-card compact compendium-anchor-bar ${contentAnchors.length ? '' : 'hidden'}">
                <div class="eyebrow">Contents</div>
                <div class="mini-list">${contentAnchors.map((anchor) => `<button class="mini-link" type="button" data-compendium-anchor="${escapeHtml(anchor.id)}">${escapeHtml(anchor.label)}</button>`).join('')}</div>
              </div>
              <div class="reader-text structured" id="compendiumReader">
                ${contentBlocks.map((block) => `
                  <section class="reader-block" id="${block.anchorId}">
                    <h3>${escapeHtml(block.title)}</h3>
                    ${block.body ? renderCompendiumBlockBody(block.body) : ''}
                  </section>
                `).join('')}
              </div>
            </div>
            <div class="compendium-aside">
              <div class="guide-card compact">
                <div class="eyebrow">Summary</div>
                <p class="muted">${summarySnippet(pageText, 260)}</p>
              </div>
              <div class="guide-card compact">
                <div class="eyebrow">Related Entries</div>
                <div class="mini-list">${relatedPages(state.selectedSection, page.title, 8).map((item) => `<button class="mini-link" data-page="${item.title}">${item.title}</button>`).join('') || '<div class="summary-chip">No more entries in this section</div>'}</div>
              </div>
            </div>
          </div>
        ` : '<div class="empty-state">Choose a rules entry on the left or search for a term.</div>'}
      </div>
    </section>
  `;
}

function renderExport() {
  return `
    <section class="panel">
      <div class="eyebrow">PDF Pipeline</div>
      <h2>Export & Import</h2>
      <p class="muted">Export creates a readable character sheet plus embedded JSON data inside the PDF. Importing a PDF from this studio restores the saved character state.</p>
      <div class="export-actions">
        <button class="primary-btn" id="exportPdfBtn">Export PDF</button>
        <label class="upload-btn">Import PDF<input type="file" id="importPdfInput" accept="application/pdf"></label>
      </div>
      <div class="panel soft">
        <div class="eyebrow">Included</div>
        <ul class="notes">
          <li>Character basics, build, spells, maneuvers, loadout, and notes</li>
          <li>Embedded restore payload for PDF re-import</li>
          <li>Compatible with PDFs saved from this character studio</li>
        </ul>
      </div>
    </section>
  `;
}

function renderSummary() {
  const c = state.character;
  const skillCount = selectedSkillSet().length;
  const spellCount = c.magic.arias.length + c.magic.divine.length + c.magic.elemental.length + c.magic.wild.length + c.magic.witchcraft.length;
  const maneuverCount = c.magic.maneuvers.length;
  const skillColumns = SKILLS.reduce((columns, skill, index) => {
    columns[index % 2].push(skill);
    return columns;
  }, [[], []]);
  return `
    <div class="summary-card sticky">
      <a class="back-link" href="../index.html#games">Back to Home</a>
      <div class="eyebrow">SoaNW Character Studio</div>
      <h1>${c.profile.name || 'Unnamed Character'}</h1>
      <p class="muted">${[c.profile.speciesSubtype || c.profile.species, c.profile.acquiredSpecies !== 'None' ? c.profile.acquiredSpecies : '', c.profile.className, c.profile.subclass ? `- ${c.profile.subclass}` : ''].filter(Boolean).join(' ')}</p>
      <div class="summary-stats">
        <div><span>Level</span><strong>${c.profile.level}</strong></div>
        <div><span>Proficiency</span><strong>+${proficiencyBonus()}</strong></div>
        <div><span>HP</span><strong>${hitPoints()}</strong></div>
        <div><span>Vitality</span><strong>${vitalityPoints()}</strong></div>
        <div><span>AC</span><strong>${armorClass()}</strong></div>
        <div><span>Speed</span><strong>${speedMeters()}m</strong></div>
      </div>
      <div class="ability-summary">
        ${ABILITIES.map((key) => `<div><span>${ABILITY_LABELS[key].slice(0,3).toUpperCase()}</span><strong>${finalAbilityScore(key)}</strong><small>${mod(finalAbilityScore(key)) >= 0 ? '+' : ''}${mod(finalAbilityScore(key))}</small></div>`).join('')}
      </div>
      <div class="summary-section-label">Skills</div>
      <div class="skill-columns">
        ${skillColumns.map((column) => `
          <div class="skill-column">
            ${column.map((skill) => `<div class="skill-summary-item ${selectedSkillSet().includes(skill) ? 'active' : ''}" title="${skill}: ${ABILITY_LABELS[skillAbility(skill)]} ${selectedSkillSet().includes(skill) ? '+ Proficiency' : ''}"><span>${skill}</span><strong>${skillBonus(skill)}</strong></div>`).join('')}
          </div>
        `).join('')}
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
  const c = state.character;
  app.innerHTML = `
    <div class="studio-shell">
      <aside class="left-rail">${renderSummary()}</aside>
      <main class="main-column">
        <section class="hero">
          <div>
            <div class="eyebrow">D&D-inspired P&P Builder</div>
            <h2>SoaNW Character Studio</h2>
            <p class="muted">Character builder, compendium, and PDF export for Saga of a New World.</p>
            <div class="summary-row hero-chips">
              <div class="summary-chip">Level ${c.profile.level}</div>
              <div class="summary-chip">${c.profile.className}${c.profile.subclass ? ` / ${c.profile.subclass}` : ''}</div>
              <div class="summary-chip">${c.profile.speciesSubtype || c.profile.species}</div>
            </div>
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

function snapshotFocusedField() {
  const active = document.activeElement;
  if (!active?.dataset?.field) return null;
  return {
    path: active.dataset.field,
    start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
    end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
  };
}

function restoreFocusedField(snapshot) {
  if (!snapshot?.path) return;
  const target = document.querySelector(`[data-field="${snapshot.path}"]`);
  if (!target) return;
  target.focus();
  if (typeof target.setSelectionRange === 'function' && snapshot.start !== null && snapshot.end !== null) {
    target.setSelectionRange(snapshot.start, snapshot.end);
  }
}

function renderPreservingFocus() {
  const snapshot = snapshotFocusedField();
  render();
  restoreFocusedField(snapshot);
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
  if (arr.includes(value)) {
    target[keys[0]] = arr.filter((item) => item !== value);
    return;
  }
  if (path === 'proficiencies.skills' && arr.length >= classSkillLimit()) return;
  if (path === 'build.feats' && arr.length >= featSlots()) return;
  if (path.startsWith('magic.')) {
    const groupKey = path.split('.')[1];
    if (!availableSpellChoices(groupKey).includes(value) || arr.length >= spellPickLimit(groupKey)) return;
  }
  target[keys[0]] = [...arr, value];
}

function addLoadoutItem(item) {
  const normalized = cleanLabel(item);
  if (!normalized) return;
  state.character.loadout.customItems = [...new Set([...(state.character.loadout.customItems || []), normalized])];
  state.character.loadout.itemToAdd = '';
}

function removeLoadoutItem(item) {
  state.character.loadout.customItems = (state.character.loadout.customItems || []).filter((entry) => entry !== item);
}

function applyFieldChange(path, value) {
  if (path.startsWith('abilities.')) {
    const spentWithout = pointBuySpent() - (POINT_BUY_COST[Number(state.character.abilities[path.split('.')[1]] || 8)] || 0);
    const nextCost = POINT_BUY_COST[Number(value)] || 0;
    if (Number(value) < 8 || Number(value) > 15 || spentWithout + nextCost > POINT_BUY_BUDGET) return;
  }
  setByPath(path, value);
  if (path === 'profile.species') {
    state.character.profile.speciesSubtype = (SPECIES_OPTIONS[value] || [])[0]?.name || '';
    state.character.proficiencies.skills = [];
    state.character.build.feats = state.character.build.feats.filter((feat) => availableFeats().includes(feat));
    state.speciesDetailSelection = '';
  }
  if (path === 'profile.speciesSubtype') {
    state.character.proficiencies.skills = state.character.proficiencies.skills.filter((skill) => !automaticSkills().includes(skill));
    state.character.build.feats = state.character.build.feats.filter((feat) => availableFeats().includes(feat));
    state.speciesDetailSelection = '';
  }
  if (path === 'profile.acquiredSpecies') {
    state.character.proficiencies.skills = state.character.proficiencies.skills.filter((skill) => !automaticSkills().includes(skill));
    state.character.build.feats = state.character.build.feats.filter((feat) => availableFeats().includes(feat));
    state.speciesDetailSelection = '';
  }
  if (path === 'profile.className') {
    state.character.profile.subclass = SUBCLASS_MAP[value]?.[0] || '';
    state.character.profile.elementalLore = FIXED_ELEMENTAL_LORES[state.character.profile.subclass] || state.character.profile.elementalLore || 'Force';
    state.magicPreview = null;
    state.character.proficiencies.skills = [];
    state.character.loadout.package = CLASS_RULES[value]?.loadouts?.[0] || '';
    const access = magicAccess();
    for (const key of ['arias', 'divine', 'elemental', 'wild', 'witchcraft', 'maneuvers']) {
      if (!access[key]) state.character.magic[key] = [];
    }
  }
  if (path === 'profile.subclass') {
    state.character.profile.elementalLore = FIXED_ELEMENTAL_LORES[value] || state.character.profile.elementalLore || 'Force';
    state.magicPreview = null;
    const access = magicAccess();
    for (const key of ['arias', 'divine', 'elemental', 'wild', 'witchcraft', 'maneuvers']) {
      if (!access[key]) state.character.magic[key] = [];
    }
  }
  if (path === 'profile.elementalLore') {
    state.character.magic.elemental = state.character.magic.elemental.filter((title) => availableSpellChoices('elemental').includes(title));
    if (state.magicPreview?.key === 'elemental'
      && !availableSpellChoices('elemental').includes(state.magicPreview.title)
      && !knownMagicEntries().some((entry) => entry.key === 'elemental' && entry.title === state.magicPreview.title)) {
      state.magicPreview = null;
    }
  }
  if (path === 'profile.level') {
    state.character.build.feats = state.character.build.feats.slice(0, featSlots());
    for (const key of Object.keys(SPELL_SECTION_LABELS)) {
      state.character.magic[key] = state.character.magic[key].filter((title) => availableSpellChoices(key).includes(title));
    }
    if (state.magicPreview && !availableSpellChoices(state.magicPreview.key).includes(state.magicPreview.title) && !knownMagicEntries().some((entry) => entry.key === state.magicPreview.key && entry.title === state.magicPreview.title)) {
      state.magicPreview = null;
    }
  }
}

function handleFieldInput(event) {
  const input = event.target;
  const path = input.dataset.field;
  if (!path) return;
  const value = input.type === 'number' ? Number(input.value) : input.value;
  applyFieldChange(path, value);
  saveState();
  if (path.startsWith('abilities.') || path === 'profile.level') {
    renderPreservingFocus();
  }
}

function handleFieldCommit(event) {
  handleFieldInput(event);
  if (event.target.tagName === 'SELECT') {
    renderPreservingFocus();
  }
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

function compactTierLabel(tier, lore = '') {
  const tierMap = {Novice: 'Nov', Apprentice: 'App', Adept: 'Ade', Expert: 'Exp', Master: 'Mas', Beginner: 'Beg', Veteran: 'Vet', Elite: 'Elt'};
  const loreMap = {Force: 'For', Light: 'Lgt', Frost: 'Frs', Lightning: 'Ltg', Fire: 'Fir', Life: 'Lif'};
  const tierShort = tierMap[tier] || tier || '';
  const loreShort = loreMap[lore] || lore.slice(0, 3) || '';
  return [tierShort, loreShort].filter(Boolean).join(' ');
}

function ruleBodyLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Novice|Apprentice|Adept|Expert|Master|Beginner|Veteran|Elite)\b/i.test(line))
    .filter((line) => !/^(Vitality Cost|Casting Time|Use Time|Range|Duration|Requires):/i.test(line))
    .filter((line) => !/^Channel /i.test(line));
}

function compactRuleSnippet(text, maxLength = 28) {
  const lines = ruleBodyLines(text);
  const joined = lines.join(' ');
  const patterns = [
    /\b\d+d\d+(?:\s*\+\s*\d+)?\s+[A-Za-z-]+\s+damage\b/i,
    /\badvantage on [^.]+/i,
    /\bdisadvantage on [^.]+/i,
    /\bknocked prone\b/i,
    /\bunconscious\b/i,
    /\bincapacitated\b/i,
    /\bshocked\b/i,
    /\bscorched\b/i,
    /\bcharmed\b/i,
    /\bfrightened\b/i,
    /\bresistance to [^.]+/i,
    /\bmove up to \d+\s*(?:feet|meters?)\b/i,
    /\bwithout provoking opportunity attacks\b/i,
    /\bevery creature in melee range\b/i,
    /\bConstitution saving throw\b/i,
    /\bDexterity saving throw\b/i,
    /\bIntelligence saving throw\b/i,
  ];
  for (const pattern of patterns) {
    const match = joined.match(pattern);
    if (match) return match[0].slice(0, maxLength);
  }
  const first = lines.find((line) => line.length > 16) || lines[0] || '';
  return first.slice(0, maxLength);
}

function equipmentSlotMap(items) {
  const values = {
    HEAD: '',
    CLOAK: '',
    ARMOR: '',
    'LEFT HAND': '',
    'RIGHT HAND': '',
    BACKPACK: '',
    BOOTS: '',
    'QUICK ACCESS 1': '',
    'QUICK ACCESS 2': '',
    'QUICK ACCESS 3': '',
  };
  const remaining = [];
  for (const item of items) {
    const lower = item.toLowerCase();
    const label = cleanLabel(item);
    if (!values.ARMOR && /armor|vest|coat|jacket|robe|suit|mail|plate|shield/.test(lower)) values.ARMOR = label;
    else if (!values.HEAD && /helmet|hood|hat|mask|goggles|glasses/.test(lower)) values.HEAD = label;
    else if (!values.BOOTS && /boots|shoes/.test(lower)) values.BOOTS = label;
    else if (!values.CLOAK && /cloak|cape/.test(lower)) values.CLOAK = label;
    else if (!values['RIGHT HAND'] && /sword|axe|mace|staff|wand|bow|gun|pistol|rifle|shield|blade|knife/.test(lower)) values['RIGHT HAND'] = label;
    else if (!values['LEFT HAND'] && /torch|focus|wand|dagger|knife|potion|kit/.test(lower)) values['LEFT HAND'] = label;
    else remaining.push(label);
  }
  values.BACKPACK = remaining.slice(0, 2).join(', ');
  values['QUICK ACCESS 1'] = remaining[2] || '';
  values['QUICK ACCESS 2'] = remaining[3] || '';
  values['QUICK ACCESS 3'] = remaining[4] || '';
  return values;
}

function splitInventoryRows(items, notes = '') {
  const rows = [];
  const normalized = [...items];
  if (notes) {
    const extras = String(notes)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    normalized.push(...extras);
  }
  for (let index = 0; index < normalized.length; index += 1) {
    rows.push([normalized[index], '1']);
    if (rows.length >= 3) break;
  }
  return rows;
}

const PDF_PAGE_TWO_FIELDS = new Set([
  'Alignment', 'AGE', 'HEIGHT', 'WEIGHT', 'EYES', 'SKIN', 'HAIR', 'MARKS',
  'Long Rest', 'Night Rest', 'Current Hunger', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'Disease Name 1', 'Effect 1', 'Disease 1', 'Injury 1', 'Disease Name 2', 'Effect 2', 'Disease 2', 'Injury 2',
  'Disease Name 3', 'Effect 3', 'Disease 3', 'Injury 3', 'Text32', 'C Name', 'C Speed', 'C INIT', 'C AC',
  'C Unarmored AC', 'C STR', 'C STR MOD', 'C DEX', 'C DEX MOD', 'C CON', 'C CON MOD', 'C INT', 'C INT MOD',
  'C WIS', 'C WIS MOD', 'C CHA', 'C CHA MOD', 'C Skills', 'C C HP', 'C C VIT', 'C Max HP', 'C MAX VIT',
  'LOYALTY', 'UPKEEP', 'C AT NAME 1', 'C AT BONUS 1', 'C AT DMG 1', 'C Additional Features', 'Rations', 'Scrap',
  'HEAD', 'CLOAK', 'ARMOR', 'LEFT HAND', 'RIGHT HAND', 'BACKPACK', 'BOOTS', 'QUICK ACCESS 1', 'QUICK ACCESS 2',
  'QUICK ACCESS 3', 'Current Encumberment', 'Maximum Encumberment', 'SI Name 1', 'SI Quantity 1', 'SI Name 2',
  'SI Quantity 2', 'SI Name 3', 'SI Quantity 3', 'Inventory', 'C AT NAME 2', 'C AT BONUS 2', 'C AT DMG 2',
]);

const PDF_MULTILINE_FIELDS = new Set([
  'OTHER PROFICIENCIES', 'RACE FEAT', 'Feature 1', 'Inventory', 'BACKPACK', 'Text32', 'C Additional Features',
  'C Skills', 'Effect 1', 'Effect 2', 'Effect 3',
]);

const PDF_CENTERED_FIELDS = new Set([
  'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA', 'STR Mod', 'DEX Mod', 'CON Mod', 'INT Mod', 'WIS Mod', 'CHA Mod',
  'Proficiency Bonus', 'Passive Perception', 'HP MAX', 'HP', 'TEMP HP', 'VIT MAX', 'VIT', 'TEMP VIT', 'AC',
  'INITIATIVE', 'SPEED', 'Unarmored AC', 'SK0', 'SK1', 'SK2', 'SK3', 'SK4', 'SK5', 'SK6', 'SK7', 'SK8', 'SK9',
  'SK10', 'SK11', 'SK12', 'SK13', 'SK14', 'SK15', 'SK16', 'SK17', 'SK18', 'SK19', 'SK20', 'HIT DICE', 'HD TOTAL',
  'AT Bonus', 'AT Bonus 1', 'AT Bonus 2', 'AT Bonus 3', 'AT Bonus 4', 'AT Bonus 5', 'AT Bonus 6', 'AT Bonus 7',
  'SP Bonus', 'SP Bonus 1', 'SP Bonus 2', 'SP Bonus 3', 'SP Bonus 4', 'SP Bonus 5', 'SP Bonus 6', 'SP Bonus 7',
  'SP Bonus 8', 'SP Bonus 9', 'SP Bonus 10', 'SP Bonus 11', 'SP Bonus 12', 'SP Bonus 13', 'SP Bonus 14', 'SP Bonus 15',
  'C Speed', 'C INIT', 'C AC', 'C Unarmored AC', 'C STR', 'C STR MOD', 'C DEX', 'C DEX MOD', 'C CON', 'C CON MOD',
  'C INT', 'C INT MOD', 'C WIS', 'C WIS MOD', 'C CHA', 'C CHA MOD', 'C C HP', 'C C VIT', 'C Max HP', 'C MAX VIT',
  'LOYALTY', 'UPKEEP', 'C AT BONUS 1', 'C AT BONUS 2', 'Rations', 'Scrap', 'Current Encumberment', 'Maximum Encumberment',
  'SI Quantity 1', 'SI Quantity 2', 'SI Quantity 3',
]);

const PDF_FIELD_STYLE_OVERRIDES = {
  Name: {maxSize: 18, minSize: 10, padding: 2.5},
  'Class and level': {maxSize: 10, minSize: 6.5, padding: 2.5},
  Race: {maxSize: 10, minSize: 6.5, padding: 2.5},
  EXP: {maxSize: 9, minSize: 6.5, padding: 2.5},
  'OTHER PROFICIENCIES': {maxSize: 8, minSize: 5, padding: 3},
  'RACE FEAT': {maxSize: 7.5, minSize: 4.75, padding: 3},
  'Feature 1': {maxSize: 7.5, minSize: 4.75, padding: 3},
  Inventory: {maxSize: 7.5, minSize: 4.75, padding: 3},
  Text32: {maxSize: 7.5, minSize: 4.75, padding: 3},
  'C Additional Features': {maxSize: 7, minSize: 4.75, padding: 3},
  BACKPACK: {maxSize: 6.5, minSize: 4.75, padding: 2.5},
};

function speciesHitDieLabel() {
  const species = selectedBaseSpeciesData();
  const key = `${species?.hpBase || ''}/${species?.hpPer || ''}`;
  return ({
    '5/3': 'd4',
    '7/4': 'd6',
    '9/5': 'd8',
    '11/6': 'd10',
  })[key] || 'd8';
}

function spellVitalityCost(page) {
  const text = sanitizePageText(page || {});
  const match = text.match(/Vitality Cost:\s*([^\n]+)/i);
  return match ? match[1].replace(/\s+/g, ' ').trim().slice(0, 10) : '-';
}

async function exportPdf() {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const c = state.character;
  const templateBytes = await fetch(PDF_TEMPLATE_URL).then((response) => {
    if (!response.ok) throw new Error('The SoaNW base sheet could not be loaded.');
    return response.arrayBuffer();
  });
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const cachedFieldMeta = new Map(form.getFields().map((field) => {
    const widgets = field.acroField?.getWidgets?.() || [];
    const widget = field.getName() === 'Name' ? widgets[widgets.length - 1] : widgets[0];
    const rect = widget?.getRectangle?.();
    return [field.getName(), rect ? {
      page: PDF_PAGE_TWO_FIELDS.has(field.getName()) ? pages[1] : pages[0],
      x: Number(rect.x || 0),
      y: Number(rect.y || 0),
      width: Number(rect.width || 120),
      height: Number(rect.height || 18),
    } : null];
  }));
  form.flatten();
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(state.character))));
  const selectedSkills = selectedSkillSet();
  const speciesData = selectedSpeciesData();
  const packageItems = selectedLoadoutItems();
  const loadoutSlots = equipmentSlotMap(packageItems);
  const inventoryRows = splitInventoryRows(packageItems.map(cleanLabel), c.loadout.notes);
  const maneuverRows = c.magic.maneuvers.map((title) => {
    const page = spellPageRecord('maneuvers', title);
    const context = spellContextForTitle('maneuvers', title);
    return [cleanLabel(title), compactTierLabel(context.tier), compactRuleSnippet(sanitizePageText(page || {}), 30)];
  });
  const attackRows = [...weaponRows(packageItems), ...offensiveMagicRows()];
  const magicRows = knownMagicEntries().map((entry) => {
    const context = spellContextForTitle(entry.key, entry.title);
    const page = spellPageRecord(entry.key, entry.title);
    return [
      cleanLabel(entry.title),
      spellVitalityCost(page),
      compactRuleSnippet(sanitizePageText(page || {}), 30) || SPELL_SECTION_LABELS[entry.key],
    ];
  });
  const fieldMeta = (fieldName) => {
    return cachedFieldMeta.get(fieldName) || null;
  };
  const wrapForWidth = (text, activeFont, size, width) => {
    const maxWidth = Math.max(8, width);
    const lines = [];
    for (const sourceLine of String(text || '').split('\n')) {
      const words = sourceLine.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push('');
        continue;
      }
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (activeFont.widthOfTextAtSize(candidate, size) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        line = word;
      }
      if (line) lines.push(line);
    }
    return lines;
  };
  const drawTextField = (fieldName, value, overrides = {}) => {
    const raw = String(value ?? '').trim();
    if (!raw) return;
    const meta = fieldMeta(fieldName);
    if (!meta) return;
    const style = {
      multiline: PDF_MULTILINE_FIELDS.has(fieldName),
      align: PDF_CENTERED_FIELDS.has(fieldName) ? 'center' : 'left',
      maxSize: PDF_MULTILINE_FIELDS.has(fieldName) ? 8 : 9,
      minSize: PDF_MULTILINE_FIELDS.has(fieldName) ? 4.75 : 6,
      padding: PDF_MULTILINE_FIELDS.has(fieldName) ? 3 : 2,
      lineHeight: 1.12,
      valign: PDF_MULTILINE_FIELDS.has(fieldName) ? 'top' : 'middle',
      font: font,
      color: rgb(0.08, 0.08, 0.08),
      ...PDF_FIELD_STYLE_OVERRIDES[fieldName],
      ...overrides,
    };
    const maxWidth = Math.max(8, meta.width - style.padding * 2);
    let bestSize = style.minSize;
    let lines = [raw];
    for (let size = style.maxSize; size >= style.minSize; size -= 0.25) {
      const candidateLines = wrapForWidth(raw, style.font, size, maxWidth);
      const totalHeight = candidateLines.length * size * style.lineHeight;
      const availableHeight = Math.max(6, meta.height - style.padding * 2);
      if (totalHeight <= availableHeight || (!style.multiline && candidateLines.length === 1)) {
        bestSize = size;
        lines = candidateLines;
        break;
      }
      lines = candidateLines;
    }
    const totalHeight = lines.length * bestSize * style.lineHeight;
    let y = style.valign === 'top'
      ? meta.y + meta.height - style.padding - bestSize
      : meta.y + (meta.height + totalHeight) / 2 - bestSize;
    lines.forEach((line) => {
      const textWidth = style.font.widthOfTextAtSize(line, bestSize);
      const x = style.align === 'center'
        ? meta.x + Math.max(style.padding, (meta.width - textWidth) / 2)
        : meta.x + style.padding;
      meta.page.drawText(line, {x, y, size: bestSize, font: style.font, color: style.color});
      y -= bestSize * style.lineHeight;
    });
  };
  const drawCheckMark = (fieldName, active = true) => {
    if (!active) return;
    const meta = fieldMeta(fieldName);
    if (!meta) return;
    const pad = Math.min(2, meta.width / 6, meta.height / 6);
    meta.page.drawLine({
      start: {x: meta.x + pad, y: meta.y + pad},
      end: {x: meta.x + meta.width - pad, y: meta.y + meta.height - pad},
      thickness: 1.1,
      color: rgb(0.08, 0.08, 0.08),
    });
    meta.page.drawLine({
      start: {x: meta.x + pad, y: meta.y + meta.height - pad},
      end: {x: meta.x + meta.width - pad, y: meta.y + pad},
      thickness: 1.1,
      color: rgb(0.08, 0.08, 0.08),
    });
  };
  const setRows = (fieldTriples, rows) => {
    fieldTriples.forEach(([nameField, bonusField, valueField], index) => {
      const row = rows[index] || [];
      drawTextField(nameField, row[0] || '');
      if (bonusField) drawTextField(bonusField, row[1] || '');
      if (valueField) drawTextField(valueField, row[2] || '');
    });
  };
  const attackFields = [
    ['AT Name', 'AT Bonus', 'AT DAM'],
    ['AT NAME 1', 'AT Bonus 1', 'AT DAM 1'],
    ['AT NAME 2', 'AT Bonus 2', 'AT DAM 2'],
    ['AT NAME 3', 'AT Bonus 3', 'AT DAM 3'],
    ['AT NAME 4', 'AT Bonus 4', 'AT DAM 4'],
    ['AT NAME 5', 'AT Bonus 5', 'AT DAM 5'],
    ['AT NAME 6', 'AT Bonus 6', 'AT DAM 6'],
    ['AT NAME 7', 'AT Bonus 7', 'AT DAM 7'],
  ];
  const spellFields = [
    ['SP Name', 'SP Bonus', 'SP DAM'],
    ['SP NAME 1', 'SP Bonus 1', 'SP DAM 1'],
    ['SP NAME 2', 'SP Bonus 2', 'SP DAM 2'],
    ['SP NAME 3', 'SP Bonus 3', 'SP DAM 3'],
    ['SP NAME 4', 'SP Bonus 4', 'SP DAM 4'],
    ['SP NAME 5', 'SP Bonus 5', 'SP DAM 5'],
    ['SP NAME 6', 'SP Bonus 6', 'SP DAM 6'],
    ['SP NAME 7', 'SP Bonus 7', 'SP DAM 7'],
    ['SP Name 8', 'SP Bonus 8', 'SP DAM 8'],
    ['SP NAME 9', 'SP Bonus 9', 'SP DAM 9'],
    ['SP NAME 10', 'SP Bonus 10', 'SP DAM 10'],
    ['SP NAME 11', 'SP Bonus 11', 'SP DAM 11'],
    ['SP NAME 12', 'SP Bonus 12', 'SP DAM 12'],
    ['SP NAME 13', 'SP Bonus 13', 'SP DAM 13'],
    ['SP NAME 14', 'SP Bonus 14', 'SP DAM 14'],
    ['SP NAME 15', 'SP Bonus 15', 'SP DAM 15'],
  ];
  const passivePerception = 10 + Number(skillBonus('Perception'));
  const dieLabel = speciesHitDieLabel();
  const totalHitDice = `${Number(c.profile.level || 1) + 2}${dieLabel}`;
  drawTextField('Name', c.profile.name || '', {font: boldFont});
  drawTextField('Class and level', `${c.profile.className}${c.profile.subclass ? ` / ${c.profile.subclass}` : ''} Lv.${c.profile.level}`);
  drawTextField('Race', [c.profile.speciesSubtype || c.profile.species, c.profile.acquiredSpecies !== 'None' ? c.profile.acquiredSpecies : ''].filter(Boolean).join(' / '));
  drawTextField('EXP', c.profile.player || '');
  drawTextField('Alignment', '');
  drawTextField('STR', finalAbilityScore('str'));
  drawTextField('DEX', finalAbilityScore('dex'));
  drawTextField('CON', finalAbilityScore('con'));
  drawTextField('INT', finalAbilityScore('int'));
  drawTextField('WIS', finalAbilityScore('wis'));
  drawTextField('CHA', finalAbilityScore('cha'));
  drawTextField('STR Mod', mod(finalAbilityScore('str')) >= 0 ? `+${mod(finalAbilityScore('str'))}` : mod(finalAbilityScore('str')));
  drawTextField('DEX Mod', mod(finalAbilityScore('dex')) >= 0 ? `+${mod(finalAbilityScore('dex'))}` : mod(finalAbilityScore('dex')));
  drawTextField('CON Mod', mod(finalAbilityScore('con')) >= 0 ? `+${mod(finalAbilityScore('con'))}` : mod(finalAbilityScore('con')));
  drawTextField('INT Mod', mod(finalAbilityScore('int')) >= 0 ? `+${mod(finalAbilityScore('int'))}` : mod(finalAbilityScore('int')));
  drawTextField('WIS Mod', mod(finalAbilityScore('wis')) >= 0 ? `+${mod(finalAbilityScore('wis'))}` : mod(finalAbilityScore('wis')));
  drawTextField('CHA Mod', mod(finalAbilityScore('cha')) >= 0 ? `+${mod(finalAbilityScore('cha'))}` : mod(finalAbilityScore('cha')));
  drawTextField('Proficiency Bonus', `+${proficiencyBonus()}`);
  drawTextField('Passive Perception', String(passivePerception));
  drawTextField('HP MAX', hitPoints());
  drawTextField('HP', hitPoints());
  drawTextField('VIT MAX', vitalityPoints());
  drawTextField('VIT', vitalityPoints());
  drawTextField('AC', armorClass());
  drawTextField('INITIATIVE', mod(finalAbilityScore('dex')) >= 0 ? `+${mod(finalAbilityScore('dex'))}` : mod(finalAbilityScore('dex')));
  drawTextField('SPEED', `${speedMeters()}m`);
  drawTextField('Unarmored AC', selectedSpeciesData()?.baseAc || '');
  drawTextField('HIT DICE', dieLabel);
  drawTextField('HD TOTAL', totalHitDice);
  SAVE_THROW_FIELDS.forEach(({fieldName, checkField, ability}) => {
    drawTextField(fieldName, saveThrowBonusText(ability));
    drawCheckMark(checkField, saveThrowProficiencies().includes(ability));
  });
  PDF_SKILL_SLOTS.forEach(({fieldName, checkField, skill}) => {
    drawTextField(fieldName, skillModifierText(skill));
    drawCheckMark(checkField, selectedSkills.includes(skill));
  });
  drawTextField('OTHER PROFICIENCIES', [
    `Skills: ${selectedSkills.join(', ') || '-'}`,
    `Auto: ${automaticSkills().join(', ') || '-'}`,
    `Saving Throws: ${saveThrowProficiencies().map((key) => ABILITY_LABELS[key]).join(', ') || '-'}`,
    `Feats: ${c.build.feats.join(', ') || '-'}`,
  ].join('\n\n'));
  drawTextField('RACE FEAT', [
    `Species: ${c.profile.speciesSubtype || c.profile.species}${c.profile.acquiredSpecies !== 'None' ? ` / ${c.profile.acquiredSpecies}` : ''}`,
    `${speciesFeatureText().join(', ') || '-'}`,
    `Elemental Lore: ${magicAccess().elemental ? chosenElementalLore() : '-'}`,
    `Auto Channel: ${autoChannelSpellNames().join(', ') || '-'}`,
  ].join('\n'));
  drawTextField('Feature 1', [
    `Class: ${c.profile.className}${c.profile.subclass ? ` / ${c.profile.subclass}` : ''}`,
    selectedClassRule().description,
    SUBCLASS_SUMMARIES[c.profile.subclass] || '',
    `Feats: ${c.build.feats.join(', ') || '-'}`,
    `Magic: ${knownMagicEntries().map((entry) => cleanLabel(entry.title)).slice(0, 8).join(', ') || '-'}`,
    `Maneuvers: ${c.magic.maneuvers.map(cleanLabel).slice(0, 6).join(', ') || '-'}`,
  ].filter(Boolean).join('\n\n'));
  drawTextField('Inventory', [`Package: ${c.loadout.package || '-'}`, ...packageItems.map(cleanLabel), c.loadout.notes ? `Extra: ${c.loadout.notes}` : ''].filter(Boolean).join('\n'));
  drawTextField('Current Encumberment', encumbrance());
  drawTextField('Maximum Encumberment', carryLimit());
  drawTextField('Rations', rationCount(packageItems, c.loadout.notes) || '');
  drawTextField('Scrap', c.loadout.money || '');
  Object.entries(loadoutSlots).forEach(([fieldName, value]) => drawTextField(fieldName, value));
  setRows(attackFields, attackRows.slice(0, attackFields.length));
  setRows(spellFields, magicRows.slice(0, spellFields.length));
  setRows([
    ['SI Name 1', 'SI Quantity 1'],
    ['SI Name 2', 'SI Quantity 2'],
    ['SI Name 3', 'SI Quantity 3'],
  ], inventoryRows);
  drawTextField('Text32', [
    c.notes.appearance ? `Appearance: ${c.notes.appearance}` : '',
    c.notes.backstory ? `Backstory: ${c.notes.backstory}` : '',
    c.notes.goals ? `Goals: ${c.notes.goals}` : '',
    c.notes.allies ? `Allies: ${c.notes.allies}` : '',
    c.magic.notes ? `Magic Notes: ${c.magic.notes}` : '',
    c.notes.misc ? `Misc: ${c.notes.misc}` : '',
  ].filter(Boolean).join('\n\n'));
  drawTextField('C Name', c.notes.allies ? c.notes.allies.split(',')[0].trim().slice(0, 24) : '');
  drawTextField('C Skills', c.notes.allies ? c.notes.allies : '');
  drawTextField('C Additional Features', c.notes.allies ? `Allies & companions: ${c.notes.allies}` : '');
  const pageTwo = pages[1];
  pageTwo.drawText(c.profile.name || '', {x: 22, y: 724, size: 11, font: boldFont, color: rgb(0.08, 0.08, 0.08)});
  const payloadLines = payload.match(/.{1,70}/g)?.map((chunk, index) => `SOANW_JSON_${index}:${chunk}`) || [];
  const payloadPage = pages[pages.length - 1];
  payloadLines.forEach((line, index) => {
    payloadPage.drawText(line, {
      x: 8,
      y: 6 + index * 3.2,
      size: 2.4,
      font,
      color: rgb(HIDDEN_EXPORT_TEXT.r, HIDDEN_EXPORT_TEXT.g, HIDDEN_EXPORT_TEXT.b),
      opacity: 0.02,
    });
  });
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], {type: 'application/pdf'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${(c.profile.name || 'soanw-character').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function runPdfExport() {
  if (!window.PDFLib?.PDFDocument) {
    window.alert('PDF export is currently unavailable because pdf-lib did not load.');
    return;
  }
  try {
    await exportPdf();
  } catch (error) {
    console.error(error);
    window.alert(`PDF export failed: ${error.message || error}`);
  }
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
  const renderSpeciesReference = (entryId = state.speciesDetailSelection) => {
    const entries = speciesReferenceEntries();
    const entry = entries.find((item) => item.id === entryId) || currentSpeciesReferenceEntry(entries);
    const panel = document.getElementById('speciesFeaturePanel');
    const actions = document.getElementById('speciesFeatureActions');
    if (!panel || !entry) return;
    panel.innerHTML = renderInfoPreviewCard({
      eyebrow: entry.eyebrow || 'Species Reference',
      title: entry.name,
      chips: entry.chips || [],
      bodyHtml: entry.bodyHtml || '',
      text: entry.text || '',
    });
    if (actions) actions.innerHTML = entry ? openCompendiumButton(entry.section, entry.page) : '';
    actions?.querySelector('[data-open-page]')?.addEventListener('click', (event) => {
      const current = event.currentTarget;
      if (!current.dataset.openPage) return;
      state.tab = 'compendium';
      state.selectedSection = current.dataset.openSection;
      state.selectedPage = current.dataset.openPage;
      state.search = '';
      state.filteredPages = [];
      state.compendiumAnchor = '';
      render();
    });
  };
  document.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', handleFieldInput);
    input.addEventListener('change', handleFieldCommit);
  });
  document.querySelectorAll('[data-toggle-field]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.toggleField.startsWith('magic.')) {
        state.magicPreview = {
          key: button.dataset.toggleField.split('.')[1],
          label: SPELL_SECTION_LABELS[button.dataset.toggleField.split('.')[1]],
          title: button.dataset.toggleValue,
        };
      }
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
    if (state.builderStep !== 'magic') state.magicMobilePanel = 'choices';
    render();
  }));
  document.querySelectorAll('[data-step-nav]').forEach((button) => button.addEventListener('click', () => {
    if (Number(button.dataset.stepNav) > 0 && !stepIsComplete(state.builderStep)) return;
    const next = currentStepIndex() + Number(button.dataset.stepNav);
    if (next >= BUILDER_STEPS.length) {
      runPdfExport();
      return;
    }
    if (next < 0) return;
    state.builderStep = BUILDER_STEPS[next].id;
    render();
  }));
  document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => {
    state.selectedSection = button.dataset.section;
    const firstPage = meaningfulPages(state.selectedSection)[0];
    state.selectedPage = firstPage?.title || '';
    state.search = '';
    state.filteredPages = [];
    state.compendiumAnchor = '';
    render();
  }));
  document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => {
    state.selectedPage = button.dataset.page;
    const found = state.filteredPages.find((page) => page.title === button.dataset.page);
    if (found?.section) state.selectedSection = found.section;
    state.compendiumAnchor = '';
    render();
  }));
  document.querySelectorAll('[data-open-page]').forEach((button) => button.addEventListener('click', () => {
    state.tab = 'compendium';
    state.selectedSection = button.dataset.openSection;
    state.selectedPage = button.dataset.openPage;
    state.search = '';
    state.filteredPages = [];
    state.compendiumAnchor = '';
    render();
  }));
  document.querySelectorAll('[data-magic-panel]').forEach((button) => button.addEventListener('click', () => {
    state.magicMobilePanel = button.dataset.magicPanel || 'choices';
    render();
  }));
  document.querySelectorAll('[data-compendium-anchor]').forEach((button) => button.addEventListener('click', () => {
    const anchor = button.dataset.compendiumAnchor || '';
    state.compendiumAnchor = anchor;
    const reader = document.getElementById('compendiumReader');
    const target = anchor ? document.getElementById(anchor) : null;
    if (!reader || !target) return;
    reader.scrollTop = Math.max(0, target.offsetTop - reader.offsetTop - 8);
  }));
  document.querySelectorAll('[data-hover-preview-open]').forEach((button) => button.addEventListener('click', (event) => {
    const current = event.currentTarget;
    if (!current.dataset.openPage) return;
    state.tab = 'compendium';
    state.selectedSection = current.dataset.openSection;
    state.selectedPage = current.dataset.openPage;
    state.search = '';
    state.filteredPages = [];
    state.compendiumAnchor = '';
    render();
  }));
  document.getElementById('searchInput')?.addEventListener('input', (event) => {
    state.search = event.target.value;
    refreshSearch();
    render();
  });
  document.getElementById('exportPdfBtn')?.addEventListener('click', runPdfExport);
  document.getElementById('finishExportBtn')?.addEventListener('click', runPdfExport);
  document.querySelectorAll('[data-loadout-add]').forEach((button) => button.addEventListener('click', () => {
    addLoadoutItem(state.character.loadout.itemToAdd || button.dataset.loadoutAdd || '');
    saveState();
    render();
  }));
  document.querySelectorAll('[data-loadout-remove]').forEach((button) => button.addEventListener('click', () => {
    removeLoadoutItem(button.dataset.loadoutRemove || '');
    saveState();
    render();
  }));
  document.querySelectorAll('[data-species-entry]').forEach((button) => {
    const entryId = button.dataset.speciesEntry || '';
    button.addEventListener('mouseenter', () => renderSpeciesReference(entryId));
    button.addEventListener('focus', () => renderSpeciesReference(entryId));
    button.addEventListener('mouseleave', () => renderSpeciesReference(state.speciesDetailSelection));
    button.addEventListener('blur', () => renderSpeciesReference(state.speciesDetailSelection));
    button.addEventListener('click', () => {
      state.speciesDetailSelection = entryId;
      render();
    });
  });
  document.getElementById('importPdfInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importPdf(file);
    } catch (error) {
      alert(error.message);
    }
  });
  document.querySelectorAll('[data-preview-group]').forEach((button) => {
    const updatePreview = () => {
      const group = button.dataset.previewGroup;
      const title = button.dataset.previewTitle;
      const skillsPanel = document.getElementById('skillsHoverPanel');
      const spellPanels = document.querySelectorAll('[data-hover-preview-panel]');
      if ((group === 'skills' || group === 'feats') && skillsPanel) {
        const text = group === 'skills' ? (SKILL_DESCRIPTIONS[title] || title) : handbookPreview(handbookPage('Customization', title), title);
        const chips = group === 'skills' ? [ABILITY_LABELS[skillAbility(title)], `Bonus ${skillBonus(title)}`] : ['Feat'];
        skillsPanel.innerHTML = renderInfoPreviewCard({
          eyebrow: group === 'skills' ? 'Skill Detail' : 'Feat Detail',
          title,
          text,
          chips,
          section: group === 'feats' ? 'Customization' : '',
          page: group === 'feats' ? title : '',
        });
      }
      if (spellPanels.length && SPELL_SECTION_LABELS[group]) {
        state.magicPreview = {key: group, label: SPELL_SECTION_LABELS[group], title};
        spellPanels.forEach((panel) => { panel.innerHTML = renderSpellPreview(group, title); });
        document.querySelectorAll('[data-hover-preview-open]').forEach((previewOpen) => {
          previewOpen.dataset.openSection = SPELL_SECTION_LABELS[group];
          previewOpen.dataset.openPage = title;
          previewOpen.classList.remove('hidden');
        });
      }
    };
    button.addEventListener('mouseenter', updatePreview);
    button.addEventListener('focus', updatePreview);
  });
  document.querySelectorAll('[data-preview-target]').forEach((button) => {
    const updatePreview = () => {
      const target = document.getElementById(button.dataset.previewTarget);
      if (!target) return;
      target.innerHTML = renderInfoPreviewCard({
        eyebrow: button.dataset.previewEyebrow || 'Detail',
        title: button.dataset.previewTitle || button.textContent || 'Preview',
        text: button.dataset.previewText || button.textContent || '',
        chips: (button.dataset.previewChips || '').split('||').filter(Boolean),
        section: button.dataset.previewSection || '',
        page: button.dataset.previewPage || '',
      });
    };
    button.addEventListener('mouseenter', updatePreview);
    button.addEventListener('focus', updatePreview);
  });
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#11111a;--bg2:#201924;--panel:#191622;--soft:#221d2b;--line:rgba(255,255,255,.11);--text:#f8f4ef;--muted:#b9afbf;--accent:#f0c36c;--accent2:#7fd1ff;--ink:#211923}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(circle at top left,rgba(127,209,255,.16),transparent 24%),radial-gradient(circle at bottom right,rgba(240,195,108,.14),transparent 26%),linear-gradient(180deg,#100f18,#1b1420 52%,#120f18);color:var(--text);padding:24px}button,input,select,textarea{font:inherit}
    .studio-shell{width:min(1480px,100%);margin:0 auto;display:grid;grid-template-columns:320px minmax(0,1fr);gap:20px}.left-rail{display:grid;align-content:start}.summary-card,.panel,.hero,.tab-btn,.pill,.filter-btn,.page-btn,.primary-btn,.upload-btn,.choice-card,.ghost-btn,.wizard-step,.guide-card,.search-box{border:1px solid var(--line);border-radius:24px;background:rgba(25,22,34,.82);backdrop-filter:blur(14px)}.summary-card.sticky{position:sticky;top:24px;padding:20px}.back-link{text-decoration:none;display:inline-flex;margin-bottom:14px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text)}h1,h2,h3{margin:0}.muted{color:var(--muted)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.78rem;color:var(--accent)}
    .summary-stats,.ability-summary{display:grid;gap:10px}.summary-stats{grid-template-columns:repeat(2,1fr);margin:18px 0}.summary-stats div,.ability-summary div,.summary-chip,.summary-pill{padding:12px;border-radius:18px;background:rgba(255,255,255,.04)}.summary-chip.wide{width:100%;line-height:1.45;white-space:pre-wrap}.summary-chip.success{background:rgba(127,209,255,.18);color:var(--text)}.summary-chip.warning{background:rgba(240,195,108,.16);color:var(--text)}.summary-stats span,.ability-summary span{display:block;color:var(--muted);font-size:.78rem}.ability-summary{grid-template-columns:repeat(3,1fr);margin-bottom:14px}.ability-summary strong{display:block;font-size:1.1rem}.ability-summary small{color:var(--accent2)}.summary-section-label{margin:6px 0 10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}.summary-foot{display:flex;gap:10px;flex-wrap:wrap;color:var(--muted);margin-top:12px}.skill-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:0}.skill-column{display:grid;gap:8px}.skill-summary-item{padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.04);display:flex;justify-content:space-between;gap:10px;align-items:center}.skill-summary-item span{font-size:.82rem;color:var(--muted);line-height:1.2}.skill-summary-item strong{font-size:.95rem}.skill-summary-item.active{background:rgba(127,209,255,.14);box-shadow:inset 0 0 0 1px rgba(127,209,255,.3)}
    .main-column{display:grid;gap:18px}.hero{padding:18px;display:flex;justify-content:space-between;gap:18px;align-items:end}.hero-chips{margin-top:12px}.tab-row{display:flex;gap:10px;flex-wrap:wrap}.tab-btn{padding:12px 16px;color:var(--text);cursor:pointer}.tab-btn.active,.primary-btn,.upload-btn{background:linear-gradient(135deg,#f0c36c,#ffdd96);color:var(--ink)}.tab-btn.disabled{opacity:.45;cursor:default}
    .panel{padding:18px;display:grid;gap:16px}.panel.soft{background:rgba(255,255,255,.04)}.panel-head{display:flex;justify-content:space-between;gap:12px}.form-grid{display:grid;gap:14px}.form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}label{display:grid;gap:8px}label.full{grid-column:1/-1}input,select,textarea{width:100%;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text)}textarea{min-height:112px;resize:vertical}
    .ability-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.ability-card{padding:14px;border-radius:20px;background:rgba(255,255,255,.04)}.ability-card strong{font-size:1.4rem}.summary-row{display:flex;gap:10px;flex-wrap:wrap}.summary-chip{color:var(--text)}
    .pill-grid{display:flex;flex-wrap:wrap;gap:8px}.pill,.filter-btn,.page-btn,.wizard-step,.ghost-btn,.mini-link,.summary-chip.interactive{padding:10px 12px;color:var(--text);cursor:pointer}.pill.active,.filter-btn.active,.page-btn.active,.wizard-step.active,.choice-card.active,.summary-chip.interactive.active{background:linear-gradient(135deg,#7fd1ff,#b4e7ff);color:var(--ink)}.summary-chip.interactive{text-align:left;border:1px solid var(--line)}.summary-chip.interactive:hover,.summary-chip.interactive:focus{background:rgba(127,209,255,.16)}
    .wizard-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;position:sticky;top:24px;z-index:4}.wizard-step{display:flex;align-items:center;gap:12px;text-align:left;border-radius:22px;background:rgba(255,255,255,.04)}.wizard-step.done{box-shadow:inset 0 0 0 1px rgba(240,195,108,.35)}.wizard-step span{display:grid;place-items:center;min-width:30px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.08)}.wizard-step small{display:block;color:inherit;opacity:.72}.wizard-nav{display:flex;justify-content:space-between;gap:12px}.reader-text.compact{max-height:360px}
    .split-shell{display:grid;grid-template-columns:1.3fr .9fr;gap:16px;align-items:start}.stack{display:grid;gap:16px}.guide-card{padding:18px;display:grid;gap:14px}.choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.choice-card{padding:14px;display:grid;gap:8px;text-align:left;color:var(--text);cursor:pointer;min-height:108px}.choice-card strong{font-size:1rem}.choice-card span{color:var(--muted);font-size:.9rem;line-height:1.35}.ghost-btn{background:rgba(255,255,255,.04)}.inline-actions,.mini-list{display:flex;gap:8px;flex-wrap:wrap}.mini-link{border-radius:999px;background:rgba(255,255,255,.04)}.stat-table{display:grid;gap:10px}.stat-table div{display:flex;justify-content:space-between;gap:12px;padding:12px;border-radius:16px;background:rgba(255,255,255,.04)}.compact{font-size:.95rem}.empty-state.compact{padding:18px}.spell-picker{max-height:220px;overflow:auto;padding:10px;border-radius:18px;background:rgba(255,255,255,.03)}.spell-preview-card{display:grid;gap:12px}.reader-text.inline{max-height:320px;margin-top:0;padding:14px}.preview-window{border:1px solid rgba(127,209,255,.18);border-radius:22px;background:linear-gradient(180deg,rgba(26,23,38,.98),rgba(18,16,28,.95));box-shadow:0 18px 50px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.04)}.preview-window-bar{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}.preview-window-bar span{width:10px;height:10px;border-radius:999px;background:rgba(255,255,255,.16)}.preview-window-bar span:nth-child(1){background:#f08b6c}.preview-window-bar span:nth-child(2){background:#f0c36c}.preview-window-bar span:nth-child(3){background:#7fd1ff}.preview-window-body{padding:16px;display:grid;gap:12px}.loadout-add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}.removable-chip{display:inline-flex;align-items:center;gap:8px}.sticky-card{position:sticky;top:24px}.species-entry-list{max-height:168px;overflow:auto}.species-benefits-shell{align-items:start}.finish-shell{align-items:start}
    .compendium-shell{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.compendium-sidebar,.compendium-reader{display:grid;gap:12px;align-content:start}.compendium-sidebar{position:sticky;top:24px}.search-box{padding:14px;border-radius:20px;background:rgba(255,255,255,.04)}.search-box input{height:44px;min-height:44px}.filter-list,.page-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto;align-content:start}.page-btn{display:grid;gap:4px;text-align:left}.page-btn small{color:inherit;opacity:.72;line-height:1.35}.reader-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.reader-column{display:grid;gap:12px;align-content:start}.compendium-anchor-bar{position:sticky;top:24px;z-index:3}.reader-text{margin:0;padding:18px;border-radius:22px;background:rgba(255,255,255,.04);white-space:pre-wrap;font-family:Georgia,serif;line-height:1.58;overflow:auto;max-height:72vh;scroll-behavior:smooth}.reader-text.structured{display:grid;gap:18px;white-space:normal}.reader-block{display:grid;gap:12px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.08)}.reader-block:last-child{border-bottom:none;padding-bottom:0}.reader-block h3{font-size:1rem;color:var(--accent)}.reader-block p{margin:0;line-height:1.65}.compendium-meta{display:grid;gap:8px;margin-bottom:4px}.compendium-meta div{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04)}.compendium-meta span{color:var(--muted);font-size:.82rem}.compendium-meta strong{text-align:right}.compendium-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}.compendium-aside{display:grid;gap:12px}
    .export-actions{display:flex;gap:12px;flex-wrap:wrap}.primary-btn,.upload-btn{padding:14px 18px;font-weight:700;cursor:pointer}.upload-btn input{display:none}.notes{margin:0;padding-left:18px;display:grid;gap:8px}.empty-state{padding:28px;border-radius:22px;background:rgba(255,255,255,.04);color:var(--muted)}.hidden{display:none!important}
    .mobile-panel-switch{display:none}.mobile-panel{display:block}.desktop-only{display:block}
    @media (max-width:1180px){.studio-shell,.compendium-shell,.form-grid.two,.form-grid.three,.ability-grid,.split-shell,.choice-grid,.wizard-strip,.compendium-layout,.loadout-add-row{grid-template-columns:1fr}.main-column{order:1}.left-rail{order:2}.summary-card.sticky,.wizard-strip,.compendium-sidebar,.compendium-anchor-bar,.sticky-card{position:static}.hero,.wizard-nav{flex-direction:column;align-items:flex-start}.reader-text{max-height:none}}
    @media (max-width:720px){body{padding:16px}.summary-stats,.ability-summary,.skill-columns{grid-template-columns:1fr}.panel,.summary-card.sticky,.hero,.tab-btn,.pill,.filter-btn,.page-btn,.primary-btn,.upload-btn{border-radius:18px}.mobile-panel-switch{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.mobile-panel{display:none}.mobile-panel.active{display:block}.desktop-only{display:none}.magic-preview-shell{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

async function init() {
  injectStyles();
  const response = await fetch('soanw-handbook.json');
  state.handbook = await response.json();
  state.selectedSection = state.handbook[0]?.section || 'Introduction';
  state.selectedPage = meaningfulPages(state.selectedSection)[0]?.title || '';
  refreshSearch();
  render();
}

init().catch((error) => {
  app.innerHTML = `<div style="color:white;padding:24px">Failed to load the character studio: ${error.message}</div>`;
});

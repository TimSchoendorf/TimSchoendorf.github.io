import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

const app = document.getElementById('app');
const AUTOSAVE_KEY = 'soanw-character-studio-v1';
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
const ELEMENTAL_LORES = ['Force', 'Light', 'Frost', 'Lightning', 'Fire', 'Life'];
const FIXED_ELEMENTAL_LORES = {
  'Spark of the Plains': 'Force',
  'Spark of the Desert': 'Light',
  'Spark of the Mountain': 'Frost',
  'Spark of the Coast': 'Lightning',
  'Spark of the Underground': 'Fire',
  'Spark of the Forest': 'Life',
};
const EQUIPMENT_REFERENCES = ['Weapons', 'Firearms', 'Armor and Shields', 'Basic Gear', 'Tools', 'Consumables', 'Vehicles'];
const SPECIES_OPTIONS = {
  Dwarf: [
    {name: 'Halfling', abilities: {dex: 2, cha: 1}, baseAc: 12, speed: 8, hpBase: 4, hpPer: 4, vitalityBase: 12, vitalityPer: 5, carryMultiplier: 2, autoSkills: [], feats: ['Brave', 'Alchemy Ancestry'], summary: 'Agile dwarf-kin with alchemical roots and strong morale.'},
    {name: 'Mountain Dwarf', abilities: {con: 2, str: 1}, baseAc: 12, speed: 8, hpBase: 6, hpPer: 4, vitalityBase: 12, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Dwarven Armor Training', 'Stout'], summary: 'Heavy, resilient subterranean dwarf with armor training.'},
  ],
  Elf: [
    {name: 'High Elf', abilities: {dex: 2, str: 1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Elven Weapon Training'], summary: 'Martial elf with strong weapon tradition.'},
    {name: 'Dark Elf', abilities: {dex: 2, int: 1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Elven Weapon Training', 'Survive on Less'], summary: 'Scholarly desert elf focused on arcane mastery.'},
    {name: 'Common Elf', abilities: {dex: 2, cha: 1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Elven Martial Training', 'Common Elf Acclimation'], summary: 'Versatile mixed-lineage elf with broad acclimation.'},
  ],
  Giant: [
    {name: 'Jotunn', abilities: {con: 2, wis: 1}, baseAc: 8, speed: 12, hpBase: 8, hpPer: 6, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 8, autoSkills: [], feats: ['Jotunn Fortitude', 'Freezing Cold Acclimation'], summary: 'Massive nomadic giant with endurance and cold adaptation.'},
    {name: 'Orc', abilities: {con: 2, str: 1}, baseAc: 10, speed: 10, hpBase: 7, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Aggressive', 'Temperate Acclimation'], summary: 'Powerful giant-kin built for aggression and warfare.'},
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
    {name: 'Halfgiant', abilities: {str: 1}, baseAc: 10, speed: 10, hpBase: 9, hpPer: 5, vitalityBase: 11, vitalityPer: 6, carryMultiplier: 4, autoSkills: [], feats: ['Brave', 'Darkvision'], summary: 'Human-giant hybrid with notable bulk and courage.'},
  ],
  Harpy: [
    {name: 'Common Harpy', abilities: {dex: 2}, baseAc: 10, speed: 6, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 2, autoSkills: [], feats: ['Light Build', 'Flight', 'Mimicry'], summary: 'Fast aerial artist with light build and vocal mimicry.'},
    {name: 'Northern Harpy', abilities: {str: 2}, baseAc: 10, speed: 6, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Burly Build', 'Flight'], summary: 'Larger harpy built for cold climates and hauling power.'},
  ],
  Fairy: [
    {name: 'Fairy', abilities: {dex: 2}, baseAc: 10, speed: 8, hpBase: 4, hpPer: 4, vitalityBase: 12, vitalityPer: 6, carryMultiplier: 2, autoSkills: [], feats: ['Fairy Flight'], summary: 'Source page currently incomplete in the share export; represented as agile small flyer.'},
  ],
  Kobold: [
    {name: 'Kobold', abilities: {dex: 2}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 2, autoSkills: [], feats: ['Small Frame'], summary: 'Source page currently incomplete in the share export; represented as agile small survivor.'},
  ],
  Merfolk: [
    {name: 'Merfolk', abilities: {cha: 1, wis: 1}, baseAc: 10, speed: 8, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Amphibious'], summary: 'Source page currently incomplete in the share export; represented as amphibious support species.'},
  ],
  Wildling: [
    {name: 'Wildling', abilities: {wis: 1, dex: 1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Adaptive Form'], summary: 'Source page currently incomplete in the share export; represented as adaptable wild shapeshifter.'},
  ],
  Changeling: [
    {name: 'Changeling', abilities: {str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1}, baseAc: 10, speed: 10, hpBase: 5, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: ['Deception', 'Persuasion'], feats: ['Shapechanger', 'Duplicity'], summary: 'Shapechanging infiltrator that trades raw stats for unmatched disguise capability.'},
  ],
  Lizardfolk: [
    {name: 'Lizardfolk', abilities: {str: 1, con: 1}, baseAc: 10, speed: 10, hpBase: 6, hpPer: 5, vitalityBase: 10, vitalityPer: 5, carryMultiplier: 4, autoSkills: [], feats: ['Natural Weapons'], summary: 'Source page currently incomplete in the share export; represented as hardy reptilian survivor.'},
  ],
};
const CLASS_RULES = {
  Barbarian: {description: 'Front-line bruiser with rage, durability and heavy physical pressure.', skillChoices: 2, skillList: ['Athletics', 'Animal Handling', 'Intimidation', 'Nature', 'Perception', 'Survival', 'Acrobatics'], hpBonus: 3, vitalityBonus: 0, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Raider Kit', 'Survival Kit']},
  Bard: {description: 'Performance-focused support caster with dialogue and aria control.', skillChoices: 3, skillList: ['Acrobatics', 'Arcana', 'Deception', 'History', 'Insight', 'Investigation', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand'], hpBonus: 1, vitalityBonus: 2, spellMode: 'full', maneuverMode: 'none', loadouts: ['Performer Kit', 'Diplomat Kit']},
  Druid: {description: 'Wild caster with nature support, survival tools and beast synergy.', skillChoices: 2, skillList: ['Animal Handling', 'Arcana', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], hpBonus: 1, vitalityBonus: 2, spellMode: 'full', maneuverMode: 'none', loadouts: ['Warden Kit', 'Forager Kit']},
  Fighter: {description: 'Flexible martial specialist with weapons, discipline and pressure.', skillChoices: 2, skillList: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival', 'Driving'], hpBonus: 2, vitalityBonus: 0, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Soldier Kit', 'Skirmisher Kit']},
  Mage: {description: 'Dedicated elemental caster built around lore choice and spell throughput.', skillChoices: 2, skillList: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion', 'Science'], hpBonus: 0, vitalityBonus: 3, spellMode: 'full', maneuverMode: 'none', loadouts: ['Scholar Kit', 'Path Kit']},
  Monk: {description: 'Mobile unarmored combatant with focus, reactions and maneuvers.', skillChoices: 2, skillList: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Medicine', 'Perception', 'Religion', 'Stealth'], hpBonus: 1, vitalityBonus: 1, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Pilgrim Kit', 'Pursuer Kit']},
  Paladin: {description: 'Durable divine front-liner mixing weapon pressure and holy techniques.', skillChoices: 2, skillList: ['Athletics', 'History', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'], hpBonus: 2, vitalityBonus: 1, spellMode: 'half', maneuverMode: 'martial', loadouts: ['Knight Kit', 'Zealot Kit']},
  Prophet: {description: 'Mind-focused divine manipulator with social and psychic control.', skillChoices: 2, skillList: ['Arcana', 'History', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], hpBonus: 0, vitalityBonus: 3, spellMode: 'full', maneuverMode: 'none', loadouts: ['Cultist Kit', 'Missionary Kit']},
  Ranger: {description: 'Self-sufficient hybrid using weapons, wilderness knowledge and wild magic.', skillChoices: 3, skillList: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Mechanics', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Science', 'Sleight of Hand', 'Stealth', 'Survival'], hpBonus: 2, vitalityBonus: 1, spellMode: 'half', maneuverMode: 'martial', loadouts: ['Scout Kit', 'Hunter Kit']},
  Rogue: {description: 'Precision specialist for stealth, trickery, mobility and opportunistic combat.', skillChoices: 4, skillList: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Mechanics', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth', 'Survival', 'Driving'], hpBonus: 1, vitalityBonus: 0, spellMode: 'none', maneuverMode: 'martial', loadouts: ['Infiltrator Kit', 'Scavenger Kit']},
  Sorcerer: {description: 'Innate elemental caster defined by spark and raw magical expression.', skillChoices: 2, skillList: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion', 'Science', 'Survival'], hpBonus: 0, vitalityBonus: 3, spellMode: 'full', maneuverMode: 'none', loadouts: ['Channeler Kit', 'Traveler Kit']},
  Witch: {description: 'Formula and enchantment specialist with preparation and resource play.', skillChoices: 2, skillList: ['Animal Handling', 'Arcana', 'Crafting', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Science', 'Survival'], hpBonus: 1, vitalityBonus: 2, spellMode: 'full', maneuverMode: 'none', loadouts: ['Coven Kit', 'Alchemy Kit']},
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
};

function defaultCharacter() {
  return {
    profile: {name: '', player: '', level: 1, species: 'Human', speciesSubtype: 'Border Lords', acquiredSpecies: 'None', className: 'Fighter', subclass: 'Soldier', elementalLore: 'Force'},
    abilities: {str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8},
    combat: {hp: 0, vitality: 0, armorClass: 0, speed: 0, encumbrance: 0, carryLimit: 0},
    proficiencies: {skills: []},
    build: {feats: []},
    loadout: {package: 'Soldier Kit', extras: [], extraWeight: 0, notes: '', money: ''},
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
      combat: {...defaults.combat, ...(parsed.combat || {})},
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

function normalizeTitle(value) {
  return String(value || '').replace(/[\s_-]+$/g, '').trim().toLowerCase();
}

function cleanLabel(value) {
  return String(value || '').replace(/[\s_-]+$/g, '').trim();
}

function handbookSection(sectionName) {
  return state.handbook.find((entry) => entry.section === sectionName);
}

function meaningfulPages(sectionName) {
  return (handbookSection(sectionName)?.pages || []).filter((page) => sanitizePageText(page));
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
  const duplicateTitleIndex = sliced.findIndex((line, index) => index > 8 && line === page.title);
  const cleanedLines = duplicateTitleIndex > 0 ? sliced.slice(0, duplicateTitleIndex) : (cutIndex >= 0 ? sliced.slice(0, cutIndex) : sliced);
  const cleaned = cleanedLines.join('\n');
  const marker = cleaned.slice(0, Math.floor(cleaned.length / 2));
  const repeatedAt = cleaned.indexOf(marker, Math.floor(cleaned.length / 3));
  let result = repeatedAt > 120 ? cleaned.slice(0, repeatedAt).trim() : cleaned.trim();
  const resultLines = result.split('\n').filter(Boolean);
  while (resultLines.length > 4 && resultLines.slice(-4).every((line) => line.length < 28)) resultLines.pop();
  result = resultLines.join('\n').trim();
  return pageIsMostlyChrome(page) ? '' : result;
}

function buildSpellGroups() {
  const bySection = Object.fromEntries(state.handbook.map((entry) => [entry.section, entry.pages.map((page) => page.title)]));
  return {
    arias: (bySection.Arias || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    divine: (bySection['Divine Magic'] || []).filter((name) => !/Chapter|Novice|Apprentice|Adept|Expert|Master/.test(name)),
    elemental: (bySection['Elemental Magic'] || []).filter((name) => !/Chapter|Lore of|Novice|Apprentice|Adept|Expert|Master|Spell$|Overview/.test(name)),
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

function chosenElementalLore() {
  return fixedElementalLore() || state.character.profile.elementalLore || 'Force';
}

function elementalLoreChoices() {
  if (!magicAccess().elemental) return [];
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

function selectedSpeciesOptions() {
  return SPECIES_OPTIONS[state.character.profile.species] || [];
}

function selectedSpeciesData() {
  return selectedSpeciesOptions().find((item) => item.name === state.character.profile.speciesSubtype) || selectedSpeciesOptions()[0] || null;
}

function selectedClassRule() {
  return CLASS_RULES[state.character.profile.className] || CLASS_RULES.Fighter;
}

function speciesAbilityBonus(key) {
  return Number(selectedSpeciesData()?.abilities?.[key] || 0);
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
  return selectedSpeciesData()?.autoSkills || [];
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

function carryLimit() {
  return finalAbilityScore('str') * Number(selectedSpeciesData()?.carryMultiplier || 4);
}

function encumbrance() {
  const base = selectedPackage()?.weight || 0;
  return base + Number(state.character.loadout.extraWeight || 0);
}

function armorClass() {
  const species = selectedSpeciesData();
  const packageArmor = selectedPackage()?.armorBase || 0;
  const dex = mod(finalAbilityScore('dex'));
  let ac = Number(species?.baseAc || 10) + dex + packageArmor;
  if (state.character.profile.className === 'Monk') ac += Math.max(0, mod(finalAbilityScore('wis')));
  if (state.character.profile.className === 'Barbarian') ac += Math.max(0, mod(finalAbilityScore('con')));
  return ac;
}

function hitPoints() {
  const species = selectedSpeciesData();
  const rule = selectedClassRule();
  const con = mod(finalAbilityScore('con'));
  const level = Number(state.character.profile.level || 1);
  return Math.max(1, Number(species?.hpBase || 5) + con + Math.max(0, level - 1) * (Number(species?.hpPer || 5) + con + Number(rule.hpBonus || 0)));
}

function vitalityPoints() {
  const species = selectedSpeciesData();
  const rule = selectedClassRule();
  const level = Number(state.character.profile.level || 1);
  return Math.max(1, Number(species?.vitalityBase || 10) + Math.max(0, level - 1) * (Number(species?.vitalityPer || 5) + Number(rule.vitalityBonus || 0)));
}

function speedMeters() {
  return Number(selectedSpeciesData()?.speed || 10);
}

function spellTierForTitle(sectionName, title) {
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

function spellTierUnlocked(mode, tier) {
  const level = Number(state.character.profile.level || 1);
  return level >= spellTierLevelRequirement(mode, tier);
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
  if (groupKey === 'maneuvers') return 2 + Math.floor((level - 1) / 2);
  const mode = effectiveSpellMode(groupKey);
  if (mode === 'none') return 0;
  if (mode === 'half') return Math.max(0, 1 + Math.floor(level / 2));
  return level + 1;
}

function availableSpellChoices(groupKey) {
  const section = SPELL_SECTION_LABELS[groupKey];
  const mode = effectiveSpellMode(groupKey);
  let choices = (availableSpellGroups()[groupKey] || []).filter((title) => spellTierUnlocked(mode, spellTierForTitle(section, title)));
  if (groupKey === 'elemental') choices = choices.filter((title) => elementalLoreBySpell(title) === chosenElementalLore());
  return choices;
}

function spellContextForTitle(groupKey, title) {
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
  const mode = effectiveSpellMode(groupKey);
  const context = spellContextForTitle(groupKey, title);
  return spellTierLevelRequirement(mode, context.tier);
}

function autoChannelSpellNames() {
  if (!magicAccess().elemental) return [];
  const lore = chosenElementalLore();
  if (!lore) return [];
  const tiers = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'];
  const mode = effectiveSpellMode('elemental');
  return tiers
    .filter((tier) => spellTierUnlocked(mode, tier))
    .map((tier, index) => `Channel ${lore} ${index + 1}`);
}

function spellPreviewText(groupKey, title) {
  const page = spellPageRecord(groupKey, title);
  const cleaned = sanitizePageText(page || {});
  if (cleaned) return cleaned.split('\n').slice(0, 20).join('\n');
  const context = spellContextForTitle(groupKey, title);
  const requirementLevel = spellLearnRequirement(groupKey, title);
  const requirementLine = `Freischaltung: ${context.tier} ab Stufe ${requirementLevel}.`;
  const loreLine = context.lore ? `Lore: ${context.lore}.` : '';
  const channelLine = groupKey === 'elemental'
    ? `Voraussetzung: ${context.tier === 'Novice' ? `Channel ${context.lore || chosenElementalLore()} I` : `Channel ${context.lore || chosenElementalLore()} ${['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'].indexOf(context.tier) + 1}`}, das im Studio automatisch mit der Tier-Freischaltung gelernt wird.`
    : '';
  const tierIntro = sanitizePageText(context.tierPage || {});
  const tierSnippet = tierIntro
    ? tierIntro.split('\n').slice(0, 14).join('\n')
    : 'Die OneDrive-Share-Ansicht liefert fuer diese konkrete Unterseite keinen sauberen Effekttext.';
  return [cleanLabel(title), requirementLine, loreLine, channelLine, '', tierSnippet].filter(Boolean).join('\n');
}

function spellPageRecord(groupKey, title) {
  const section = SPELL_SECTION_LABELS[groupKey];
  return handbookPage(section, title);
}

function previewTextFor(groupKey, title) {
  return spellPreviewText(groupKey, title).split('\n').join(' ').slice(0, 320);
}

function speciesFeatureText() {
  const species = selectedSpeciesData();
  if (!species) return [];
  return [
    ...Object.entries(species.abilities || {}).filter(([, value]) => value).map(([key, value]) => `${ABILITY_LABELS[key]} ${value >= 0 ? '+' : ''}${value}`),
    `Base AC ${species.baseAc}`,
    `Speed ${species.speed}m`,
    `Carry x${species.carryMultiplier}`,
    ...(species.feats || []),
  ];
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

function renderOptionList(options, selected, field, descriptions = {}, previewGroup = '') {
  return `
    <div class="pill-grid">
      ${options.map((option) => `
        <button class="pill ${selected.includes(option) ? 'active' : ''}" data-toggle-field="${field}" data-toggle-value="${option}" title="${String(descriptions[option] || option).replace(/"/g, '&quot;')}" ${previewGroup ? `data-preview-group="${previewGroup}" data-preview-title="${option}"` : ''}>${cleanLabel(option)}</button>
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
  if (stepId === 'profile') return Boolean(c.profile.name.trim());
  if (stepId === 'species') return Boolean(c.profile.species && c.profile.speciesSubtype);
  if (stepId === 'class') return Boolean(c.profile.className && c.profile.subclass);
  if (stepId === 'abilities') return pointBuyRemaining() === 0;
  if (stepId === 'proficiencies') return c.proficiencies.skills.length === classSkillLimit() && c.build.feats.length <= featSlots();
  if (stepId === 'loadout') return Boolean(c.loadout.package);
  if (stepId === 'magic') {
    const required = Object.entries(magicAccess()).some(([, enabled]) => enabled);
    return !required || selectedMagicEntries().length > 0 || activeMagicOptional();
  }
  if (stepId === 'notes') return true;
  return false;
}

function stepDescription(stepId) {
  if (stepId === 'profile') return 'Lege Name, Spieler und Stufe fest.';
  if (stepId === 'species') return 'Species und Unterspezies bestimmen Werte und Traits.';
  if (stepId === 'class') return 'Klasse schaltet Subclass und Magiepfade frei.';
  if (stepId === 'abilities') return 'Point Buy mit automatischen Kampfwerten.';
  if (stepId === 'proficiencies') return 'Klassen-Skills und Feats mit Limits.';
  if (stepId === 'loadout') return 'Paketbasiertes Equipment statt Freitext.';
  if (stepId === 'magic') return 'Nur freigeschaltete und levelgerechte Listen.';
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

function currentMagicPreview() {
  const preview = state.magicPreview;
  if (preview?.key && preview?.title) return preview;
  return selectedMagicEntries()[0] || null;
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
  const c = state.character;
  const step = state.builderStep;
  const species = selectedSpeciesData();
  const classRule = selectedClassRule();
  const speciesPage = handbookPage('Species', c.profile.speciesSubtype) || speciesHandbookEntry();
  const selectedMagic = selectedMagicEntries();
  let body = '';

  if (step === 'profile') {
    body = panel('Step 1 - Profile', `
      <div class="split-shell">
        <div class="form-grid three">
          <label><span>Name</span><input data-field="profile.name" value="${c.profile.name}"></label>
          <label><span>Player</span><input data-field="profile.player" value="${c.profile.player}"></label>
          <label><span>Level</span><input type="number" min="1" max="10" data-field="profile.level" value="${c.profile.level}"></label>
        </div>
        <div class="guide-card">
          <div class="eyebrow">Builder Scope</div>
          <p class="muted">Dieses Profil beschraenkt sich jetzt bewusst auf die Daten, die fuer den restlichen Wizard wirklich regelrelevant sind.</p>
        </div>
      </div>
    `, 'Nur Kernangaben, keine irrelevanten Freitextfelder mehr.');
  } else if (step === 'species') {
    body = `
      ${panel('Step 2 - Species', `
        <div class="stack">
          <div>
            <div class="eyebrow">Species</div>
            ${renderChoiceCards(SPECIES, c.profile.species, 'profile.species')}
          </div>
          <div>
            <div class="eyebrow">Subspecies / Lineage</div>
            ${renderChoiceCards(selectedSpeciesOptions().map((item) => item.name), c.profile.speciesSubtype, 'profile.speciesSubtype', Object.fromEntries(selectedSpeciesOptions().map((item) => [item.name, item.summary])))}
          </div>
          <div class="summary-row">
            ${speciesFeatureText().map((feature) => `<div class="summary-chip">${feature}</div>`).join('')}
          </div>
        </div>
      `, 'Species zeigt jetzt klar Linie, Boni und Kernfaehigkeiten an.')}
      <div class="split-shell">
        ${panel('Species Benefits', `
          <div class="guide-card">
            <h3>${species?.name || 'Species'}</h3>
            <p class="muted">${species?.summary || ''}</p>
            <div class="stat-table">
              <div><span>HP Formula</span><strong>${species?.hpBase || 0} + CON, dann ${species?.hpPer || 0} + CON/Lv</strong></div>
              <div><span>Vitality Formula</span><strong>${species?.vitalityBase || 0}, dann ${species?.vitalityPer || 0}/Lv</strong></div>
              <div><span>Carry Limit</span><strong>STR x ${species?.carryMultiplier || 4}</strong></div>
            </div>
          </div>
        `)}
        ${referencePanel('Species Reference', speciesPage, 'Species')}
      </div>
    `;
  } else if (step === 'class') {
    body = `
      ${panel('Step 3 - Class', `
        <div class="stack">
          <div>
            <div class="eyebrow">Class</div>
            ${renderChoiceCards(CLASSES, c.profile.className, 'profile.className', Object.fromEntries(CLASSES.map((name) => [name, CLASS_RULES[name].description])))}
          </div>
          <div>
            <div class="eyebrow">Subclass</div>
            ${renderChoiceCards(SUBCLASS_MAP[c.profile.className] || [], c.profile.subclass, 'profile.subclass', Object.fromEntries((SUBCLASS_MAP[c.profile.className] || []).map((name) => [name, SUBCLASS_SUMMARIES[name] || 'Subclass summary not yet mapped.'])))}
          </div>
          <div class="summary-row">
            <div class="summary-chip">${classRule.skillChoices} class skills</div>
            <div class="summary-chip">HP bonus +${classRule.hpBonus}/Lv</div>
            <div class="summary-chip">Vitality bonus +${classRule.vitalityBonus}/Lv</div>
            ${Object.entries(magicAccess()).filter(([, enabled]) => enabled).map(([key]) => `<div class="summary-chip">${SPELL_SECTION_LABELS[key]}</div>`).join('')}
          </div>
        </div>
      `, 'Klasse und Subclass zeigen jetzt direkt ihren Nutzen und ihre Unterschiede.')}
      <div class="split-shell">
        ${panel('Class Snapshot', `<div class="guide-card"><h3>${c.profile.className}</h3><p class="muted">${classRule.description}</p></div>`)}
        ${panel('Subclass Snapshot', `<div class="guide-card"><h3>${c.profile.subclass}</h3><p class="muted">${SUBCLASS_SUMMARIES[c.profile.subclass] || 'Unterseiten-Text ist in der Share-Ansicht nicht vollstaendig verfuegbar; daher wird hier eine kuratierte Kurzbeschreibung gezeigt.'}</p></div>`)}
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
            </div>
          </div>
        </div>
      `, 'Point Buy mit klarer Begrenzung, Kampfwerte nur automatisch.')}
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
              ${selectedSkillSet().length ? selectedSkillSet().map((skill) => `<div class="summary-chip">${skill}: ${SKILL_DESCRIPTIONS[skill] || 'No description mapped yet.'}</div>`).join('') : '<div class="empty-state compact">Waehle Skills oder Feats, um hier direkt ihren Nutzen zu sehen.</div>'}
            </div>
          </div>
        </div>
      `, 'Skill- und Feat-Auswahl ist jetzt begrenzt, erklaert und systemnah.')}
      <div class="split-shell">
        ${panel('Skills Reference', `<div class="guide-card">${selectedSkillSet().slice(0, 6).map((skill) => `<div class="summary-chip">${skill}: ${SKILL_DESCRIPTIONS[skill] || 'No description mapped yet.'}</div>`).join('') || '<div class="empty-state compact">Waehle Skills, um ihre Funktion zu sehen.</div>'}</div>`)}
        ${featPreview ? referencePanel(`Feat Reference: ${c.build.feats[0]}`, featPreview, 'Customization') : referencePanel('Feat Rules', handbookPage('Customization', 'Feats'), 'Customization')}
      </div>
    `;
  } else if (step === 'loadout') {
    const packageOptions = classRule.loadouts || [];
    body = `
      ${panel('Step 6 - Loadout', `
        <div class="stack">
          <div>
            <div class="eyebrow">Loadout Package</div>
            ${renderChoiceCards(packageOptions, c.loadout.package, 'loadout.package', Object.fromEntries(packageOptions.map((name) => [name, `${LOADOUT_PACKAGES[name].items.join(', ')} | ${LOADOUT_PACKAGES[name].weight} enc.`])))}
          </div>
          <div class="split-shell">
            <div class="guide-card">
              <h3>${c.loadout.package}</h3>
              <p class="muted">${selectedPackage()?.items.join(', ') || ''}</p>
              <div class="stat-table">
                <div><span>Encumbrance</span><strong>${encumbrance()}</strong></div>
                <div><span>Carry Limit</span><strong>${carryLimit()}</strong></div>
                <div><span>Armor from Loadout</span><strong>+${selectedPackage()?.armorBase || 0}</strong></div>
              </div>
            </div>
            <label><span>Additions / Notes</span><textarea data-field="loadout.notes">${c.loadout.notes}</textarea></label>
          </div>
        </div>
      `, 'Loadout kommt jetzt aus Listen statt aus freiem Tippen.')}
      <div class="split-shell">
        ${panel('Package Breakdown', `
          <div class="guide-card">
            <div class="eyebrow">Included Items</div>
            <div class="mini-list">${(selectedPackage()?.items || []).map((item) => `<div class="summary-chip">${item}</div>`).join('')}</div>
            <div class="eyebrow">Relevant Chapters</div>
            <div class="mini-list">${EQUIPMENT_REFERENCES.map((title) => `<button class="mini-link" data-open-section="Equipment" data-open-page="${title}">${title}</button>`).join('')}</div>
          </div>
        `)}
        ${panel('Loadout Notes', `
          <div class="guide-card">
            <p class="muted">Die Share-Ansicht der Equipment-Unterseiten ist ungleichmaessig. Statt leerer Reader werden hier die Paketinhalte und direkte Kapitel-Links gezeigt.</p>
            <div class="stat-table">
              <div><span>Package Weight</span><strong>${selectedPackage()?.weight || 0}</strong></div>
              <div><span>Armor Added</span><strong>+${selectedPackage()?.armorBase || 0}</strong></div>
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
    body = `
      ${panel('Step 7 - Magic & Maneuvers', `
        ${activeMagicLists.length ? `
          <div class="stack">
            ${magicAccess().elemental ? `
              <div class="guide-card">
                <div class="eyebrow">Elemental Access</div>
                <div class="summary-row">
                  <div class="summary-chip">Lore: ${chosenElementalLore()}</div>
                  ${autoChannelSpellNames().map((spell) => `<div class="summary-chip">${spell}</div>`).join('')}
                </div>
                ${elementalLoreChoices().length ? `<div class="inline-actions">${fixedElementalLore() ? `<div class="summary-chip">Feste Lore durch Subclass</div>` : renderChoiceCards(elementalLoreChoices(), chosenElementalLore(), 'profile.elementalLore')}</div>` : ''}
              </div>
            ` : ''}
            ${activeMagicLists.map(({key, label, items}) => `
              <label>
                <span>${label} (${state.character.magic[key].length}/${spellPickLimit(key)})</span>
                <small class="muted">${items.length} verfuegbar auf diesem Level${key === 'elemental' ? ` in der Lore ${chosenElementalLore()}` : ''}.</small>
                <div class="spell-picker">${renderOptionList(items, state.character.magic[key], `magic.${key}`, Object.fromEntries(items.map((title) => [title, previewTextFor(key, title)])), key)}</div>
              </label>
            `).join('')}
          </div>
        ` : '<div class="empty-state compact">Diese Klasse/Subclass hat auf diesem Level keine waehlbare Magie oder Maneuvers.</div>'}
      `, 'Spells und Maneuvers sind jetzt nach Tier und Level gefiltert und haben Pick-Limits.')}
      <div class="split-shell">
        ${panel('Spellcasting Rules', `
          <pre class="reader-text compact">${handbookPreview(handbookPage('Magic', 'Casting Spells') || handbookPage('Magic', 'What Is A Spell?'))}</pre>
          <div class="summary-row">
            ${magicAccess().elemental ? `<div class="summary-chip">Lore: ${chosenElementalLore()}</div>` : ''}
            ${autoChannelSpellNames().length ? `<div class="summary-chip">${autoChannelSpellNames().length} Auto-Channel freigeschaltet</div>` : ''}
          </div>
        `)}
        ${panel('Spell Preview', `
          <pre id="hoverPreviewPanel" class="reader-text compact">${preview ? spellPreviewText(preview.key, preview.title) : 'Fahre ueber einen Spell oder Maneuver oder waehle ihn aus, um Effekt, Freischaltung und Beschreibung zu sehen.'}</pre>
          <div class="inline-actions"><button class="ghost-btn ${preview ? '' : 'hidden'}" id="hoverPreviewOpen" ${preview ? `data-open-section="${preview.label}" data-open-page="${preview.title}"` : ''}>Im Compendium oeffnen</button></div>
        `)}
      </div>
    `;
  } else if (step === 'notes') {
    body = panel('Step 8 - Finish', `
      <div class="form-grid two">
        <label><span>Appearance</span><textarea data-field="notes.appearance">${c.notes.appearance}</textarea></label>
        <label><span>Backstory</span><textarea data-field="notes.backstory">${c.notes.backstory}</textarea></label>
        <label><span>Allies & Companions</span><textarea data-field="notes.allies">${c.notes.allies}</textarea></label>
        <label><span>Goals</span><textarea data-field="notes.goals">${c.notes.goals}</textarea></label>
        <label class="full"><span>Misc</span><textarea data-field="notes.misc">${c.notes.misc}</textarea></label>
      </div>
    `, 'Nur freie Abschlussnotizen bleiben hier uebrig.');
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
  const currentPages = meaningfulPages(state.selectedSection);
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
        ${page && sanitizePageText(page) ? `
          <div class="reader-head">
            <div>
              <div class="eyebrow">${state.selectedSection}</div>
              <h2>${page.title}</h2>
            </div>
          </div>
          <pre class="reader-text">${sanitizePageText(page) || 'Diese OneNote-Seite enthaelt in der Freigabe kaum lesbaren Text. Der Titel bleibt aber als Referenz im Compendium vorhanden.'}</pre>
        ` : '<div class="empty-state">Waehle links einen sinnvollen Regel-Eintrag oder suche direkt nach einem Begriff.</div>'}
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
  const skillCount = selectedSkillSet().length;
  const spellCount = c.magic.arias.length + c.magic.divine.length + c.magic.elemental.length + c.magic.wild.length + c.magic.witchcraft.length;
  const maneuverCount = c.magic.maneuvers.length;
  return `
    <div class="summary-card sticky">
      <a class="back-link" href="../index.html#games">Zurueck zur Startseite</a>
      <div class="eyebrow">SoaNW Character Studio</div>
      <h1>${c.profile.name || 'Unbenannter Charakter'}</h1>
      <p class="muted">${c.profile.speciesSubtype || c.profile.species} ${c.profile.className} ${c.profile.subclass ? `- ${c.profile.subclass}` : ''}</p>
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
  }
  if (path === 'profile.speciesSubtype') {
    state.character.proficiencies.skills = state.character.proficiencies.skills.filter((skill) => !automaticSkills().includes(skill));
    state.character.build.feats = state.character.build.feats.filter((feat) => availableFeats().includes(feat));
  }
  if (path === 'profile.className') {
    state.character.profile.subclass = SUBCLASS_MAP[value]?.[0] || '';
    state.character.profile.elementalLore = FIXED_ELEMENTAL_LORES[state.character.profile.subclass] || state.character.profile.elementalLore || 'Force';
    state.magicPreview = null;
    state.character.proficiencies.skills = [];
    state.character.loadout.package = CLASS_RULES[value]?.loadouts?.[0] || '';
    const access = {...(CLASS_MAGIC_ACCESS[value] || {}), ...(SUBCLASS_MAGIC_ACCESS[state.character.profile.subclass] || {})};
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
    state.character.magic.elemental = state.character.magic.elemental.filter((title) => elementalLoreBySpell(title) === value && availableSpellChoices('elemental').includes(title));
    if (state.magicPreview?.key === 'elemental' && elementalLoreBySpell(state.magicPreview.title) !== value) state.magicPreview = null;
  }
  if (path === 'profile.level') {
    state.character.build.feats = state.character.build.feats.slice(0, featSlots());
    for (const key of Object.keys(SPELL_SECTION_LABELS)) {
      state.character.magic[key] = state.character.magic[key].filter((title) => availableSpellChoices(key).includes(title));
    }
    if (state.magicPreview && !availableSpellChoices(state.magicPreview.key).includes(state.magicPreview.title) && !selectedMagicEntries().some((entry) => entry.key === state.magicPreview.key && entry.title === state.magicPreview.title)) {
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

async function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit: 'pt', format: 'a4'});
  const c = state.character;
  const drawSection = (title, rows) => {
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    doc.setFillColor(245, 238, 224);
    doc.roundedRect(40, y, 515, 24, 8, 8, 'F');
    doc.setTextColor(38, 30, 34);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(title, 52, y + 16);
    y += 38;
    for (const [label, value] of rows) {
      const wrapped = doc.splitTextToSize(String(value), 340);
      doc.setFont(undefined, 'bold');
      doc.text(label, 48, y);
      doc.setFont(undefined, 'normal');
      doc.text(wrapped, 190, y);
      y += Math.max(24, wrapped.length * 13 + 6);
      if (y > 730) {
        doc.addPage();
        y = 60;
      }
    }
    y += 10;
  };
  doc.setFillColor(18, 16, 28);
  doc.rect(0, 0, 595, 120, 'F');
  doc.setTextColor(255, 245, 231);
  doc.setFontSize(28);
  doc.text('SoaNW Character Studio', 40, 60);
  doc.setFontSize(12);
  doc.text('Character sheet and restore payload', 40, 84);
  let y = 148;
  doc.setTextColor(30, 24, 32);
  drawSection('Identity', [
    ['Name', c.profile.name || '-'],
    ['Player', c.profile.player || '-'],
    ['Species', `${c.profile.species} / ${c.profile.speciesSubtype || '-'}`],
    ['Class', `${c.profile.className} / ${c.profile.subclass || '-'}`],
    ['Level / Prof', `${c.profile.level} / +${proficiencyBonus()}`],
    ['Elemental Lore', chosenElementalLore() && magicAccess().elemental ? chosenElementalLore() : '-'],
  ]);
  drawSection('Combat', [
    ['HP', hitPoints()],
    ['Vitality', vitalityPoints()],
    ['Armor Class', armorClass()],
    ['Speed', `${speedMeters()}m`],
    ['Carry / Encumbrance', `${carryLimit()} / ${encumbrance()}`],
  ]);
  drawSection('Abilities', ABILITIES.map((key) => [ABILITY_LABELS[key], `${finalAbilityScore(key)} (${mod(finalAbilityScore(key)) >= 0 ? '+' : ''}${mod(finalAbilityScore(key))})`]));
  drawSection('Build', [
    ['Skills', selectedSkillSet().join(', ') || '-'],
    ['Feats', c.build.feats.join(', ') || '-'],
    ['Equipment', `${c.loadout.package || '-'}${c.loadout.notes ? ` | ${c.loadout.notes}` : ''}`],
    ['Encumbrance', `${encumbrance()} / ${carryLimit()}`],
  ]);
  drawSection('Magic', [
    ['Elemental Lore', magicAccess().elemental ? chosenElementalLore() : '-'],
    ['Auto Channel', autoChannelSpellNames().join(', ') || '-'],
    ['Spells', [...c.magic.arias, ...c.magic.divine, ...c.magic.elemental, ...c.magic.wild, ...c.magic.witchcraft].map(cleanLabel).join(', ') || '-'],
    ['Maneuvers', c.magic.maneuvers.map(cleanLabel).join(', ') || '-'],
  ]);
  drawSection('Notes', [
    ['Appearance', c.notes.appearance || '-'],
    ['Backstory', c.notes.backstory || '-'],
    ['Allies', c.notes.allies || '-'],
    ['Goals', c.notes.goals || '-'],
    ['Misc', c.notes.misc || '-'],
  ]);
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
    const firstPage = meaningfulPages(state.selectedSection)[0];
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
  document.getElementById('hoverPreviewOpen')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    if (!button.dataset.openPage) return;
    state.tab = 'compendium';
    state.selectedSection = button.dataset.openSection;
    state.selectedPage = button.dataset.openPage;
    state.search = '';
    state.filteredPages = [];
    render();
  });
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
  document.querySelectorAll('[data-preview-group]').forEach((button) => {
    const updatePreview = () => {
      const group = button.dataset.previewGroup;
      const title = button.dataset.previewTitle;
      const skillsPanel = document.getElementById('skillsHoverPanel');
      const spellPanel = document.getElementById('hoverPreviewPanel');
      if ((group === 'skills' || group === 'feats') && skillsPanel) {
        const text = group === 'skills' ? `${title}: ${SKILL_DESCRIPTIONS[title] || title}` : handbookPreview(handbookPage('Customization', title), title);
        skillsPanel.innerHTML = `<div class="summary-chip wide">${text}</div>`;
      }
      if (spellPanel && SPELL_SECTION_LABELS[group]) {
        state.magicPreview = {key: group, label: SPELL_SECTION_LABELS[group], title};
        spellPanel.className = 'reader-text compact';
        spellPanel.textContent = spellPreviewText(group, title);
        const previewOpen = document.getElementById('hoverPreviewOpen');
        if (previewOpen) {
          previewOpen.dataset.openSection = SPELL_SECTION_LABELS[group];
          previewOpen.dataset.openPage = title;
          previewOpen.classList.remove('hidden');
        }
      }
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
    .studio-shell{width:min(1480px,100%);margin:0 auto;display:grid;grid-template-columns:320px minmax(0,1fr);gap:20px}.left-rail{display:grid}.summary-card,.panel,.hero,.tab-btn,.pill,.filter-btn,.page-btn,.primary-btn,.upload-btn,.choice-card,.ghost-btn,.wizard-step,.guide-card,.search-box{border:1px solid var(--line);border-radius:24px;background:rgba(25,22,34,.82);backdrop-filter:blur(14px)}.summary-card.sticky{position:sticky;top:24px;padding:20px}.back-link{text-decoration:none;display:inline-flex;margin-bottom:14px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text)}h1,h2,h3{margin:0}.muted{color:var(--muted)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.78rem;color:var(--accent)}
    .summary-stats,.ability-summary{display:grid;gap:10px}.summary-stats{grid-template-columns:repeat(2,1fr);margin:18px 0}.summary-stats div,.ability-summary div,.summary-chip,.summary-pill{padding:12px;border-radius:18px;background:rgba(255,255,255,.04)}.summary-chip.wide{width:100%;line-height:1.45}.summary-stats span,.ability-summary span{display:block;color:var(--muted);font-size:.78rem}.ability-summary{grid-template-columns:repeat(3,1fr)}.ability-summary strong{display:block;font-size:1.1rem}.ability-summary small{color:var(--accent2)}.summary-foot{display:flex;gap:10px;flex-wrap:wrap;color:var(--muted)}
    .main-column{display:grid;gap:18px}.hero{padding:18px;display:flex;justify-content:space-between;gap:18px;align-items:end}.tab-row{display:flex;gap:10px;flex-wrap:wrap}.tab-btn{padding:12px 16px;color:var(--text);cursor:pointer}.tab-btn.active,.primary-btn,.upload-btn{background:linear-gradient(135deg,#f0c36c,#ffdd96);color:var(--ink)}.tab-btn.disabled{opacity:.45;cursor:default}
    .panel{padding:18px;display:grid;gap:16px}.panel.soft{background:rgba(255,255,255,.04)}.panel-head{display:flex;justify-content:space-between;gap:12px}.form-grid{display:grid;gap:14px}.form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}label{display:grid;gap:8px}label.full{grid-column:1/-1}input,select,textarea{width:100%;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text)}textarea{min-height:112px;resize:vertical}
    .ability-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.ability-card{padding:14px;border-radius:20px;background:rgba(255,255,255,.04)}.ability-card strong{font-size:1.4rem}.summary-row{display:flex;gap:10px;flex-wrap:wrap}.summary-chip{color:var(--text)}
    .pill-grid{display:flex;flex-wrap:wrap;gap:8px}.pill,.filter-btn,.page-btn,.wizard-step,.ghost-btn,.mini-link{padding:10px 12px;color:var(--text);cursor:pointer}.pill.active,.filter-btn.active,.page-btn.active,.wizard-step.active,.choice-card.active{background:linear-gradient(135deg,#7fd1ff,#b4e7ff);color:var(--ink)}
    .wizard-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.wizard-step{display:flex;align-items:center;gap:12px;text-align:left;border-radius:22px;background:rgba(255,255,255,.04)}.wizard-step.done{box-shadow:inset 0 0 0 1px rgba(240,195,108,.35)}.wizard-step span{display:grid;place-items:center;min-width:30px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.08)}.wizard-step small{display:block;color:inherit;opacity:.72}.wizard-nav{display:flex;justify-content:space-between;gap:12px}.reader-text.compact{max-height:360px}
    .split-shell{display:grid;grid-template-columns:1.3fr .9fr;gap:16px;align-items:start}.stack{display:grid;gap:16px}.guide-card{padding:18px;display:grid;gap:14px}.choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.choice-card{padding:14px;display:grid;gap:8px;text-align:left;color:var(--text);cursor:pointer;min-height:108px}.choice-card strong{font-size:1rem}.choice-card span{color:var(--muted);font-size:.9rem;line-height:1.35}.ghost-btn{background:rgba(255,255,255,.04)}.inline-actions,.mini-list{display:flex;gap:8px;flex-wrap:wrap}.mini-link{border-radius:999px;background:rgba(255,255,255,.04)}.stat-table{display:grid;gap:10px}.stat-table div{display:flex;justify-content:space-between;gap:12px;padding:12px;border-radius:16px;background:rgba(255,255,255,.04)}.compact{font-size:.95rem}.empty-state.compact{padding:18px}.spell-picker{max-height:220px;overflow:auto;padding:10px;border-radius:18px;background:rgba(255,255,255,.03)}
    .compendium-shell{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.compendium-sidebar,.compendium-reader{display:grid;gap:12px;align-content:start}.search-box{padding:14px;border-radius:20px;background:rgba(255,255,255,.04)}.search-box input{height:44px;min-height:44px}.filter-list,.page-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto;align-content:start}.reader-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.reader-text{margin:0;padding:18px;border-radius:22px;background:rgba(255,255,255,.04);white-space:pre-wrap;font-family:Georgia,serif;line-height:1.58;overflow:auto}
    .export-actions{display:flex;gap:12px;flex-wrap:wrap}.primary-btn,.upload-btn{padding:14px 18px;font-weight:700;cursor:pointer}.upload-btn input{display:none}.notes{margin:0;padding-left:18px;display:grid;gap:8px}.empty-state{padding:28px;border-radius:22px;background:rgba(255,255,255,.04);color:var(--muted)}.hidden{display:none!important}
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
  state.selectedPage = meaningfulPages(state.selectedSection)[0]?.title || '';
  refreshSearch();
  render();
}

init().catch((error) => {
  app.innerHTML = `<div style="color:white;padding:24px">Fehler beim Laden des Character Studios: ${error.message}</div>`;
});

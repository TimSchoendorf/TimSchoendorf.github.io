import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:4173/games/dnd-delve.html';
const screenshotDir = 'C:/Bewerbungen/screenshots';
const downloadDir = 'C:/Bewerbungen/tmp-soanw-downloads';

async function ensureDir(dir) {
  await fs.mkdir(dir, {recursive: true});
}

async function openStep(page, stepId) {
  await page.locator(`[data-step="${stepId}"]`).click();
  await page.waitForTimeout(250);
}

async function fillWizard(page) {
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Aela Frost');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('4');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Elf"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Dark Elf"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Mage"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="School of the Path"]').click();
  await openStep(page, 'abilities');
  await page.locator('[data-field="abilities.str"]').fill('15');
  await page.locator('[data-field="abilities.dex"]').fill('15');
  await page.locator('[data-field="abilities.con"]').fill('12');
  await page.locator('[data-field="abilities.int"]').fill('8');
  await page.locator('[data-field="abilities.wis"]').fill('13');
  await page.locator('[data-field="abilities.cha"]').fill('8');
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Arcana"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Science"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');

  await page.locator('[data-toggle-field="magic.elemental"][data-toggle-value="Blast"]').click();
}

async function assertMageMagic(page) {
  const pills = page.locator('[data-toggle-field="magic.elemental"]');
  const labels = await pills.allTextContents();
  if (!labels.includes('Apprehend') || !labels.includes('Blast')) {
    throw new Error(`Expected Force novice spells, got ${labels.join(', ')}`);
  }
  if (!labels.includes('Brake Fall')) {
    throw new Error(`Expected Apprentice Force spell at level 4 mage, got ${labels.join(', ')}`);
  }
  if (labels.includes('Concussion Wave')) {
    throw new Error('Adept spell was shown before level 5 unlock.');
  }
  if (labels.includes('Blinding Glare') || labels.includes('Disguise')) {
    throw new Error('Non-selected lore spells are still visible.');
  }
  if (!labels.includes('Channel Fire I')) {
    throw new Error(`Mage could not learn a second lore channel spell: ${labels.join(', ')}`);
  }
  await page.locator('[data-preview-group="elemental"][data-preview-title="Brake Fall"]').hover();
  const preview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/Brake Fall/.test(preview || '') && !/Apprentice/.test(preview || '')) {
    throw new Error(`Spell preview did not update on hover: ${preview}`);
  }

  await page.locator('[data-toggle-field="magic.elemental"][data-toggle-value="Channel Fire I"]').click();
  await page.waitForTimeout(250);
  const unlockedLabels = await page.locator('[data-toggle-field="magic.elemental"]').allTextContents();
  if (!unlockedLabels.includes('Burn')) {
    throw new Error(`Mage did not unlock Fire spells after learning Channel Fire I: ${unlockedLabels.join(', ')}`);
  }
  if (unlockedLabels.includes('Benevolence')) {
    throw new Error(`Mage unlocked a different off-lore without its channel: ${unlockedLabels.join(', ')}`);
  }
}

async function assertLifeLoreHover(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Lysa Vale');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('4');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Variant Human"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Mage"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="School of the Scholar"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 8, dex: 12, con: 12, int: 15, wis: 15, cha: 10})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Arcana"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Science"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');
  await page.locator('[data-choose-field="profile.elementalLore"][data-choose-value="Life"]').click();

  await page.locator('[data-preview-group="elemental"][data-preview-title="Sleep"]').hover();
  const sleepPreview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/Constitution saving throw/i.test(sleepPreview || '') || !/unconscious/i.test(sleepPreview || '')) {
    throw new Error(`Sleep hover preview missing effect text: ${sleepPreview}`);
  }

  await page.locator('[data-choose-field="profile.elementalLore"][data-choose-value="Fire"]').click();
  await page.locator('[data-preview-group="elemental"][data-preview-title="Burn"]').hover();
  const burnPreview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/3d8 fire damage/i.test(burnPreview || '') || !/Dexterity saving throw/i.test(burnPreview || '')) {
    throw new Error(`Burn hover preview missing effect text: ${burnPreview}`);
  }
  await context.close();
}

async function assertDivineHover(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Sister Hale');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('4');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Border Lords"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Prophet"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Knowledge Domain"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 8, dex: 12, con: 12, int: 14, wis: 15, cha: 15})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Religion"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Insight"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');

  await page.locator('[data-preview-group="divine"][data-preview-title="Discord-"]').hover();
  const preview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/disoriented/i.test(preview || '') || !/Intelligence saving throw/i.test(preview || '')) {
    throw new Error(`Divine hover preview missing effect text: ${preview}`);
  }
  await context.close();
}

async function assertManeuverHover(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Rook Marr');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('10');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Confederates"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Fighter"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Soldier"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Athletics"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Perception"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');

  await page.locator('[data-preview-group="maneuvers"][data-preview-title="Sweep"]').hover();
  const preview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/every creature in melee range/i.test(preview || '') || !/knocked prone/i.test(preview || '')) {
    throw new Error(`Sweep hover preview missing effect text: ${preview}`);
  }

  await page.locator('[data-preview-group="maneuvers"][data-preview-title="Dash Strike-"]').hover();
  const dashPreview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/without provoking opportunity attacks/i.test(dashPreview || '') || !/10 feet/i.test(dashPreview || '')) {
    throw new Error(`Dash Strike hover preview missing effect text: ${dashPreview}`);
  }
  await context.close();
}

async function assertSpellbladeRestrictions(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Sil Vane');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('5');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Variant Human"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Rogue"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Spellblade"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 8, dex: 15, con: 13, int: 15, wis: 12, cha: 8})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Stealth"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Investigation"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Sleight of Hand"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Mechanics"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');
  const labels = await page.locator('[data-toggle-field="magic.elemental"]').allTextContents();
  if (!labels.includes('Apprehend') || !labels.includes('Blast')) {
    throw new Error(`Spellblade missing novice lore spells: ${labels.join(', ')}`);
  }
  if (labels.includes('Brake Fall')) {
    throw new Error('Spellblade gained apprentice elemental spells before level 6.');
  }
  await context.close();
}

async function assertPaladinRules(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Sir Cael');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('4');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Border Lords"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Paladin"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Oath of Devotion"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 14})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Athletics"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Religion"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');

  const maneuvers = await page.locator('[data-toggle-field="magic.maneuvers"]').count();
  if (maneuvers !== 0) {
    throw new Error(`Paladin still has maneuver picks available: ${maneuvers}`);
  }
  const divine = await page.locator('[data-toggle-field="magic.divine"]').allTextContents();
  if (!divine.length) {
    throw new Error('Paladin lost divine spell access.');
  }
  await context.close();
}

async function assertWitchRules(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Mora Ash');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('4');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Desert Folk"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Witch"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Hedge Coven"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 8, dex: 12, con: 12, int: 15, wis: 14, cha: 10})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await openStep(page, 'proficiencies');
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Arcana"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Science"]').click();
  await openStep(page, 'loadout');
  await openStep(page, 'magic');

  const elemental = await page.locator('[data-toggle-field="magic.elemental"]').count();
  if (elemental !== 0) {
    throw new Error(`Witch still has selectable elemental magic: ${elemental}`);
  }
  const accessText = await page.locator('.guide-card').allTextContents();
  if (!accessText.join(' ').includes('Channel Life I')) {
    throw new Error(`Witch auto-learned channel was not surfaced in the UI: ${accessText.join(' | ')}`);
  }
  await context.close();
}

async function assertLevelScaling(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Scale Test');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('1');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Border Lords"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Bard"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Mythos of Eloquence"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 8, dex: 12, con: 12, int: 10, wis: 12, cha: 15})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  const levelOneStats = await page.locator('.summary-stats').textContent();
  if (!/Proficiency\+2/i.test(levelOneStats || '') || !/HP16/i.test(levelOneStats || '') || !/Vitality23/i.test(levelOneStats || '')) {
    throw new Error(`Unexpected level 1 scaling stats: ${levelOneStats}`);
  }
  await page.locator('[data-step="profile"]').click();
  await page.locator('[data-field="profile.level"]').fill('5');
  await page.waitForTimeout(250);
  const levelFiveStats = await page.locator('.summary-stats').textContent();
  if (!/Proficiency\+3/i.test(levelFiveStats || '') || !/HP40/i.test(levelFiveStats || '') || !/Vitality59/i.test(levelFiveStats || '')) {
    throw new Error(`Unexpected level 5 scaling stats: ${levelFiveStats}`);
  }
  await context.close();
}

async function assertAcquiredSpeciesRules(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Shift Test');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('5');
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Human"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Border Lords"]').click();
  await page.locator('[data-choose-field="profile.acquiredSpecies"][data-choose-value="Changeling"]').click();
  await openStep(page, 'class');
  await page.locator('[data-choose-field="profile.className"][data-choose-value="Fighter"]').click();
  await page.locator('[data-choose-field="profile.subclass"][data-choose-value="Soldier"]').click();
  await openStep(page, 'abilities');
  for (const [field, value] of Object.entries({str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  const changelingStats = await page.locator('.summary-stats').textContent();
  if (!/HP40/i.test(changelingStats || '') || !/Vitality41/i.test(changelingStats || '')) {
    throw new Error(`Changeling did not retain base Human HP/Vitality: ${changelingStats}`);
  }
  await openStep(page, 'species');
  await page.locator('[data-choose-field="profile.species"][data-choose-value="Elf"]').click();
  await page.locator('[data-choose-field="profile.speciesSubtype"][data-choose-value="Dark Elf"]').click();
  await page.locator('[data-choose-field="profile.acquiredSpecies"][data-choose-value="Wildling"]').click();
  await openStep(page, 'abilities');
  const wildlingStats = await page.locator('.summary-stats').textContent();
  if (!/HP40/i.test(wildlingStats || '') || !/Vitality34/i.test(wildlingStats || '')) {
    throw new Error(`Wildling did not retain base Elf HP/Vitality: ${wildlingStats}`);
  }
  const abilitySummary = await page.locator('.ability-summary').textContent();
  if (!/DEX15/i.test(abilitySummary || '') || !/WIS11/i.test(abilitySummary || '')) {
    throw new Error(`Wildling bonuses were not layered on top of the base species: ${abilitySummary}`);
  }
  await context.close();
}

async function assertFinishExport(browser) {
  const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1440, height: 1700}});
  const page = await context.newPage();
  await fillWizard(page);
  await openStep(page, 'notes');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Fertig & PDF exportieren', exact: true}).click();
  const download = await downloadPromise;
  if (!/\.pdf$/i.test(download.suggestedFilename())) {
    throw new Error(`Finish button did not trigger a PDF download: ${download.suggestedFilename()}`);
  }
  await context.close();
}

async function main() {
  await ensureDir(screenshotDir);
  await ensureDir(downloadDir);

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1440, height: 1700}});
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`);
  });

  await fillWizard(page);
  await assertMageMagic(page);
  await page.screenshot({path: path.join(screenshotDir, 'soanw-check-desktop.png'), fullPage: true});

  await page.getByRole('button', {name: 'Compendium', exact: true}).click();
  await page.screenshot({path: path.join(screenshotDir, 'soanw-check-compendium.png'), fullPage: true});

  await page.getByRole('button', {name: 'Export', exact: true}).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'PDF exportieren'}).click();
  const download = await downloadPromise;
  const downloadPath = path.join(downloadDir, download.suggestedFilename());
  await download.saveAs(downloadPath);

  const mobile = await browser.newContext({viewport: {width: 430, height: 1600}});
  const mobilePage = await mobile.newPage();
  await fillWizard(mobilePage);
  await mobilePage.screenshot({path: path.join(screenshotDir, 'soanw-check-mobile.png'), fullPage: true});

  const restoreContext = await browser.newContext({viewport: {width: 1440, height: 1200}});
  const restorePage = await restoreContext.newPage();
  await restorePage.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await restorePage.evaluate(() => window.localStorage.clear());
  await restorePage.reload({waitUntil: 'networkidle', timeout: 120000});
  await restorePage.getByRole('button', {name: 'Export', exact: true}).click();
  await restorePage.locator('#importPdfInput').setInputFiles(downloadPath);
  await restorePage.waitForTimeout(1000);
  const restored = await restorePage.locator('.summary-card h1').textContent();
  if (restored?.trim() !== 'Aela Frost') {
    throw new Error(`PDF restore failed, got "${restored}"`);
  }

  await assertSpellbladeRestrictions(browser);
  await assertLifeLoreHover(browser);
  await assertDivineHover(browser);
  await assertManeuverHover(browser);
  await assertPaladinRules(browser);
  await assertWitchRules(browser);
  await assertLevelScaling(browser);
  await assertAcquiredSpeciesRules(browser);
  await assertFinishExport(browser);

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  await browser.close();
  console.log(JSON.stringify({restored, pdf: downloadPath}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

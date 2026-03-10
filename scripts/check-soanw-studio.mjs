import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:4173/games/dnd-delve.html';
const screenshotDir = 'C:/Bewerbungen/screenshots';
const downloadDir = 'C:/Bewerbungen/tmp-soanw-downloads';

async function ensureDir(dir) {
  await fs.mkdir(dir, {recursive: true});
}

async function fillWizard(page) {
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Aela Frost');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('4');
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.getByRole('button', {name: /^Elf/}).click();
  await page.getByRole('button', {name: /^Dark Elf/}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.getByRole('button', {name: /^Mage/}).click();
  await page.getByRole('button', {name: /^School of the Path/}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.locator('[data-field="abilities.str"]').fill('15');
  await page.locator('[data-field="abilities.dex"]').fill('15');
  await page.locator('[data-field="abilities.con"]').fill('12');
  await page.locator('[data-field="abilities.int"]').fill('8');
  await page.locator('[data-field="abilities.wis"]').fill('13');
  await page.locator('[data-field="abilities.cha"]').fill('8');
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Arcana"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Science"]').click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

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
  await page.locator('[data-preview-group="elemental"][data-preview-title="Brake Fall"]').hover();
  const preview = await page.locator('#hoverPreviewPanel').textContent();
  if (!/Brake Fall/.test(preview || '') && !/Apprentice/.test(preview || '')) {
    throw new Error(`Spell preview did not update on hover: ${preview}`);
  }
}

async function assertSpellbladeRestrictions(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1600}});
  const page = await context.newPage();
  await page.goto(baseUrl, {waitUntil: 'networkidle', timeout: 120000});
  await page.locator('[data-field="profile.name"]').fill('Sil Vane');
  await page.locator('[data-field="profile.player"]').fill('Tim');
  await page.locator('[data-field="profile.level"]').fill('6');
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();
  await page.getByRole('button', {name: /^Human/}).click();
  await page.getByRole('button', {name: /^Variant Human/}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();
  await page.getByRole('button', {name: /^Rogue/}).click();
  await page.getByRole('button', {name: /^Spellblade/}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();
  for (const [field, value] of Object.entries({str: 8, dex: 15, con: 13, int: 15, wis: 12, cha: 8})) {
    await page.locator(`[data-field="abilities.${field}"]`).fill(String(value));
  }
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Stealth"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Investigation"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Sleight of Hand"]').click();
  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Mechanics"]').click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();
  const labels = await page.locator('[data-toggle-field="magic.elemental"]').allTextContents();
  if (!labels.includes('Apprehend') || !labels.includes('Blast')) {
    throw new Error(`Spellblade missing novice lore spells: ${labels.join(', ')}`);
  }
  if (labels.includes('Brake Fall')) {
    throw new Error('Spellblade gained apprentice elemental spells before level 7.');
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

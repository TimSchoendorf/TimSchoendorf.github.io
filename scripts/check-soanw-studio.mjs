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
  await page.locator('[data-field="profile.concept"]').fill('Field medic mage');
  await page.locator('[data-field="profile.origin"]').fill('Northwatch');
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.getByRole('button', {name: /^Elf/}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.getByRole('button', {name: /^Mage/}).click();
  await page.getByRole('button', {name: /^School of the Scholar/}).click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.locator('[data-field="abilities.int"]').fill('16');
  await page.locator('[data-field="abilities.dex"]').fill('14');
  await page.locator('[data-field="combat.hp"]').fill('18');
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.locator('[data-toggle-field="proficiencies.skills"][data-toggle-value="Arcana"]').click();
  await page.locator('[data-toggle-field="build.feats"][data-toggle-value="Medic"]').click();
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.locator('[data-field="loadout.equipment"]').fill('Satchel, bedroll, field journal');
  await page.locator('[data-field="loadout.weapons"]').fill('Sidearm, ritual knife');
  await page.locator('[data-field="loadout.armor"]').fill('Padded coat');
  await page.getByRole('button', {name: 'Weiter', exact: true}).click();

  await page.locator('[data-toggle-field="magic.elemental"][data-toggle-value="Blast"]').click();
  await page.locator('[data-toggle-field="magic.elemental"][data-toggle-value="Mage Armor"]').click();
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

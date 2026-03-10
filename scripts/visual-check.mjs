import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const browser = await chromium.launch({ headless: true });
await fs.mkdir(path.join(process.cwd(), 'screenshots'), {recursive: true});

const targets = [
  { name: 'desktop', width: 1440, height: 2200 },
  { name: 'mobile', width: 430, height: 2200, isMobile: true, hasTouch: true },
];

for (const target of targets) {
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    isMobile: target.isMobile ?? false,
    hasTouch: target.hasTouch ?? false,
  });
  await page.goto('http://127.0.0.1:4173/games/pokemon-arena.html', { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(process.cwd(), 'screenshots', `pokemon-draft-${target.name}.png`),
    fullPage: true,
  });

  for (let i = 0; i < 3; i += 1) {
    await page.locator('[data-draft-id]').first().click({ force: true });
    await page.waitForTimeout(100);
  }
  await page.screenshot({
    path: path.join(process.cwd(), 'screenshots', `pokemon-draft-preview-${target.name}.png`),
    fullPage: true,
  });

  await page.locator('#startBattleBtn').click();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(process.cwd(), 'screenshots', `pokemon-draft-battle-${target.name}.png`),
    fullPage: true,
  });
  await page.close();
}

await browser.close();

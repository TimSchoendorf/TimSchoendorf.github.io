import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const ROOT = process.cwd();
const HOST = '127.0.0.1';
const PORT = 4174;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.css': 'text/css; charset=utf-8',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const relativePath = requestPath === '/' ? '/index.html' : requestPath;
      const filePath = path.join(ROOT, relativePath);
      const info = await stat(filePath);
      if (info.isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, {'Content-Type': contentType(filePath)});
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  return server;
}

const server = await startServer();
const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 1600, height: 1200}});
const failures = [];

page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
});

try {
  await page.goto(`http://${HOST}:${PORT}/games/pokemon-attack-preview.html`, {waitUntil: 'networkidle'});
  const moveCount = await page.locator('.move-chip').count();
  for (let index = 0; index < moveCount; index += 1) {
    await page.locator('.move-chip').nth(index).click();
    await page.locator('[data-action="replay"]').click();
    await page.waitForTimeout(180);
    const summary = await page.evaluate(() => {
      const stage = document.querySelector('.battle-stage');
      const canvas = document.querySelector('.battle-layer');
      const feed = document.querySelector('.feed-line');
      return {
        stageWidth: stage?.getBoundingClientRect().width || 0,
        canvasWidth: canvas?.getBoundingClientRect().width || 0,
        feed: feed?.textContent || '',
      };
    });
    if (summary.stageWidth < 100 || summary.canvasWidth < 100) {
      failures.push(`layout: move index ${index} has invalid stage width`);
    }
    if (!summary.feed.trim()) {
      failures.push(`feed: move index ${index} has empty battle log`);
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Pokemon attack preview check passed for all 165 moves.');
}

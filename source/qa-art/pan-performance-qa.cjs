const { chromium } = require('playwright');
const WINDOWS_CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserPath=process.env.NEKOPOLIS_BROWSER_PATH||(process.platform==='win32'&&require('fs').existsSync(WINDOWS_CHROME)?WINDOWS_CHROME:undefined);
const URL = process.env.NEKOPOLIS_URL || 'http://127.0.0.1:5173/';

const hashCanvas = async page => page.evaluate(async () => {
  const canvas = document.querySelector('.dynamic-layer');
  const bytes = new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve))).arrayBuffer());
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return hash >>> 0;
});

(async () => {
  const browser = await chromium.launch({headless:true,...(browserPath?{executablePath:browserPath}:{})});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__panQa = { terrain: [], dynamic: [], pointers: [], releases: [] };
    addEventListener('pointermove', () => window.__panQa.pointers.push(performance.now()), true);
    addEventListener('pointerup', () => window.__panQa.releases.push(performance.now()), true);
    const original = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas?.classList?.contains('terrain-layer')) window.__panQa.terrain.push(performance.now());
      if (this.canvas?.classList?.contains('dynamic-layer')) window.__panQa.dynamic.push(performance.now());
      return original.apply(this, args);
    };
  });
  await page.goto(`${URL}?perf=1`);
  await page.waitForTimeout(600);
  const canvas = page.locator('.dynamic-layer');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Dynamic canvas missing');
  const beforeHash = await hashCanvas(page);
  await page.getByRole('button', { name: '지도 이동' }).click();

  const points = Array.from({ length: 25 }, (_, index) => ({
    x: box.x + box.width * (.34 + index * .009),
    y: box.y + box.height * (.45 + index * .004),
  }));
  const transforms = [];
  await page.mouse.move(points[0].x, points[0].y);
  await page.waitForTimeout(80);
  await page.evaluate(() => { window.__panQa = { terrain: [], dynamic: [], pointers: [], releases: [] }; });
  await page.mouse.down();
  const dragStarted = await page.evaluate(() => performance.now());
  for (const point of points.slice(1)) {
    await page.mouse.move(point.x, point.y);
    transforms.push(await page.evaluate(() => ({
      terrain: document.querySelector('.terrain-layer').style.transform,
      dynamic: document.querySelector('.dynamic-layer').style.transform,
    })));
    await page.waitForTimeout(16);
  }
  const beforeRelease = await page.evaluate(start => ({
    now: performance.now(),
    terrainDraws: window.__panQa.terrain.filter(value => value >= start).length,
    dynamicDraws: window.__panQa.dynamic.filter(value => value >= start).length,
  }), dragStarted);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const afterRelease = await page.evaluate(start => ({
    terrainDraws: window.__panQa.terrain.filter(value => value >= start).length,
    dynamicDraws: window.__panQa.dynamic.filter(value => value >= start).length,
    terrainTransform: document.querySelector('.terrain-layer').style.transform,
    dynamicTransform: document.querySelector('.dynamic-layer').style.transform,
    release: window.__panQa.releases.at(-1) || 0,
    firstTerrainAfterRelease: window.__panQa.terrain.find(value => value >= (window.__panQa.releases.at(-1) || 0)) || null,
  }), dragStarted);
  const afterHash = await hashCanvas(page);
  const distinctTransforms = new Set(transforms.map(value => value.dynamic)).size;
  const layersStayedTogether = transforms.every(value => value.dynamic && value.dynamic === value.terrain);
  const commitLatencyMs = afterRelease.firstTerrainAfterRelease === null ? Infinity : afterRelease.firstTerrainAfterRelease - afterRelease.release;
  const result = {
    beforeHash,
    afterHash,
    distinctTransforms,
    layersStayedTogether,
    terrainDrawsDuringDrag: beforeRelease.terrainDraws,
    dynamicDrawsDuringDrag: beforeRelease.dynamicDraws,
    terrainDrawsThroughCommit: afterRelease.terrainDraws,
    dynamicDrawsThroughCommit: afterRelease.dynamicDraws,
    commitLatencyMs,
    transformsCleared: !afterRelease.terrainTransform && !afterRelease.dynamicTransform,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  if (distinctTransforms < 20 || !layersStayedTogether) throw new Error(`Pan compositor preview skipped frames: ${distinctTransforms}`);
  if (beforeRelease.terrainDraws !== 0) throw new Error(`Terrain rerendered ${beforeRelease.terrainDraws} times during drag`);
  if (afterRelease.terrainDraws !== 1) throw new Error(`Expected one committed terrain redraw, got ${afterRelease.terrainDraws}`);
  if (!result.transformsCleared) throw new Error('Temporary pan transforms were not cleared');
  if (beforeHash === afterHash) throw new Error('Committed pan did not change the rendered map');
  if (commitLatencyMs > 50) throw new Error(`Pan commit latency exceeded 50ms: ${commitLatencyMs}`);
  if (errors.length) throw new Error(`Console errors: ${errors.join('; ')}`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

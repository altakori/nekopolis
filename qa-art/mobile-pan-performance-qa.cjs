const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__mobilePanQa = { terrain: [], dynamic: [], releases: [] };
    addEventListener('pointerup', () => window.__mobilePanQa.releases.push(performance.now()), true);
    const original = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas?.classList?.contains('terrain-layer')) window.__mobilePanQa.terrain.push(performance.now());
      if (this.canvas?.classList?.contains('dynamic-layer')) window.__mobilePanQa.dynamic.push(performance.now());
      return original.apply(this, args);
    };
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await session.send('Performance.enable');
  await page.goto('http://127.0.0.1:4174/?perf=1');
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '지도 이동' }).click();
  const canvas = page.locator('.dynamic-layer');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Dynamic canvas missing');
  const start = { x: box.x + box.width * .47, y: box.y + box.height * .52 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 1 }] });
  await page.waitForTimeout(80);
  await page.evaluate(() => { window.__mobilePanQa = { terrain: [], dynamic: [], releases: [] }; });
  const metricsStart = await session.send('Performance.getMetrics');
  const dragStarted = await page.evaluate(() => performance.now());
  const transforms = [];
  for (let index = 1; index <= 24; index++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x + index * 3, y: start.y + index * 1.5, id: 1 }],
    });
    transforms.push(await page.evaluate(() => ({
      terrain: document.querySelector('.terrain-layer').style.transform,
      dynamic: document.querySelector('.dynamic-layer').style.transform,
    })));
    await page.waitForTimeout(16);
  }
  const beforeRelease = await page.evaluate(started => ({
    terrainDraws: window.__mobilePanQa.terrain.filter(value => value >= started).length,
    dynamicDraws: window.__mobilePanQa.dynamic.filter(value => value >= started).length,
  }), dragStarted);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(120);
  const metricsEnd = await session.send('Performance.getMetrics');
  const afterRelease = await page.evaluate(started => ({
    terrainDraws: window.__mobilePanQa.terrain.filter(value => value >= started).length,
    dynamicDraws: window.__mobilePanQa.dynamic.filter(value => value >= started).length,
    release: window.__mobilePanQa.releases.at(-1) || 0,
    firstTerrainAfterRelease: window.__mobilePanQa.terrain.find(value => value >= (window.__mobilePanQa.releases.at(-1) || 0)) || null,
    terrainTransform: document.querySelector('.terrain-layer').style.transform,
    dynamicTransform: document.querySelector('.dynamic-layer').style.transform,
    overflow: document.documentElement.scrollWidth - innerWidth,
    perf: document.querySelector('.perf-hud')?.textContent || '',
  }), dragStarted);
  const metric = (sample, name) => sample.metrics.find(value => value.name === name)?.value || 0;
  const wallSeconds = Math.max(.001, (metric(metricsEnd, 'Timestamp') - metric(metricsStart, 'Timestamp')));
  const taskSeconds = metric(metricsEnd, 'TaskDuration') - metric(metricsStart, 'TaskDuration');
  const distinctTransforms = new Set(transforms.map(value => value.dynamic)).size;
  const layersStayedTogether = transforms.every(value => value.dynamic && value.dynamic === value.terrain);
  const commitLatencyMs = afterRelease.firstTerrainAfterRelease === null ? Infinity : afterRelease.firstTerrainAfterRelease - afterRelease.release;
  const result = {
    distinctTransforms,
    layersStayedTogether,
    terrainDrawsDuringDrag: beforeRelease.terrainDraws,
    dynamicDrawsDuringDrag: beforeRelease.dynamicDraws,
    terrainDrawsThroughCommit: afterRelease.terrainDraws,
    dynamicDrawsThroughCommit: afterRelease.dynamicDraws,
    commitLatencyMs,
    transformsCleared: !afterRelease.terrainTransform && !afterRelease.dynamicTransform,
    mainThreadPct: Math.round(taskSeconds / wallSeconds * 1000) / 10,
    overflow: afterRelease.overflow,
    perf: afterRelease.perf,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  if (distinctTransforms < 20 || !layersStayedTogether) throw new Error(`Touch pan skipped compositor previews: ${distinctTransforms}`);
  if (beforeRelease.terrainDraws !== 0) throw new Error(`Terrain rerendered ${beforeRelease.terrainDraws} times during touch drag`);
  if (afterRelease.terrainDraws !== 1) throw new Error(`Expected one mobile terrain commit, got ${afterRelease.terrainDraws}`);
  if (!result.transformsCleared) throw new Error('Mobile temporary transforms were not cleared');
  if (commitLatencyMs > 80) throw new Error(`Mobile pan commit exceeded 80ms: ${commitLatencyMs}`);
  if (afterRelease.overflow > 0) throw new Error(`Mobile overflow: ${afterRelease.overflow}`);
  if (errors.length) throw new Error(`Console errors: ${errors.join('; ')}`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

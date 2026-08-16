const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4174/';
const W = 24;
const idx = (x, y) => y * W + x;

function state() {
  return {
    grid: Array(W * 18).fill(null),
    utilities: { wire: [], pipe: [] },
    resources: { coins: 900, power: 0, water: 0, catnip: 20, feed: 20, wood: 20, furniture: 0, scrap: 0, population: 8, capacity: 12, labor: 8, happiness: 70 },
    rates: {}, diagnostics: {}, laborUsed: 0, tick: 8, paused: false, speed: 1,
    objective: 0, stage: 4, stableCycles: 0, workPolicy: 'balanced', day: 2,
    deliveries: 0, lastDispatchTick: -12, log: [],
  };
}

function put(s, kind, x, y, size = 2) {
  const anchor = idx(x, y);
  for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
    s.grid[idx(x + xx, y + yy)] = { kind, age: 5, anchor, level: 1 };
  }
  return anchor;
}

async function installCanvasProbe(page) {
  await page.addInitScript(() => {
    window.__dynamicDrawTimes = [];
    window.__frameStrokes = [];
    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    const stroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas?.classList?.contains('dynamic-layer')) {
        window.__dynamicDrawTimes.push(performance.now());
        window.__frameStrokes = [];
      }
      return clearRect.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.stroke = function (...args) {
      if (this.canvas?.classList?.contains('dynamic-layer')) {
        window.__frameStrokes.push({ style: String(this.strokeStyle), width: this.lineWidth, alpha: this.globalAlpha, dash: this.getLineDash() });
      }
      return stroke.apply(this, args);
    };
  });
}

async function canvasHash(page) {
  return page.locator('.dynamic-layer').evaluate(canvas => {
    const data = canvas.toDataURL();
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619);
    return hash >>> 0;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  mobile.on('console', message => { if (message.type() === 'error') errors.push(`mobile: ${message.text()}`); });
  await mobile.goto(URL);
  await mobile.waitForTimeout(250);
  const compact = await mobile.evaluate(() => {
    const card = document.querySelector('.mission-card');
    const toggle = document.querySelector('.mission-toggle');
    const rect = toggle.getBoundingClientRect();
    return {
      compact: card.classList.contains('compact'),
      expanded: toggle.getAttribute('aria-expanded'),
      toggleHeight: rect.height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cardBottom: card.getBoundingClientRect().bottom,
      boardHeight: document.querySelector('.board').getBoundingClientRect().height,
    };
  });
  await mobile.locator('.mission-toggle').click();
  await mobile.waitForTimeout(80);
  const expanded = await mobile.evaluate(() => {
    const card = document.querySelector('.mission-card');
    const toggle = document.querySelector('.mission-toggle');
    return {
      expanded: card.classList.contains('expanded'),
      ariaExpanded: toggle.getAttribute('aria-expanded'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  await mobile.screenshot({ path: 'qa-art/living-city-mobile-expanded.png' });
  await mobile.locator('.mission-toggle').click();
  await mobile.screenshot({ path: 'qa-art/living-city-mobile-compact.png' });
  await mobile.close();

  const city = state();
  const plant = put(city, 'plant', 5, 6);
  put(city, 'feed', 10, 6);
  for (let x = 0; x <= 14; x++) city.grid[idx(x, 8)] = { kind: 'road', age: 5, anchor: idx(x, 8), level: 1 };
  city.utilities.wire = [{ a: idx(4, 6), b: idx(13, 6) }];

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  desktop.on('console', message => { if (message.type() === 'error') errors.push(`desktop: ${message.text()}`); });
  await installCanvasProbe(desktop);
  await desktop.goto(URL);
  await desktop.evaluate(s => localStorage.setItem('nekopolis-save', JSON.stringify(s)), city);
  await desktop.reload();
  await desktop.waitForTimeout(1250);
  const baselineHash = await canvasHash(desktop);
  const baselinePowerStrokes = await desktop.evaluate(() => window.__frameStrokes.filter(s => s.style === '#f2c94c').length);
  const canvas = desktop.locator('.dynamic-layer');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Dynamic canvas missing');
  const point = await desktop.evaluate(({ x, y }) => {
    const canvas = document.querySelector('.dynamic-layer');
    const rect = canvas.getBoundingClientRect();
    const base = Math.min(rect.width / 26, rect.height / (18 * .72));
    const tw = base * 1.2, th = base * .4 * 1.2;
    return { x: rect.left + rect.width / 2 + (x - y) * tw * .52, y: rect.top + rect.height * .09 + (x + y) * th * .9 };
  }, { x: plant % W, y: Math.floor(plant / W) });
  await desktop.mouse.click(point.x, point.y);
  await desktop.waitForTimeout(120);
  const selectedHash = await canvasHash(desktop);
  const selected = await desktop.evaluate(() => ({
    inspector: Boolean(document.querySelector('.inspector')),
    title: document.querySelector('.inspector h2')?.textContent || '',
    powerStrokes: window.__frameStrokes.filter(s => s.style === '#f2c94c').length,
    glowingPowerStrokes: window.__frameStrokes.filter(s => s.style === '#f2c94c' && s.width >= 2 && s.alpha >= .9).length,
  }));
  await desktop.screenshot({ path: 'qa-art/living-city-selected-network.png' });

  await desktop.emulateMedia({ reducedMotion: 'reduce' });
  await desktop.waitForTimeout(160);
  await desktop.evaluate(() => { window.__dynamicDrawTimes = []; });
  await desktop.waitForTimeout(320);
  const reducedIdleFrames = await desktop.evaluate(() => window.__dynamicDrawTimes.length);
  await desktop.mouse.move(box.x + box.width * .55, box.y + box.height * .58);
  await desktop.waitForTimeout(80);
  const reducedAfterInputFrames = await desktop.evaluate(() => window.__dynamicDrawTimes.length);

  const result = {
    compact,
    expanded,
    selection: {
      baselinePowerStrokes,
      baselineHash,
      selectedHash,
      ...selected,
    },
    reducedMotion: { idleFrames: reducedIdleFrames, framesAfterInput: reducedAfterInputFrames },
    errors,
  };
  console.log(JSON.stringify(result, null, 2));

  if (!compact.compact || compact.expanded !== 'false') throw new Error('Mobile mission does not start compact');
  if (compact.toggleHeight < 44) throw new Error(`Mission toggle is below 44px: ${compact.toggleHeight}`);
  if (compact.overflow > 0 || expanded.overflow > 0) throw new Error(`Horizontal overflow: compact=${compact.overflow}, expanded=${expanded.overflow}`);
  if (!expanded.expanded || expanded.ariaExpanded !== 'true') throw new Error('Mission toggle did not expand with matching aria state');
  if (!selected.inspector || selected.title !== '바이오 발전소') throw new Error(`Plant selection failed: ${selected.title}`);
  if (selected.powerStrokes <= baselinePowerStrokes) throw new Error(`Selected power network did not gain strokes: ${baselinePowerStrokes} -> ${selected.powerStrokes}`);
  if (!selected.glowingPowerStrokes) throw new Error('Selected power network has no high-emphasis stroke');
  if (selectedHash === baselineHash) throw new Error('Canvas frame did not visibly change after facility selection');
  if (reducedIdleFrames > 1) throw new Error(`Reduced-motion animation kept drawing: ${reducedIdleFrames} idle frames`);
  if (reducedAfterInputFrames < 1) throw new Error('Reduced-motion dirty frame did not respond to pointer input');
  if (errors.length) throw new Error(`Console errors: ${errors.join('; ')}`);

  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

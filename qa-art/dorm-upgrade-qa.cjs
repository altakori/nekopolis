const { chromium } = require('playwright');

const W = 24;
const H = 18;
const idx = (x, y) => y * W + x;
const grid = Array(W * H).fill(null);
const put = (kind, x, y, size = 1) => {
  const anchor = idx(x, y);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    grid[idx(x + dx, y + dy)] = { kind, age: 0, anchor, level: 1 };
  }
  return anchor;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  const plant = put('plant', 2, 2, 2);
  const intake = put('intake', 19, 3, 2);
  const purifier = put('purifier', 16, 4, 2);
  const dorm = put('dorm', 5, 5, 2);
  const hall = put('hall', 9, 5, 2);
  for (const x of [5, 9]) for (let y = 7; y <= 10; y++) put('road', x, y);
  for (let x = 0; x <= 9; x++) put('road', x, 10);
  const state = {
    grid,
    utilities: {
      wire: [{ a: plant, b: intake }, { a: plant, b: purifier }, { a: plant, b: dorm }, { a: plant, b: hall }],
      pipe: [{ a: intake, b: purifier }, { a: purifier, b: dorm }, { a: purifier, b: hall }],
    },
    resources: { coins: 500, power: 0, water: 0, catnip: 0, feed: 30, wood: 0, furniture: 0, scrap: 0, population: 6, capacity: 8, labor: 6, happiness: 70 },
    rates: {}, diagnostics: {}, laborUsed: 0, tick: 2, paused: false, speed: 1,
    objective: 0, stage: 3, stableCycles: 0, workPolicy: 'balanced', day: 1,
    deliveries: 0, lastDispatchTick: -12, log: [],
  };

  await page.goto('http://127.0.0.1:4174/');
  await page.evaluate(saved => localStorage.setItem('nekopolis-save', JSON.stringify(saved)), state);
  await page.reload();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Ⅱ' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('nekopolis-save')).paused === true);
  const beforeSave = await page.evaluate(() => JSON.parse(localStorage.getItem('nekopolis-save')));

  const canvas = page.locator('.dynamic-layer');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas missing');
  const base = Math.min(box.width / (W + 2), box.height / (H * .72));
  const tw = base * 1.2;
  const th = base * .4 * 1.2;
  const x = box.x + box.width / 2;
  const y = box.y + box.height * .09 + (5.5 + 5.5) * th * .9;
  await page.mouse.click(x, y);

  const inspector = page.locator('.inspector');
  await inspector.waitFor();
  const before = (await inspector.innerText()).replace(/\s+/g, ' ');
  const button = inspector.locator('.upgrade-panel button');
  if (await button.isDisabled()) throw new Error(`Upgrade disabled: ${before}`);
  await button.click();
  await page.waitForTimeout(120);
  const afterUpgrade = await page.evaluate(() => JSON.parse(localStorage.getItem('nekopolis-save')));

  await page.getByRole('button', { name: '×1', exact: true }).click();
  await page.getByRole('button', { name: '×2', exact: true }).click();
  await page.getByRole('button', { name: '▶' }).click();
  await page.waitForTimeout(2300);
  await page.getByRole('button', { name: 'Ⅱ' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nekopolis-save')));
  const after = (await inspector.innerText()).replace(/\s+/g, ' ');
  const cells = [dorm, dorm + 1, dorm + W, dorm + W + 1];
  const levels = cells.map(index => saved.grid[index]?.level);
  const result = {
    before,
    after,
    levels,
    population: [beforeSave.resources.population, afterUpgrade.resources.population, saved.resources.population],
    capacity: [beforeSave.resources.capacity, afterUpgrade.resources.capacity, saved.resources.capacity],
    coinDelta: beforeSave.resources.coins - afterUpgrade.resources.coins,
    powerDelta: beforeSave.resources.power - afterUpgrade.resources.power,
    waterDelta: beforeSave.resources.water - afterUpgrade.resources.water,
    laborDelta: beforeSave.resources.labor - afterUpgrade.resources.labor,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  const ok = levels.every(level => level === 2)
    && result.coinDelta === 90
    && result.powerDelta === 2
    && result.waterDelta === 1
    && result.population[0] === 6
    && result.population[1] === 6
    && result.population[2] === 8
    && result.capacity.every(value => value === 8)
    && after.includes('LV.2')
    && after.includes('실제 고양이 +3')
    && errors.length === 0;
  if (!ok) throw new Error('Dorm resident upgrade browser assertions failed');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

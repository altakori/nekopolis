const { chromium } = require('playwright');
const fs = require('fs');
const base = (process.env.NEKOPOLIS_URL || 'http://127.0.0.1:5172').replace(/\/(v2\.html)?$/, '');
const windowsChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.NEKOPOLIS_BROWSER_PATH || (process.platform === 'win32' && fs.existsSync(windowsChrome) ? windowsChrome : undefined);

(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    page.on('pageerror', e => errors.push(`3d: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`3d: ${m.text()}`); });
    await page.goto(`${base}/v2.html`, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      const tips = [...document.querySelectorAll('.citizen-tip')].map(x => x.textContent?.trim());
      const debug = window.__NEKOPOLIS_DEBUG__;
      const controls = document.querySelector('.camera-help')?.textContent || '';
      return { tips, hasDebug: Boolean(debug?.deriveCitizenTips), navigationMode: debug?.constructionArmed === false, controls };
    });
    if (!result.tips.length || !result.hasDebug || !result.navigationMode || !result.controls.includes('지도 이동')) {
      throw new Error(`3D citizen/control contract failed: ${JSON.stringify(result)}`);
    }

    const twoD = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    twoD.on('pageerror', e => errors.push(`2d: ${e.message}`));
    twoD.on('console', m => { if (m.type() === 'error') errors.push(`2d: ${m.text()}`); });
    await twoD.goto(`${base}/`, { waitUntil: 'networkidle' });
    const map = twoD.locator('.dynamic-layer');
    const box = await map.boundingBox();
    if (!box) throw new Error('2D map canvas missing');
    await twoD.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
    await twoD.mouse.down();
    await twoD.mouse.move(box.x + box.width * .58, box.y + box.height * .56, { steps: 4 });
    const dragTransform = await map.evaluate(node => node.style.transform);
    await twoD.mouse.up();
    const twoDPageResult = await twoD.evaluate(() => {
      const debug = window.__NEKOPOLIS_DEBUG__;
      const tips = [...document.querySelectorAll('.citizen-tip')].map(x => x.textContent?.trim());
      return {
        tips,
        hasDebug: Boolean(debug?.deriveCitizenTips),
        navigationMode: debug?.constructionArmed === false,
      };
    });
    const twoDResult = { ...twoDPageResult, dragTransform };
    if (!twoDResult.tips.length || !twoDResult.hasDebug || !twoDResult.navigationMode || !twoDResult.dragTransform.includes('translate3d')) {
      throw new Error(`2D citizen/control contract failed: ${JSON.stringify(twoDResult)}`);
    }
    if (errors.length) throw new Error(`runtime errors: ${errors.join(' | ')}`);
    console.log(JSON.stringify({ ok: true, base, threeD: result, twoD: twoDResult }));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });

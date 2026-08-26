const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.NEKOPOLIS_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const windowsChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.NEKOPOLIS_BROWSER_PATH || (process.platform === 'win32' && fs.existsSync(windowsChrome) ? windowsChrome : undefined);
const OUT = path.join('qa-art', 'ui-ux-contract');
const SAVE_KEY = 'nekopolis-shared-save';
fs.mkdirSync(OUT, { recursive: true });

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
function stableState(state) {
  return {
    stage: state.stage, paused: state.paused, speed: state.speed, workPolicy: state.workPolicy,
    resources: state.resources,
    grid: state.grid.map((cell) => cell ? [cell.kind, cell.anchor, cell.level] : null),
    wire: state.utilities.wire,
    pipe: state.utilities.pipe,
  };
}
async function readShared(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
}
async function layout(page, surface, criticalSelectors) {
  return page.evaluate(({ surface, criticalSelectors }) => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const critical = criticalSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]).filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return { selector: criticalSelectors.find((selector) => el.matches(selector)), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80), x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), fontSize: Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10, inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 };
    });
    const map = document.querySelector(surface === '2d' ? '.board' : 'canvas')?.getBoundingClientRect();
    const mobileHudItems = [...document.querySelectorAll('.mobile-top-hud span,.mobile-top-hud button,.mobile-top-hud a')].filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40), width: Math.round(r.width), height: Math.round(r.height), fontSize: Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10, inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 };
    });
    return {
      surface,
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mapRatio: map ? Math.round((map.width * map.height) / (innerWidth * innerHeight) * 1000) / 1000 : 0,
      critical,
      mobileHudItems,
      mission: (document.querySelector(surface === '2d' ? '.mission-copy h1' : '.mission h1')?.textContent || '').trim(),
      next: (document.querySelector(surface === '2d' ? '.next-action' : '.next,.mobile-next-hint')?.textContent || '').trim(),
      guidedTools: document.querySelectorAll(surface === '2d' ? '.tool.guide-match' : '.tool.guided').length,
    };
  }, { surface, criticalSelectors });
}
function requireLayout(name, data, minMapRatio) {
  invariant(data.horizontalOverflow <= 1, `${name}: horizontal overflow ${data.horizontalOverflow}px`);
  invariant(data.mapRatio >= minMapRatio, `${name}: map occupies only ${data.mapRatio}`);
  const outside = data.critical.filter((item) => !item.inside);
  invariant(outside.length === 0, `${name}: critical controls outside viewport: ${JSON.stringify(outside)}`);
}
function requireMobile(name, data) {
  const smallTargets = data.critical.filter((item) => item.width < 36 || item.height < 36);
  invariant(smallTargets.length === 0, `${name}: touch targets below 36x36px: ${JSON.stringify(smallTargets)}`);
  const tinyLabels = data.mobileHudItems.filter((item) => item.fontSize < 9);
  invariant(tinyLabels.length === 0, `${name}: HUD labels below 9px: ${JSON.stringify(tinyLabels)}`);
  const outsideHud = data.mobileHudItems.filter((item) => !item.inside);
  invariant(outsideHud.length === 0, `${name}: HUD item outside viewport: ${JSON.stringify(outsideHud)}`);
}
async function overlap(page, leftSelector, rightSelector) {
  return page.evaluate(([left, right]) => {
    const a = document.querySelector(left)?.getBoundingClientRect();
    const b = document.querySelector(right)?.getBoundingClientRect();
    if (!a || !b || a.width === 0 || b.width === 0) return false;
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }, [leftSelector, rightSelector]);
}
function attachRuntimeEvidence(page, report, label) {
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(`${label}: ${message.text()}`); });
  page.on('pageerror', (error) => report.pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => { if (response.status() >= 400) report.badResponses.push({ label, status: response.status(), url: response.url() }); });
}

(async () => {
  const report = { base: BASE, startedAt: new Date().toISOString(), checks: {}, consoleErrors: [], pageErrors: [], badResponses: [] };
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await desktopContext.addInitScript(() => localStorage.setItem('nekopolis-landscape-hint', 'continue'));
    const desktop = await desktopContext.newPage();
    attachRuntimeEvidence(desktop, report, 'desktop');
    await desktop.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await desktop.locator('.dynamic-layer').waitFor({ state: 'visible' });
    const liveText = await desktop.locator('body').innerText();
    invariant(!/공방|재활용|목재|가구|부산물|재료 우선/.test(liveText), 'desktop-2d: retired production controls leaked into live UI');
    const twoDPolicies = await desktop.locator('.work-policy button').allTextContents();
    invariant(JSON.stringify(twoDPolicies) === JSON.stringify(['균형', '식량 우선']), `desktop-2d: unexpected work policies ${JSON.stringify(twoDPolicies)}`);

    const twoD = await layout(desktop, '2d', ['.view-switch', '.map-controls button', '.mission-toggle']);
    requireLayout('desktop-2d', twoD, 0.45);
    invariant(twoD.mission.length > 2, 'desktop-2d: mission title missing');
    invariant(twoD.next.length > 5, 'desktop-2d: NEXT action missing');
    invariant(twoD.guidedTools > 0, 'desktop-2d: no recommended tool connected to NEXT');
    await desktop.screenshot({ path: path.join(OUT, 'desktop-2d.png'), fullPage: true });

    const pauseButton = desktop.locator('.sim-controls button').filter({ hasText: 'Ⅱ' });
    if (await pauseButton.count()) await pauseButton.click();
    await desktop.waitForTimeout(100);
    const beforeSwitch = stableState(await readShared(desktop));
    await desktop.locator('.view-switch').click();
    await desktop.waitForLoadState('networkidle');
    invariant(desktop.url().includes('v2.html'), 'real 2D→3D switch did not navigate to v2.html');
    await desktop.locator('canvas').waitFor({ state: 'visible' });
    const live3DText = await desktop.locator('body').innerText();
    invariant(!/공방|재활용|목재|가구|부산물|재료 우선/.test(live3DText), 'desktop-3d: retired production controls leaked into live UI');
    const threeDPolicies = await desktop.locator('.policy button').allTextContents();
    invariant(JSON.stringify(threeDPolicies) === JSON.stringify(['균형', '식량 우선']), `desktop-3d: unexpected work policies ${JSON.stringify(threeDPolicies)}`);
    const threeD = await layout(desktop, '3d', ['[data-action="switch-2d"]', '[data-action="mission"]', '[data-action="build"]']);
    requireLayout('desktop-3d', threeD, 0.55);
    invariant(threeD.mission === twoD.mission, `mission drift between 2D and 3D: ${twoD.mission} / ${threeD.mission}`);
    invariant(threeD.next.length > 5, 'desktop-3d: NEXT action missing');
    invariant(threeD.guidedTools > 0, 'desktop-3d: no recommended tool connected to NEXT');
    const v2Snapshot = await desktop.evaluate(() => window.nekopolisV2?.snapshot());
    invariant(v2Snapshot && v2Snapshot.stage === beforeSwitch.stage, '3D renderer did not load shared stage');
    invariant(JSON.stringify(stableState(await readShared(desktop))) === JSON.stringify(beforeSwitch), '2D→3D changed canonical gameplay state');
    await desktop.screenshot({ path: path.join(OUT, 'desktop-3d.png'), fullPage: true });

    await desktop.locator('[data-action="switch-2d"]:visible').first().click();
    await desktop.waitForLoadState('networkidle');
    invariant(!desktop.url().includes('v2.html'), 'real 3D→2D switch did not return');
    invariant(JSON.stringify(stableState(await readShared(desktop))) === JSON.stringify(beforeSwitch), '3D→2D changed canonical gameplay state');

    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const phone = await phoneContext.newPage();
    attachRuntimeEvidence(phone, report, 'phone');
    await phone.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const initialPhoneDialogs = await phone.locator('[role="dialog"]:visible').count();
    invariant(initialPhoneDialogs === 1, `phone: expected one landscape choice, found ${initialPhoneDialogs}`);
    const hintDismissStarted = Date.now();
    await phone.getByRole('button', { name: '세로로 계속' }).click();
    const hintDismissLatencyMs = Date.now() - hintDismissStarted;
    invariant(hintDismissLatencyMs <= 500, `phone hint dismissal took ${hintDismissLatencyMs}ms`);
    await phone.reload({ waitUntil: 'networkidle' });
    invariant(await phone.locator('[role="dialog"]:visible').count() === 0, 'dismissed phone hint repeated after reload');
    await phone.locator('.mobile-top-hud').waitFor({ state: 'visible' });
    const portrait2d = await layout(phone, '2d', ['.mobile-top-hud button', '.mobile-top-hud a', '.mission-edge', '.build-edge']);
    requireLayout('portrait-2d', portrait2d, 0.65);
    requireMobile('portrait-2d', portrait2d);
    const shortPortrait2d = portrait2d.critical.filter((item) => item.height < 36 || item.width < 36);
    invariant(shortPortrait2d.length === 0, `portrait-2d: critical touch target below 36px: ${JSON.stringify(shortPortrait2d)}`);
    const tinyPortrait2d = portrait2d.critical.filter((item) => item.fontSize < 9);
    invariant(tinyPortrait2d.length === 0, `portrait-2d: critical labels below 9px: ${JSON.stringify(tinyPortrait2d)}`);
    const portraitMapZoom = Number((await phone.locator('.map-controls b').innerText()).replace('%', ''));
    invariant(portraitMapZoom >= 160, `portrait-2d: initial city framing is too distant (${portraitMapZoom}%)`);
    await phone.screenshot({ path: path.join(OUT, 'phone-portrait-2d.png'), fullPage: true });
    const missionStarted = Date.now();
    await phone.locator('.mission-edge').click();
    await phone.locator('.next-action:visible').waitFor();
    const missionFeedbackLatencyMs = Date.now() - missionStarted;
    invariant(missionFeedbackLatencyMs <= 500, `portrait-2d: mission panel feedback took ${missionFeedbackLatencyMs}ms`);
    await phone.locator('.mission-edge').click();
    const buildStarted = Date.now();
    await phone.locator('.build-edge').click();
    await phone.locator('.tool.guide-match:visible').first().waitFor();
    const buildFeedbackLatencyMs = Date.now() - buildStarted;
    invariant(buildFeedbackLatencyMs <= 500, `portrait-2d: build panel feedback took ${buildFeedbackLatencyMs}ms`);
    await phone.locator('.build-edge').click();

    await phone.setViewportSize({ width: 844, height: 390 });
    await phone.waitForTimeout(180);
    const landscape2d = await layout(phone, '2d', ['.mobile-top-hud button', '.mobile-top-hud a', '.mission-edge', '.build-edge']);
    requireLayout('landscape-2d', landscape2d, 0.78);
    requireMobile('landscape-2d', landscape2d);
    await phone.screenshot({ path: path.join(OUT, 'phone-landscape-2d.png'), fullPage: true });

    await phone.goto(`${BASE}/v2.html`, { waitUntil: 'networkidle' });
    await phone.locator('canvas').waitFor({ state: 'visible' });
    const landscape3d = await layout(phone, '3d', ['.mobile-top-hud button', '.mobile-top-hud a', '.mission-edge', '.build-edge']);
    requireLayout('landscape-3d', landscape3d, 0.90);
    requireMobile('landscape-3d', landscape3d);
    invariant(landscape3d.next.length > 5, 'landscape-3d: persistent NEXT summary is missing');
    invariant(await phone.locator('.mission.open:visible').count() === 0, 'landscape-3d: mission obscures the map by default');
    invariant(!(await overlap(phone, '.notice', '.camera-help')), 'landscape-3d: status notice overlaps camera controls');
    await phone.screenshot({ path: path.join(OUT, 'phone-landscape-3d.png'), fullPage: true });
    if (await phone.locator('.next:visible').count() === 0) await phone.locator('button.mission-edge').click();
    invariant((await phone.locator('.next:visible').innerText()).trim().length > 5, 'landscape-3d: opening mission does not reveal NEXT');
    const landscapeMission = await phone.locator('.mission.open:visible').boundingBox();
    invariant(landscapeMission && landscapeMission.width <= 230 && landscapeMission.height <= 260, `landscape-3d: mission competes with map (${JSON.stringify(landscapeMission)})`);
    if (await phone.locator('.next:visible').count() > 0) await phone.locator('button.mission-edge').click();
    if (await phone.locator('.tool.guided:visible').count() === 0) await phone.locator('button.build-edge').click();
    invariant(await phone.locator('.tool.guided:visible').count() > 0, 'landscape-3d: opening build tools does not reveal recommendation');
    if (await phone.locator('.tool.guided:visible').count() > 0) await phone.locator('button.build-edge').click();

    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.waitForTimeout(180);
    const portrait3d = await layout(phone, '3d', ['.mobile-top-hud button', '.mobile-top-hud a', '.mission-edge', '.build-edge']);
    requireLayout('portrait-3d', portrait3d, 0.88);
    requireMobile('portrait-3d', portrait3d);
    invariant(portrait3d.next.length > 5, 'portrait-3d: persistent NEXT summary is missing');
    invariant(!(await overlap(phone, '.notice', '.camera-help')), 'portrait-3d: status notice overlaps camera controls');
    const shortPortrait3d = portrait3d.critical.filter((item) => item.height < 36 || item.width < 36);
    invariant(shortPortrait3d.length === 0, `portrait-3d: critical touch target below 36px: ${JSON.stringify(shortPortrait3d)}`);
    const tinyPortrait3d = portrait3d.critical.filter((item) => item.fontSize < 9);
    invariant(tinyPortrait3d.length === 0, `portrait-3d: critical labels below 9px: ${JSON.stringify(tinyPortrait3d)}`);
    await phone.screenshot({ path: path.join(OUT, 'phone-portrait-3d.png'), fullPage: true });

    report.friction = { initialPhoneDialogs, hintDismissLatencyMs, hintDidNotRepeat: true, missionFeedbackLatencyMs, buildFeedbackLatencyMs, mobileMinimumTarget: 36, mobileMinimumCriticalLabelPx: 9, noticeCameraOverlap: false };
    report.checks = { twoD, threeD, portrait2d, landscape2d, landscape3d, portrait3d, sharedRoundTrip: true, v2Snapshot };
    invariant(report.consoleErrors.length === 0, `console errors: ${JSON.stringify(report.consoleErrors)}`);
    invariant(report.pageErrors.length === 0, `page errors: ${JSON.stringify(report.pageErrors)}`);
    invariant(report.badResponses.length === 0, `HTTP errors: ${JSON.stringify(report.badResponses)}`);
    report.finishedAt = new Date().toISOString();
    report.status = 'PASS';
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.status = 'FAIL';
    report.failure = error.stack || String(error);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.error(report.failure);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

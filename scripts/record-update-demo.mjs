import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.BASE_URL ?? "https://aks-campus-3d.vercel.app";
const output = "artifacts/upgrade-20261013/demo";
await mkdir(`${output}/raw`, { recursive: true });
const shots = [
  {
    id: "01-intro",
    seconds: 6,
    view: "neighborhood",
    tag: "한국학중앙연구원 · UPDATE 2026.10.13",
    title: "연구원 밖까지, 움직이는 3D 캠퍼스",
    sub: "주변 156동 · 걷는 사람 22명 · 승용차 16대 · 광역버스 4대",
  },
  {
    id: "02-before",
    seconds: 5,
    view: "neighborhood",
    before: true,
    tag: "01  주변 건물 · 레이어 끔",
    title: "위성사진으로 보이던 주변 동네",
    sub: "같은 위치, 같은 카메라 구도로 비교합니다.",
  },
  {
    id: "03-after",
    seconds: 8,
    view: "neighborhood",
    tag: "01  주변 건물 · 레이어 켬",
    title: "주변 156동의 윤곽을 입체로",
    sub: "공개 지도 기반 외곽에 높이·창문·발코니를 더했습니다.",
  },
  {
    id: "04-main",
    seconds: 8,
    facility: ["main", 15.5, -16, 108],
    tag: "02  건물 디테일",
    title: "Blender로 다듬은 건물 마감",
    sub: "벽체 재질과 모서리 음영, 창호, 본관 계단을 보강했습니다.",
  },
  {
    id: "05-library",
    seconds: 6,
    facility: ["library", -10, -22, 110],
    tag: "02  건물 디테일",
    title: "주요 건물의 입체감을 더 선명하게",
    sub: "본관 · 강당 · 한국학도서관 · 장서각의 마감을 개선했습니다.",
  },
  {
    id: "06-walkers",
    seconds: 12,
    view: "people",
    moving: true,
    tag: "03  걸어 다니는 사람",
    title: "22명이 세 개의 산책길을 걷습니다",
    sub: "팔·다리·무릎이 움직이는 보행 애니메이션 · 고정 카메라",
  },
  {
    id: "07-bus",
    seconds: 8,
    view: "traffic",
    moving: true,
    zoomOut: 450,
    tag: "04  광역버스와 승용차",
    title: "붉은 광역버스와 승용차의 양방향 이동",
    sub: "지형에 맞춘 도로·차선과 차량 그림자 · 실제 노선과 무관한 가상 운행",
  },
  {
    id: "08-road",
    seconds: 8,
    facility: ["gate", 15.5, -36, 145],
    moving: true,
    tag: "04  연구원 앞 도로",
    title: "캠퍼스 안팎으로 이어지는 움직임",
    sub: "건물·계단·연못과 겹치지 않도록 이동 경로를 확인했습니다.",
  },
  {
    id: "09-controls",
    seconds: 9,
    ui: true,
    controls: true,
    tag: "05  직접 조작하기",
    title: "멈추고, 다시 재생하고, 레이어를 바꾸세요",
    sub: "일시정지 · 주변 건물 표시 · 산책길 보기 · 버스 보기",
  },
  {
    id: "10-outro",
    seconds: 5,
    view: "neighborhood",
    tag: "웹에서 직접 둘러보세요",
    title: "주변 건물부터 보행과 교통까지",
    sub: "aks-campus-3d.vercel.app",
  },
];
const selected = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: "reduce",
  recordVideo: { dir: `${output}/raw`, size: { width: 1920, height: 1080 } },
});
const previous = selected.length
  ? JSON.parse(await readFile(`${output}/recording.json`, "utf8")).shots
  : [];
const results = previous.filter((shot) => !selected.includes(shot.id));
const stylesheet = `
  html,body{overflow:hidden!important}
  body.demo-clean .header,body.demo-clean .facility-panel,body.demo-clean .map-title,
  body.demo-clean .map-layer-controls,body.demo-clean .simulation-controls,
  body.demo-clean .map-controls,body.demo-clean .map-status,body.demo-clean .map-gesture{visibility:hidden!important}
  body.demo-clean .header,body.demo-clean .facility-panel{display:none!important}
  body.demo-clean .campus-workspace{display:block!important;height:100vh!important;min-height:100vh!important}
  body.demo-clean .map-region{height:100vh!important;min-height:100vh!important}
  body.demo-ui .map-title{visibility:hidden!important}
  .demo-caption{position:fixed;z-index:100;top:52px;left:64px;max-width:1040px;padding:27px 34px 30px;
    color:#203d30;background:rgba(247,246,240,.94);border-left:5px solid #b29456;box-shadow:0 8px 35px #13221c16;
    border-radius:0 12px 12px 0;font-family:'Malgun Gothic',sans-serif;pointer-events:none}
  .demo-caption small{display:block;color:#817043;font-size:18px;font-weight:700;letter-spacing:2px;margin-bottom:12px}
  .demo-caption h1{font-size:38px;line-height:1.4;letter-spacing:-1.3px;margin:0 0 12px;font-weight:700}
  .demo-caption p{font-size:22px;line-height:1.55;color:#4c6155;margin:0;letter-spacing:-.3px}
  body.demo-ui .demo-caption{top:auto;bottom:143px;left:50px;max-width:960px}
  .demo-note{position:fixed;left:64px;bottom:48px;z-index:100;color:#fff;background:#1b322acc;
    padding:9px 14px;border-radius:4px;font:16px 'Malgun Gothic',sans-serif;pointer-events:none}
`;
const click = (page, label) =>
  page
    .getByRole("button", { name: label, exact: true, includeHidden: true })
    .evaluate((button) => button.click());
const checkbox = (page, label, checked) =>
  page
    .getByRole("checkbox", { name: label, exact: true, includeHidden: true })
    .evaluate((input, value) => {
      if (input.checked !== value) input.click();
    }, checked);
try {
  for (const shot of shots.filter(
    (s) => !selected.length || selected.includes(s.id),
  )) {
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    const video = page.video();
    await page.goto(`${base}/?diagnostics=1&render=continuous`);
    await page.addStyleTag({ content: stylesheet });
    await page.evaluate(
      (ui) => document.body.classList.add(ui ? "demo-ui" : "demo-clean"),
      !!shot.ui,
    );
    await page.waitForFunction(
      () => window.__aksDiagnostics?.().stage === "displayed",
      null,
      { timeout: 120000 },
    );
    const initial = await page.evaluate(() => window.__aksDiagnostics());
    assert.equal(initial.life.surroundings, 156);
    assert.equal(initial.life.roadSurfaces.length, 2);
    assert(initial.life.ready);
    await checkbox(page, "시설명", false);
    if (shot.view) {
      await click(
        page,
        {
          neighborhood: "주변 보기",
          people: "산책길 보기",
          traffic: "버스 보기",
        }[shot.view],
      );
      await page.waitForTimeout(700);
      if (shot.view !== "neighborhood") {
        // Manual input releases the follow camera; no orbit is recorded.
        await page.mouse.click(1750, 925);
        if (shot.zoomOut) {
          await page.mouse.move(960, 540);
          await page.mouse.wheel(0, shot.zoomOut);
        }
      }
    } else if (shot.facility) {
      // Use the app's terrain-aware facility framing, including collision settling.
      const index = initial.models.findIndex(
        (model) => model.id === shot.facility[0],
      );
      assert(index >= 0);
      await page
        .locator(".facility-list button")
        .nth(index)
        .evaluate((button) => button.click());
      await page.waitForTimeout(2200);
    } else await click(page, "캠퍼스 전체");
    if (shot.before) await checkbox(page, "주변 건물", false);
    await page.waitForTimeout(1800);
    await page.waitForFunction(
      () => window.__aksDiagnostics().globeTilesLoaded,
      null,
      { timeout: 40000 },
    );
    await page.evaluate((shot) => {
      const box = document.createElement("div");
      box.className = "demo-caption";
      for (const [tag, text] of [
        ["small", shot.tag],
        ["h1", shot.title],
        ["p", shot.sub],
      ]) {
        const el = document.createElement(tag);
        el.textContent = text;
        box.append(el);
      }
      const note = document.createElement("div");
      note.className = "demo-note";
      note.textContent =
        "실제 웹 화면 녹화 · 주변 높이·입면은 추정 · 보행·교통은 가상 표현";
      document.body.append(box, note);
    }, shot);
    if (shot.moving) await click(page, "재생");
    await page.mouse.move(1908, 12);
    await page.waitForTimeout(600);
    const start = await page.evaluate(() => window.__aksDiagnostics());
    assert.equal(start.life.following, undefined, "Camera must stay fixed");
    await page.screenshot({ path: `${output}/${shot.id}.png` });
    if (shot.controls) {
      await click(page, "재생");
      await page.waitForTimeout(2500);
      await click(page, "일시정지");
      await page.waitForTimeout(1800);
      await checkbox(page, "주변 건물", false);
      await page.waitForTimeout(1500);
      await checkbox(page, "주변 건물", true);
      await page.waitForTimeout(1500);
      await click(page, "재생");
      await page.waitForTimeout(2400);
    } else await page.waitForTimeout(shot.seconds * 1000 + 700);
    const end = await page.evaluate(() => window.__aksDiagnostics());
    assert.deepEqual(errors, []);
    assert(
      Math.abs(start.cameraHeading - end.cameraHeading) < 0.0001,
      "Unexpected camera rotation",
    );
    assert(
      Math.abs(start.cameraPitch - end.cameraPitch) < 0.0001,
      "Unexpected camera pitch change",
    );
    await page.close();
    const raw = `${output}/raw/${shot.id}.webm`;
    await video.saveAs(raw);
    results.push({
      ...shot,
      raw,
      base,
      errors,
      cameraHeadingDelta: end.cameraHeading - start.cameraHeading,
      cameraPitchDelta: end.cameraPitch - start.cameraPitch,
      elapsedDelta: end.life.elapsed - start.life.elapsed,
    });
    results.sort((a, b) => a.id.localeCompare(b.id));
    await writeFile(
      `${output}/recording.json`,
      JSON.stringify(
        { recordedAt: new Date().toISOString(), base, shots: results },
        null,
        2,
      ),
    );
    console.log(
      `Recorded ${shot.id}: ${shot.seconds}s, fixed camera, errors 0`,
    );
  }
} finally {
  await context.close();
  await browser.close();
}

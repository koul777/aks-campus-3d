// Preserve the actual pre-fix and post-fix browser captures as a reviewable card.
// Run check-mobile-quality.mjs before deploying the fix to collect the baseline.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const folder = "artifacts/upgrade-20261013/mobile-quality";
const evidence = JSON.parse(await readFile(`${folder}/results.json`, "utf8"));
assert.equal(evidence.find((r) => r.name === "before").resolution.width, 195);
assert.equal(evidence.find((r) => r.name === "after").resolution.width, 780);
const images = await Promise.all(
  ["before", "after"].map(
    async (name) =>
      `data:image/png;base64,${(await readFile(`${folder}/${name}-main.png`)).toString("base64")}`,
  ),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#f5f3ec;color:#203d30;font-family:'Malgun Gothic',sans-serif}
    main{height:1080px;padding:70px 100px;display:grid;grid-template-columns:520px 430px 430px;gap:100px;align-items:center}
    small{font-size:18px;letter-spacing:3px;color:#817043;font-weight:700}h1{font-size:56px;line-height:1.35;letter-spacing:-2px;margin:25px 0}
    p{font-size:24px;line-height:1.7;color:#506659}strong{font-size:33px;display:block;margin:26px 0 8px}
    .metric{border-left:4px solid #ad955e;padding-left:22px;margin-top:44px}.metric span{font-size:18px;color:#617166}
    figure{margin:0}figcaption{font-size:25px;font-weight:700;margin:0 0 18px;text-align:center}
    img{display:block;width:390px;height:844px;border-radius:12px;box-shadow:0 10px 40px #203d3025}
    footer{position:absolute;left:100px;bottom:28px;font-size:16px;color:#68776d}
  </style><main><section><small>06 MOBILE QUALITY</small><h1>모바일 화면도<br>선명하게</h1><p>같은 화면 크기에서<br>건물·계단·시설명을 비교하세요.</p><div class="metric"><span>3D 캔버스 해상도</span><strong>195 × 387<br>→ 780 × 1548</strong><p>고해상도 렌더 오류 수정<br>시설명 겹침 완화 · 터치 안내</p></div></section><figure><figcaption>개선 전</figcaption><img src="${images[0]}"></figure><figure><figcaption>개선 후</figcaption><img src="${images[1]}"></figure></main><footer>실제 브라우저 캡처 · Chrome 모바일 에뮬레이션 390 × 844 / DPR 3 · 실기기 성능 측정 아님</footer>`);
  await page
    .locator("img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => image.decode())),
    );
  await page.screenshot({ path: "docs/images/mobile-quality-20261013.png" });
} finally {
  await browser.close();
}

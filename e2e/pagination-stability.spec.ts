import { test, expect, Page } from "@playwright/test"

// 근본 원인 2건 회귀 방지 실측 테스트 (bunri 자동 페이지네이션):
//  ① 양의 피드백 루프(use-auto-page-break.ts): scrollHeight 에 정렬 여백이
//     섞여 expectedBreaks 가 진동하던 문제 → 레이아웃이 "정착"해야 한다
//     (t=800ms 스냅샷 == t=2800ms 스냅샷).
//  ② 인덱스 기반 격자 스냅(tiptap-editor.tsx): 과삽입 break 가 다음 격자선까지
//     통째로 밀려 거대한 빈칸이 생기던 문제 → 각 break 의 주입 marginTop 은
//     한 페이지 높이(pageH) 미만이어야 한다(위치 기반 스냅 = pad ∈ [0, pageH)).

// 여러 페이지를 강제하기 위한 긴 문서(프론트매터 없음 → 기본 bunri).
const LONG = (() => {
  const parts: string[] = ["# 시스템 구축 완료 보고서", ""]
  for (let s = 1; s <= 12; s++) {
    parts.push(`## ${s}. 추진 경과 및 성과 (섹션 ${s})`, "")
    for (let p = 0; p < 4; p++) {
      parts.push(
        `본 절은 섹션 ${s}의 ${p + 1}번째 문단으로, 페이지 경계 계산이 여백 주입과 ` +
          `무관하게 안정적으로 수렴하는지 검증하기 위한 충분한 분량의 본문이다. ` +
          `실측 높이가 A4 인쇄 영역을 넘길 때 자동 페이지 구분이 올바른 위치에 삽입되어야 한다.`
      )
      parts.push("")
    }
  }
  return parts.join("\n")
})()

function mockScript(files: Record<string, string>): string {
  const seedJson = JSON.stringify(files)
  return `
let STORE_KEY = localStorage.getItem("mockfs_active_key");
if (!STORE_KEY) { STORE_KEY = "mockfs_" + Math.random().toString(36).slice(2); localStorage.setItem("mockfs_active_key", STORE_KEY); }
const SEED = ${seedJson};
function seedFrom(files){
  const root = {};
  for (const k in files){
    const path = k; const content = files[k];
    const idx = path.lastIndexOf("/");
    if (idx === -1){ root[path] = content; }
    else {
      const dir = path.slice(0, idx); const name = path.slice(idx + 1);
      let cur = root;
      for (const p of dir.split("/")){ if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {}; cur = cur[p]; }
      cur[name] = content;
    }
  }
  return root;
}
function loadFiles(){ try { const r = localStorage.getItem(STORE_KEY); if (r) return JSON.parse(r); } catch(e){} return null; }
let ROOT = loadFiles() || seedFrom(SEED) || {};
if (!loadFiles()) localStorage.setItem(STORE_KEY, JSON.stringify(ROOT));
function makeFH(name, store){
  const content = store[name] != null ? store[name] : "";
  const fh = { kind: "file", name: name };
  Object.defineProperties(fh, {
    getFile: { value: async function(){ return new File([content], name, { type: "text/markdown" }); }, enumerable: false },
    createWritable: { value: async function(){ let buf = ""; return {
      write: async function(c){ buf = (typeof c === "string") ? c : (c && c.type ? c.type : ""); },
      close: async function(){ store[name] = buf; localStorage.setItem(STORE_KEY, JSON.stringify(ROOT)); },
      seek: async function(){}, truncate: async function(){} }; }, enumerable: false },
    queryPermission: { value: async function(){ return "granted"; }, enumerable: false },
    requestPermission: { value: async function(){ return "granted"; }, enumerable: false },
    isSameEntry: { value: async function(){ return false; }, enumerable: false },
  });
  return fh;
}
function makeDir(entries){
  const dirHandle = { name: "md files", kind: "directory" };
  Object.defineProperties(dirHandle, {
    queryPermission: { value: async function(){ return "granted"; }, enumerable: false },
    requestPermission: { value: async function(){ return "granted"; }, enumerable: false },
    isSameEntry: { value: async function(){ return false; }, enumerable: false },
    resolve: { value: async function(){ return null; }, enumerable: false },
    getFileHandle: { value: async function(n, opts){
      if (opts && opts.create){ if (typeof entries[n] !== "object") entries[n] = ""; }
      if (typeof entries[n] === "object" && entries[n] !== null) throw new Error("is a directory");
      if (entries[n] != null) return makeFH(n, entries);
      throw new Error("not found");
    }, enumerable: false },
    getDirectoryHandle: { value: async function(n, opts){
      if (typeof entries[n] === "string") throw new Error("is a file");
      if (opts && opts.create){ if (entries[n] == null) entries[n] = {}; }
      if (typeof entries[n] === "object" && entries[n] !== null) return makeDir(entries[n]);
      throw new Error("not found");
    }, enumerable: false },
    removeEntry: { value: async function(){}, enumerable: false },
    entries: { value: function(){ const e = Object.keys(entries).map(function(n){ return [n, typeof entries[n] === "object" ? makeDir(entries[n]) : makeFH(n, entries)]; }); return { [Symbol.asyncIterator]: async function*(){ yield* e; } }; }, enumerable: false },
    keys: { value: function(){ return { [Symbol.asyncIterator]: async function*(){ yield* Object.keys(entries); } }; }, enumerable: false },
    values: { value: function(){ return { [Symbol.asyncIterator]: async function*(){ yield* Object.keys(entries).map(function(n){ return typeof entries[n] === "object" ? makeDir(entries[n]) : makeFH(n, entries); }); } }; }, enumerable: false },
  });
  return dirHandle;
}
window.showDirectoryPicker = async function(){ return makeDir(ROOT); };
`
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const dom = document.querySelector(".ProseMirror") as HTMLElement | null
    if (!dom) return null
    // 현재 엔진(use-page-flow)은 자동 나눔을 위젯 데코 스페이서로 표현한다.
    const spacers = Array.from(dom.querySelectorAll<HTMLElement>(".pageflow-spacer"))
    return {
      count: spacers.length,
      margins: spacers.map((s) => Math.round(parseFloat(s.style.height) || 0)),
    }
  })
}

test("bunri 자동 페이지네이션이 수렴하고 거대한 빈칸을 만들지 않는다", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))

  await page.addInitScript(mockScript({ "long.md": LONG }))
  await page.goto("http://localhost:3000/")
  await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 10000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await expect(page.getByText("md files")).toBeVisible({ timeout: 5000 })
  await page.getByRole("button", { name: /long\.md/ }).filter({ hasNotText: ".tmp" }).click()

  // bunri 편집 표면 + 자동 분할 대기(스페이서 데코가 삽입될 때까지)
  await expect(page.locator(".a4-canvas--bunri").first()).toBeVisible({ timeout: 15000 })
  await expect.poll(
    () => page.locator(".ProseMirror .pageflow-spacer").count(),
    { timeout: 15000 }
  ).toBeGreaterThanOrEqual(1)

  await page.waitForTimeout(800)
  const first = await snapshot(page)
  await page.waitForTimeout(2000)
  const second = await snapshot(page)

  expect(first).not.toBeNull()
  expect(second).not.toBeNull()

  // ① 수렴: 두 스냅샷이 동일해야 한다(피드백 루프가 끊겨 진동하지 않음)
  expect(second!.count).toBe(first!.count)
  expect(second!.margins).toEqual(first!.margins)

  // 실제로 여러 페이지가 잡혔는지(테스트가 무의미하지 않은지) 확인
  expect(second!.count).toBeGreaterThanOrEqual(2)

  // ② 위치 기반 스냅: 어떤 break 도 한 페이지 높이 이상의 빈칸을 만들지 않는다
  const pageH = (297 + 8) * (96 / 25.4)
  for (const m of second!.margins) {
    expect(m).toBeLessThan(Math.ceil(pageH))
    expect(m).toBeGreaterThanOrEqual(0)
  }

  expect(errors).toEqual([])
})

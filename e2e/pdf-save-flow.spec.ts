import { test, expect, Page, Download } from "@playwright/test"
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

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
    removeEntry: { value: async function(n){
      const idx = n.lastIndexOf("/");
      if (idx === -1){ delete entries[n]; }
      else {
        const dir = path.slice(0, idx); const child = path.slice(idx + 1);
        let cur = entries;
        for (const p of dir.split("/")){ if (cur[p] && typeof cur[p] === "object") cur = cur[p]; else return; }
        delete cur[child];
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(ROOT));
    }, enumerable: false },
    entries: { value: function(){ const e = Object.keys(entries).map(function(n){ return [n, typeof entries[n] === "object" ? makeDir(entries[n]) : makeFH(n, entries)]; }); return { [Symbol.asyncIterator]: async function*(){ yield* e; } }; }, enumerable: false },
    keys: { value: function(){ return { [Symbol.asyncIterator]: async function*(){ yield* Object.keys(entries); } }; }, enumerable: false },
    values: { value: function(){ return { [Symbol.asyncIterator]: async function*(){ yield* Object.keys(entries).map(function(n){ return typeof entries[n] === "object" ? makeDir(entries[n]) : makeFH(n, entries); }); } }; }, enumerable: false },
  });
  return dirHandle;
}
window.showDirectoryPicker = async function(){ return makeDir(ROOT); };
`
}

async function openFile(page: Page) {
  await page.goto("http://localhost:3000/")
  await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 10000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await expect(page.getByText("md files")).toBeVisible({ timeout: 5000 })
  await page.getByRole("button", { name: /notes\.md/ }).filter({ hasNotText: ".tmp" }).click()
  await expect(page.locator(".ProseMirror").getByText("테스트 문서")).toBeVisible({ timeout: 10000 })
}

const LONG_DOC =
  "# 테스트 문서\n\n" +
  Array.from(
    { length: 60 },
    (_, i) => `## 섹션 ${i + 1}\n\n${"이것은 " + (i + 1) + "번째 단락입니다. ".repeat(8)}`
  ).join("\n\n")

test("일체 PDF 저장: 인쇄 대화상자 없이 파일 다운로드 + 미리보기 시트 유연", async ({ page }) => {
  await page.addInitScript(mockScript({ "notes.md": LONG_DOC }))
  await openFile(page)

  // 인쇄 대화상자(window.print)가 호출되면 실패 처리
  await page.exposeFunction("__printCalled", () => {
    ;(window as unknown as Record<string, unknown>).__printFired = true
  })
  await page.addInitScript(() => {
    const orig = window.print
    window.print = function () {
      ;(window as unknown as Record<string, unknown>).__printFired = true
      // no-op: 인쇄 대화상자 띄우지 않음
    }
  })

  await page.getByRole("button", { name: "일체 (A4 연속)" }).click()
  await expect(page.locator(".a4-canvas--ilche")).toBeVisible()

  await page.getByRole("button", { name: "PDF 저장" }).click()
  const overlay = page.locator(".pdf-preview-overlay")
  await expect(overlay).toBeVisible()

  // 미리보기 시트: 페이지 분할 없음, A4 한 장(1122px) 초과하는 연속 시트
  const sheet = page.locator(".pdf-preview-sheet")
  await expect(sheet).toBeVisible()
  await expect(page.locator(".pdf-preview-page")).toHaveCount(0)
  const hPx = await sheet.evaluate((el) => el.getBoundingClientRect().height)
  expect(hPx, "미리보기 시트는 A4 한 장을 초과하는 연속 시트").toBeGreaterThan(1122)
  const wPx = await sheet.evaluate((el) => el.getBoundingClientRect().width)
  // 210mm ≈ 793.7px @96dpi
  expect(Math.abs(wPx - 793.7), "미리보기 시트 폭은 A4(210mm)").toBeLessThan(4)

  // 콘솔 로그 캡처
  const logs: string[] = []
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`))
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`))

  // 저장 클릭 → 다운로드 대기
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 25000 }).catch(() => null),
    page.getByRole("button", { name: "PDF로 저장" }).click(),
  ])
  if (!download) {
    const errLog = await page.evaluate(() => (window as unknown as Record<string, unknown>).__saveErr || null)
    console.log("=== __saveErr:", JSON.stringify(errLog))
  }
  console.log("=== CONSOLE LOGS (always) ===")
  logs.forEach((l) => console.log(l))
  if (!download) {
    throw new Error("다운로드 이벤트가 발생하지 않음")
  }
  const outDir = test.info().outputPath("dl")
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, download.suggestedFilename() || "document.pdf")
  await download.saveAs(outPath)

  const buf = readFileSync(outPath, "latin1")
  const boxes = [
    ...buf.matchAll(/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g),
  ].map((m) => [+m[1], +m[2], +m[3], +m[4]])
  console.log("=== 저장 PDF 경로:", outPath)
  console.log("=== PAGE COUNT:", boxes.length)
  console.log("=== MediaBox(pt):", JSON.stringify(boxes))
  if (boxes[0]) {
    console.log(
      "=== 폭(mm):",
      (boxes[0][2] * 0.3528).toFixed(1),
      "| 길이(mm):",
      (boxes[0][3] * 0.3528).toFixed(1)
    )
  }
  expect(boxes.length, "저장 PDF는 1장").toBe(1)
  expect(boxes[0][2] * 0.3528, "저장 PDF 폭 A4(210mm)").toBeCloseTo(210, 0)
  expect(boxes[0][3] * 0.3528, "저장 PDF 길이는 A4 한 장(297) 초과").toBeGreaterThan(297)
  const printFired = await page.evaluate(
    () => (window as unknown as Record<string, unknown>).__printFired || false
  )
  expect(printFired, "저장 시 인쇄 대화상자(window.print)가 호출되면 안 됨").not.toBeTruthy()
})

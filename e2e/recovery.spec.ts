import { test, expect, Page } from "@playwright/test"

const ORIGINAL = `# 이해관계자 회의록

회의 일시: 2024-01-15
참석자: 김민수, 이영희

## 안건
정기 프로젝트 점검`
const EDITED = `# 이해관계자 회의록

회의 일시: 2024-01-15
참석자: 김민수, 이영희

## 안건
정기 프로젝트 점검

추가된 편집분입니다.`

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
        const dir = n.slice(0, idx); const child = n.slice(idx + 1);
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
  await page
    .getByRole("button", { name: /notes\.md/ })
    .filter({ hasNotText: ".tmp" })
    .click()
  await expect(page.locator(".ProseMirror").getByText("이해관계자 회의록")).toBeVisible({ timeout: 10000 })
}

test.describe("복구(리커버리) 다이얼로그", () => {
  test("편집없는 .tmp(원본과 동일)는 대화상자를 띄우지 않는다 (phantom 해소, TC-6.3.3)", async ({ page }) => {
    const seed = { "notes.md": ORIGINAL, ".temp/notes.md.md.tmp": ORIGINAL }
    await page.addInitScript(mockScript(seed))
    await openFile(page)
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).not.toBeVisible({ timeout: 5000 })
  })

  test("실제 편집분 .tmp는 대화상자를 띄우고, 적용 시 전체 새로고침 없이 문서만 갱신한다", async ({ page }) => {
    const seed = { "notes.md": ORIGINAL, ".temp/notes.md.md.tmp": EDITED }
    await page.addInitScript(mockScript(seed))
    await openFile(page)
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).toBeVisible({ timeout: 10000 })

    await page.evaluate(() => { ;(window as unknown as Record<string, string>).__marker = "before" })
    await page.getByRole("button", { name: "복구 (임시 파일 적용)" }).click()

    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator(".ProseMirror").getByText("추가된 편집분입니다.")).toBeVisible({ timeout: 5000 })

    const marker = await page.evaluate(() => (window as unknown as Record<string, string>).__marker)
    expect(marker).toBe("before")
  })

  test("복구 적용 후 새로고침해도 대화상자가 다시 뜨지 않는다 (temp 재생성 방지)", async ({ page }) => {
    const seed = { "notes.md": ORIGINAL, ".temp/notes.md.md.tmp": EDITED }
    await page.addInitScript(mockScript(seed))
    await openFile(page)
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: "복구 (임시 파일 적용)" }).click()
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).not.toBeVisible({ timeout: 5000 })

    await page.reload()
    await openFile(page)
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).not.toBeVisible({ timeout: 5000 })
  })

  test("X(닫기) 버튼을 누르면 대화상자가 닫힌다 (issue 2)", async ({ page }) => {
    const seed = { "notes.md": ORIGINAL, ".temp/notes.md.md.tmp": EDITED }
    await page.addInitScript(mockScript(seed))
    await openFile(page)
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: "Close" }).click()
    await expect(page.getByText("저장되지 않은 변경사항이 있습니다")).not.toBeVisible({ timeout: 5000 })
  })
})
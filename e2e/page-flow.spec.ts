import { test, expect, type Page } from "@playwright/test"

// 검증: 편집 화면의 상태 비의존 페이지 흐름(src/hooks/use-page-flow.ts, 위젯 데코레이션).
// 사용자 요구(2026-07-22):
//  1) 1페이지 작성 후 계속 추가하면 자동으로 다음 페이지로 정상 이동.
//  2) 1~2페이지 구성에서 1페이지 내용을 지우면 2페이지 내용이 1페이지로 정상 유입.
//  + 편집 시 다른 페이지가 흔들리지(cascade) 않고, 페이지 사이 간격에 글이 뜨지 않음.

const PX_PER_MM = 96 / 25.4
const PAGE_H = 305 * PX_PER_MM // 격자 단위(297 + 8mm)
const SHEET_H = 297 * PX_PER_MM

const MOCK_SETUP = `
const FILES = { "flowtest.md": "# 흐름 검증\\n\\n시작 문단.\\n" }
window.showDirectoryPicker = async () => {
  const makeFH = (name) => {
    const fh = { kind: "file", name }
    Object.defineProperties(fh, {
      getFile: { value: async () => new File([FILES[name] || ""], name, { type: "text/markdown" }) },
      createWritable: { value: async () => ({ write: async (d) => { FILES[name] = typeof d === "string" ? d : "" }, close: async () => {}, seek: async () => {}, truncate: async () => {} }) },
      queryPermission: { value: async () => "granted" }, requestPermission: { value: async () => "granted" }, isSameEntry: { value: async () => false },
    })
    return fh
  }
  const d = { name: "md files", kind: "directory" }
  Object.defineProperties(d, {
    queryPermission: { value: async () => "granted" }, requestPermission: { value: async () => "granted" }, isSameEntry: { value: async () => false }, resolve: { value: async () => null },
    getFileHandle: { value: async function (n, o) { if (o && o.create) return makeFH(n); if (FILES[n] !== undefined) return makeFH(n); throw new Error("nf") } },
    getDirectoryHandle: { value: async function (_n, o) { if (o && o.create) return d; throw new Error("nf") } },
    removeEntry: { value: async () => {} },
    entries: { value: () => ({ [Symbol.asyncIterator]: async function* () { for (const n of Object.keys(FILES)) yield [n, makeFH(n)] } }) },
    keys: { value: () => ({ [Symbol.asyncIterator]: async function* () { for (const n of Object.keys(FILES)) yield n } }) },
    values: { value: () => ({ [Symbol.asyncIterator]: async function* () { for (const n of Object.keys(FILES)) yield makeFH(n) } }) },
  })
  return d
}
`

async function layout(page: Page) {
  return await page.evaluate(
    ({ pageH, sheetH }) => {
      const pm = document.querySelector(".ProseMirror") as HTMLElement
      const cs = getComputedStyle(pm)
      const topM = parseFloat(cs.paddingTop) || 0
      const botM = parseFloat(cs.paddingBottom) || 0
      const pmTop = pm.getBoundingClientRect().top
      const pages = document.querySelectorAll(".a4-page").length
      const blocks = Array.from(pm.children)
        .filter((el) => !el.classList.contains("pageflow-spacer"))
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { top: Math.round(r.top - pmTop), h: Math.round(r.height) }
        })
      let inGap = 0
      for (const b of blocks) {
        if (b.h === 0) continue
        const i = Math.floor(Math.max(0, b.top) / pageH)
        const printableBottom = i * pageH + sheetH - botM
        const nextTop = (i + 1) * pageH + topM
        if (b.top > printableBottom + 8 && b.top < nextTop - 8) inGap++
      }
      return { pages, count: blocks.length, inGap, blocks }
    },
    { pageH: PAGE_H, sheetH: SHEET_H }
  )
}

test("편집 화면 페이지 흐름: 자동 넘김 + 삭제 시 유입 + 무흔들림", async ({ page }) => {
  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")
  await page.getByRole("heading", { name: "워크스페이스 폴더 선택" }).waitFor({ timeout: 10000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 8000 })
  await page.getByText("flowtest.md", { exact: false }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(1200)

  const pm = page.locator(".ProseMirror")
  await pm.click()
  await page.keyboard.press("Control+A")
  await page.keyboard.press("Delete")
  await page.waitForTimeout(400)

  // 1페이지 분량 타이핑
  for (let i = 1; i <= 20; i++) {
    await page.keyboard.type(`문단 ${i}: 페이지 흐름 검증용 본문 라인입니다.`)
    await page.keyboard.press("Enter")
  }
  await page.waitForTimeout(800)
  const prep = await layout(page)
  expect(prep.pages).toBe(1)
  expect(prep.inGap).toBe(0)

  // ── 요구 1: 계속 추가 → 자동으로 다음 페이지 ──
  for (let i = 21; i <= 42; i++) {
    await page.keyboard.type(`문단 ${i}: 페이지 흐름 검증용 본문 라인입니다.`)
    await page.keyboard.press("Enter")
  }
  await page.waitForTimeout(900)
  const grown = await layout(page)
  expect(grown.pages).toBeGreaterThanOrEqual(2) // 자동으로 2페이지 이상
  expect(grown.inGap).toBe(0) // 페이지 사이 간격에 글이 뜨지 않음

  // ── 요구 2: 1페이지 내용 삭제 → 2페이지 내용이 1페이지로 유입 ──
  await page.evaluate(() => {
    const el = document.querySelector(".ProseMirror") as HTMLElement
    el.focus()
    const blocks = Array.from(el.children).filter((c) => !c.classList.contains("pageflow-spacer"))
    const sel = window.getSelection()!
    const range = document.createRange()
    range.setStart(blocks[0], 0)
    range.setEnd(blocks[Math.min(20, blocks.length - 1)], 0)
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await page.keyboard.press("Delete")
  await page.waitForTimeout(1000)

  const shrunkA = await layout(page)
  await page.waitForTimeout(600)
  const shrunkB = await layout(page) // 입력 없이 재측정 → 흔들림 검사

  expect(grown.count - shrunkA.count).toBeGreaterThanOrEqual(10) // 실제로 삭제됨
  expect(shrunkA.pages).toBeLessThan(grown.pages) // 페이지 수 감소(2→1): 내용이 위로 유입
  expect(shrunkA.inGap).toBe(0)

  // 무흔들림: 입력 없이 두 번 측정한 블록 top 이 모두 동일해야 함
  let shimmer = 0
  const n = Math.min(shrunkA.blocks.length, shrunkB.blocks.length)
  for (let i = 0; i < n; i++) {
    if (Math.abs(shrunkA.blocks[i].top - shrunkB.blocks[i].top) > 1) shimmer++
  }
  expect(shimmer).toBe(0)
})

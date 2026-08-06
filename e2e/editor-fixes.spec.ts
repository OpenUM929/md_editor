import { test, expect, type Page } from "@playwright/test"

// 회귀 방지(2026-07-22 사용자 보고):
//  1) 커서를 두지 않고 툴바 H3 를 선택하면 뷰가 맨 뒷페이지로 스크롤 점프하던 버그
//     → setContent 후 커서를 문서 시작으로 되돌려 focus() 점프 제거.
//  2) reportTheme 문서를 열고 다른 탭에 갔다 돌아오면 테마가 유실(plain)되던 버그
//     → 비활성 탭 언마운트 후 tab.content 에서 상태를 재구성하는데, Tiptap 이 떨궈낸
//       <template data-frontmatter> 를 updateTabContent 시 재부착해 유실을 막음.

const A4 = `---\ntitle: "테마 검증 보고서"\ntopic: "report"\nreportTheme: report\n---\n\n# 테마 검증 보고서\n\n작성자 홍길동\n\n> 한 줄 결론 헤드라인\n\n${Array.from({ length: 60 }, (_, i) => `## 섹션 ${i + 1}\n\n본문 문단 ${i + 1} 입니다. 페이지를 채우기 위한 텍스트.\n`).join("\n")}`
const OTHER = `# 다른 문서\n\n간단한 본문.\n`
const TABLE = `---\ntitle: 표 문서\nreportTheme: report\n---\n\n# 제목\n\n문단 텍스트.\n\n| 항목 | 값 |\n|------|----|\n| 가 | 1 |\n| 나 | 2 |\n`

const MOCK_SETUP = `
const FILES = { "themed.md": ${JSON.stringify(A4)}, "other.md": ${JSON.stringify(OTHER)}, "table.md": ${JSON.stringify(TABLE)} }
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

async function pickFolder(page: Page) {
  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 8000 })
}

function themeClass(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('[class*="report-theme--"]')
    return el ? (el.className.match(/report-theme--[\w-]+/) || [])[0] : "(plain)"
  })
}

test("커서 없이 H3 선택해도 맨 뒷페이지로 점프하지 않는다", async ({ page }) => {
  await pickFolder(page)
  await page.getByText("themed.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(2000)

  const scrollTop = () =>
    page.evaluate(() => {
      const cont = document.querySelector('[data-page-mode]')?.closest('[class*="overflow"]') || document.querySelector("main")
      return cont ? (cont as HTMLElement).scrollTop : window.scrollY
    })

  expect(await scrollTop()).toBeLessThan(50)
  // 편집 영역을 클릭하지 않고 곧바로 툴바 heading 셀렉트로 H3 선택
  await page.locator("button[role=combobox]").first().click()
  await page.getByRole("option", { name: /Heading 3/ }).click()
  await page.waitForTimeout(700)
  expect(await scrollTop()).toBeLessThan(50) // 점프 없음
})

test("reportTheme 문서는 탭 전환 후 복귀해도 테마가 유지된다", async ({ page }) => {
  await pickFolder(page)
  await page.getByText("themed.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(2000)
  expect(await themeClass(page)).toBe("report-theme--report")

  await page.getByText("other.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForTimeout(1200)

  // themed 탭으로 복귀
  await page.getByRole("button", { name: /themed\.md/ }).first().click()
  await page.waitForTimeout(1500)
  expect(await themeClass(page)).toBe("report-theme--report") // 유실되지 않음
})

test("표 클릭 시 상단 툴바 폭이 변하지 않고, 표 도구는 항상 표시(밖에선 비활성)된다", async ({ page }) => {
  await pickFolder(page)
  await page.getByText("table.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(1200)

  const rowBtn = page.locator('button[aria-label="행 위에 추가"]')
  // 표 도구는 항상 DOM 에 존재하고, 표 밖에선 비활성
  await expect(rowBtn).toHaveCount(1)
  expect(await rowBtn.isDisabled()).toBe(true)
  // Word/HWPX 저장 버튼 노출
  await expect(page.locator('button[aria-label="Word(.docx) 저장"]')).toHaveCount(1)

  const groupWidth = () =>
    page.evaluate(() => {
      const g = document.querySelector(".overflow-x-auto")
      return g ? (g as HTMLElement).scrollWidth : -1
    })
  const before = await groupWidth()

  await page.locator(".ProseMirror td").first().click()
  // 표 안에선 활성화(선택 갱신→재렌더 타이밍을 poll 로 흡수)
  await expect.poll(() => rowBtn.isDisabled(), { timeout: 5000 }).toBe(false)
  expect(await groupWidth()).toBe(before) // 툴바 폭 불변(리플로우 없음)
})

// 회귀 방지(2026-07-22): 인쇄/PDF 가 화면과 "같은 엔진"(page-flow-core)을 쓰는지 검증.
// 화면 페이지 경계(스페이서 데코)와 인쇄 break-before 가 같은 블록에 찍혀야 한다.
test("인쇄/PDF 페이지 경계가 화면 페이지 수와 일치한다(같은 엔진)", async ({ page }) => {
  await page.addInitScript(() => {
    // 실제 인쇄 대화상자를 막고 호출 사실만 기록.
    ;(window as unknown as Record<string, unknown>).__printed = false
    window.print = () => { (window as unknown as Record<string, unknown>).__printed = true }
  })
  await pickFolder(page)
  await page.getByText("themed.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(2500) // 페이지 흐름 계산 안정화

  const screenPages = await page.locator(".a4-sheets .a4-page").count()
  const screenSpacers = await page.locator(".ProseMirror .pageflow-spacer").count()
  expect(screenPages).toBeGreaterThan(1)

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("md-editor:export-pdf")))
  await page.waitForFunction(
    () => {
      const rule = document.getElementById("print-page-rule")
      const pp = document.querySelector(".print-pages")
      return !!rule && !!pp && pp.children.length > 0 &&
        (window as unknown as Record<string, unknown>).__printed === true
    },
    { timeout: 8000 }
  )

  const r = await page.evaluate(() => {
    const pp = document.querySelector(".print-pages")!
    let autoBreaks = 0
    let manualBreaks = 0
    Array.from(pp.children).forEach((c) => {
      const el = c as HTMLElement
      if (el.style.breakBefore === "page") autoBreaks++
      if (el.classList.contains("page-break")) manualBreaks++
    })
    return {
      printPages: 1 + autoBreaks + manualBreaks,
      autoBreaks,
      rule: document.getElementById("print-page-rule")!.textContent || "",
    }
  })

  // @page 여백이 프리셋(mm)으로 주입됐는가
  expect(r.rule).toMatch(/@page\s*\{\s*size:\s*A4;\s*margin:\s*\d+mm/)
  // 내용 열 폭이 usable 폭으로 고정됐는가(대화상자 여백 override 로 인한 리플로우 방지)
  expect(r.rule).toMatch(/\.print-pages\s*\{\s*width:\s*\d+mm\s*!important/)
  // 같은 블록에 나눔이 찍혔는가(화면 스페이서 == 인쇄 자동 break)
  expect(r.autoBreaks).toBe(screenSpacers)
  // 페이지 수 일치
  expect(r.printPages).toBe(screenPages)
})

// 회귀 방지(2026-07-22 사용자 보고): 툴바 "Print" 버튼이 window.print() 를 직접
// 호출하면 @page 여백·페이지 경계 계산(prepare)을 건너뛰어 화면과 다르게 출력된다.
// → Print 버튼도 반드시 통일 엔진(prepare→#print-page-rule 주입)을 거쳐야 한다.
test("툴바 Print 버튼은 통일 엔진(prepare)을 거쳐 @page 여백을 주입한다", async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as Record<string, unknown>).__printed = false
    window.print = () => { (window as unknown as Record<string, unknown>).__printed = true }
  })
  await pickFolder(page)
  await page.getByText("themed.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(2500)

  await page.locator('button[aria-label="Print (Ctrl+P)"]').click()
  await page.waitForFunction(
    () => {
      const rule = document.getElementById("print-page-rule")
      const pp = document.querySelector(".print-pages")
      return !!rule && !!pp && pp.children.length > 0 &&
        (window as unknown as Record<string, unknown>).__printed === true
    },
    { timeout: 8000 }
  )
  const rule = await page.evaluate(() => document.getElementById("print-page-rule")!.textContent || "")
  expect(rule).toMatch(/@page\s*\{\s*size:\s*A4;\s*margin:\s*\d+mm/)
})

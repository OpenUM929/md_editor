import { test, expect } from "@playwright/test"

// 검증: 템플릿을 새 문서로 열면 카테고리별 CSS 양식(report-theme--*)이
// 편집 표면에 실제로 적용되고, 그 상태에서 Tiptap WYSIWYG 편집이 유지된다.
// (사용자 요청: "css를 활용해서 만들되 수정은 md_editor처럼")

const MOCK_SETUP = `
const FILES = {}
window.showDirectoryPicker = async () => {
  const makeFH = (name) => {
    const fh = { kind: "file", name }
    Object.defineProperties(fh, {
      getFile: { value: async () => new File([FILES[name] || ""], name, { type: "text/markdown" }), enumerable: false },
      createWritable: { value: async () => ({ write: async (d) => { FILES[name] = typeof d === "string" ? d : "" }, close: async () => {}, seek: async () => {}, truncate: async () => {} }), enumerable: false },
      queryPermission: { value: async () => "granted", enumerable: false },
      requestPermission: { value: async () => "granted", enumerable: false },
      isSameEntry: { value: async () => false, enumerable: false },
    })
    return fh
  }
  const dirHandle = { name: "md files", kind: "directory" }
  Object.defineProperties(dirHandle, {
    queryPermission: { value: async () => "granted", enumerable: false },
    requestPermission: { value: async () => "granted", enumerable: false },
    isSameEntry: { value: async () => false, enumerable: false },
    resolve: { value: async () => null, enumerable: false },
    getFileHandle: { value: async function (n, opts) { if (opts?.create) return makeFH(n); if (FILES[n] !== undefined) return makeFH(n); throw new Error("not found") }, enumerable: false },
    getDirectoryHandle: { value: async function (_n, opts) { if (opts?.create) return dirHandle; throw new Error("not found") }, enumerable: false },
    removeEntry: { value: async () => {}, enumerable: false },
    entries: { value: () => ({ [Symbol.asyncIterator]: async function* () { yield* Object.keys(FILES).map((n) => [n, makeFH(n)]) } }), enumerable: false },
    keys: { value: () => ({ [Symbol.asyncIterator]: async function* () { yield* Object.keys(FILES) } }), enumerable: false },
    values: { value: () => ({ [Symbol.asyncIterator]: async function* () { yield* Object.keys(FILES).map((n) => makeFH(n)) } }), enumerable: false },
  })
  return dirHandle
}
`

test("template preview applies per-category report theme and stays editable", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))

  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")
  await page.getByRole("heading", { name: "워크스페이스 폴더 선택" }).waitFor({ timeout: 10000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 5000 })

  await page.getByRole("button", { name: "Templates" }).click()
  await page.getByRole("button", { name: "템플릿 찾아보기" }).click()

  // 첫 카드(주간 업무 보고서 = report 카테고리) "사용하기" → 새 문서 생성 후 편집기 오픈
  const dialog = page.getByRole("dialog")
  const firstCard = dialog.locator(".group").filter({ hasText: "주간 업무 보고서" }).first()
  await firstCard.hover()
  await firstCard.getByRole("button", { name: "사용하기" }).click()

  // 편집 표면에 카테고리 테마 클래스가 실제로 붙는다
  const themed = page.locator(".report-theme--report").first()
  await expect(themed).toBeVisible({ timeout: 10000 })

  // 그 테마 CSS가 실제로 발현된다 — h1(제목박스) 배경이 투명이 아님
  const h1 = page.locator(".report-theme--report h1").first()
  await expect(h1).toBeVisible({ timeout: 8000 })
  const h1bg = await h1.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(h1bg).not.toBe("rgba(0, 0, 0, 0)")
  expect(h1bg).not.toBe("transparent")

  // 그리고 그 상태에서 Tiptap WYSIWYG 편집이 유지된다
  const pm = page.locator(".ProseMirror[contenteditable='true']").first()
  await expect(pm).toBeVisible({ timeout: 8000 })
  await pm.click()
  await page.keyboard.type("__EDIT_OK__")
  await expect(pm).toContainText("__EDIT_OK__", { timeout: 5000 })

  expect(errors).toEqual([])
})

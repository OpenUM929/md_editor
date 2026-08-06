import { test } from "@playwright/test"

// 검증용: 보고서 템플릿을 새 문서로 열어(분리 모드) 실제 A4 페이지 렌더를 캡처한다.
// 표가 용지 폭을 넘치는지, 페이지 구분/공백이 어떻게 잡히는지 육안 확인 목적.

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

test("capture bunri render of a report template", async ({ page }) => {
  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")
  await page.getByRole("heading", { name: "워크스페이스 폴더 선택" }).waitFor({ timeout: 15000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 5000 })

  await page.getByRole("button", { name: "Templates" }).click()
  await page.getByRole("button", { name: "템플릿 찾아보기" }).click()

  const dialog = page.getByRole("dialog")
  const card = dialog.locator(".group").filter({ hasText: "프로젝트 현황 보고서" }).first()
  await card.hover()
  await card.getByRole("button", { name: "사용하기" }).click()

  // 편집기(분리) 렌더 대기
  await page.locator(".a4-canvas--bunri").first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(2500) // 폰트/레이아웃/자동분할 안정화

  await page.screenshot({ path: "e2e/__shots__/bunri-report.png", fullPage: true })
})

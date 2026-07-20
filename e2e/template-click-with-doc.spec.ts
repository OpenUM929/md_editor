import { test, expect } from "@playwright/test"

const MOCK_SETUP = `
window.showDirectoryPicker = async () => {
  const FILES = { "index.md": "# Index" }
  const makeFH = (name) => {
    const content = FILES[name] || ""
    const fh = { kind: "file", name }
    Object.defineProperties(fh, {
      getFile: { value: async () => new File([content], name, { type: "text/markdown" }), enumerable: false },
      createWritable: { value: async () => ({ write: async () => {}, close: async () => {}, seek: async () => {}, truncate: async () => {} }), enumerable: false },
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
    getFileHandle: { value: async function(n, opts) { if (opts?.create) return makeFH(n); if (FILES[n] !== undefined) return makeFH(n); throw new Error("not found") }, enumerable: false },
    getDirectoryHandle: { value: async function(_n, opts) { if (opts?.create) return dirHandle; throw new Error("not found") }, enumerable: false },
    removeEntry: { value: async () => {}, enumerable: false },
    entries: { value: () => { const e = Object.keys(FILES).map(n => [n, makeFH(n)]); return { [Symbol.asyncIterator]: async function*() { yield* e } } }, enumerable: false },
    keys: { value: () => ({ [Symbol.asyncIterator]: async function*() { yield* Object.keys(FILES) } }), enumerable: false },
    values: { value: () => ({ [Symbol.asyncIterator]: async function*() { yield* Object.keys(FILES).map(n => makeFH(n)) } }), enumerable: false },
  })
  return dirHandle
}
`

test("clicking a template immediately shows preview while a document is open", async ({ page }) => {
  await page.addInitScript(MOCK_SETUP)
  // Open a real, existing document so a doc tab is active.
  await page.goto("http://localhost:3000/index.md")

  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 5000 })

  // The document tab is active; confirm the editor content is visible.
  await page.waitForTimeout(1000)

  await page.getByRole("button", { name: "Templates" }).click()
  await page.waitForTimeout(500)

  const tmpl = page.locator("aside button").filter({ hasText: "주간 업무 보고서" }).first()
  await tmpl.click()

  // The preview must become active immediately, WITHOUT re-clicking the tab.
  await page.waitForTimeout(1000)

  const hasPreview = await page.evaluate(() =>
    document.querySelector("main")?.textContent?.includes("템플릿 미리보기")
  )
  expect(hasPreview, "template preview should be active immediately even with a document open").toBe(true)
})

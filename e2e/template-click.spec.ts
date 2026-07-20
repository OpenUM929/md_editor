import { test, expect } from "@playwright/test"

const MOCK_SETUP = `
window.showDirectoryPicker = async () => {
  const makeFH = (name) => {
    const fh = { kind: "file", name }
    Object.defineProperties(fh, {
      getFile: { value: async () => new File([""], name), enumerable: false },
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
    getFileHandle: { value: async function(n, opts) { if (opts?.create) return makeFH(n); throw new Error("not found") }, enumerable: false },
    getDirectoryHandle: { value: async function(_n, opts) { if (opts?.create) return dirHandle; throw new Error("not found") }, enumerable: false },
    removeEntry: { value: async () => {}, enumerable: false },
    entries: { value: () => ({ [Symbol.asyncIterator]: async function*() {} }), enumerable: false },
    keys: { value: () => ({ [Symbol.asyncIterator]: async function*() {} }), enumerable: false },
    values: { value: () => ({ [Symbol.asyncIterator]: async function*() {} }), enumerable: false },
  })
  return dirHandle
}
`

test("clicking template item opens template preview", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (err) => errors.push(err.message))

  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")

  // Select folder
  await page.getByRole("heading", { name: "워크스페이스 폴더 선택" }).waitFor({ timeout: 10000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 5000 })

  // Switch to Templates tab
  await page.getByRole("button", { name: "Templates" }).click()

  // Wait for template list to load
  await page.waitForTimeout(1000)

  // Take a snapshot to see what's visible
  const snapshot = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"))
    return buttons.map(b => ({ text: b.textContent?.trim().slice(0, 50), visible: b.offsetParent !== null }))
  })
  console.log("All buttons:", JSON.stringify(snapshot, null, 2))

  // Click first template item by finding its button
  const tmplButton = page.locator("aside button").filter({ hasText: "주간 업무 보고서" })
  await expect(tmplButton.first()).toBeVisible({ timeout: 5000 })
  await tmplButton.first().click()

  // Wait for template preview to load
  await page.waitForTimeout(2000)

  // Check if template preview appeared
  const hasPreview = await page.evaluate(() => {
    const main = document.querySelector("main")
    return main?.textContent?.includes("템플릿 미리보기") || main?.textContent?.includes("주간 업무 보고서")
  })
  console.log("Has preview:", hasPreview)
  console.log("Page errors:", errors)
  expect(hasPreview).toBe(true)
})

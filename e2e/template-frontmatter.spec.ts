import { test, expect } from "@playwright/test"

const MOCK_SETUP = `
const FILE_CONTENT = "# Hello World\\n\\nThis is a test document."
const FILES = { "index.md": FILE_CONTENT }
window.showDirectoryPicker = async () => {
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

test("template detail preview does not leak YAML frontmatter", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))

  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")
  await page.getByRole("heading", { name: "워크스페이스 폴더 선택" }).waitFor({ timeout: 10000 })
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 5000 })

  // Open the template browser from the Templates sidebar tab.
  await page.getByRole("button", { name: "Templates" }).click()
  await page.getByRole("button", { name: "템플릿 찾아보기" }).click()

  // Open the detail (Eye) button on the first template card.
  await page.getByRole("button", { name: "상세 보기" }).first().click()

  const pre = page.locator("article pre")
  await expect(pre).toBeVisible({ timeout: 5000 })
  const text = await pre.innerText()

  // Frontmatter must be stripped: no catalog metadata keys, and must not start with `---`.
  expect(text).not.toContain("createdAt:")
  expect(text).not.toContain("order:")
  expect(text.trim().startsWith("---")).toBe(false)
  // Actual content is present.
  expect(text).toContain("주간 업무 보고서")

  console.log("collected console/page errors:", JSON.stringify(errors))
})

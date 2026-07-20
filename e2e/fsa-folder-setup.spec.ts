import { test, expect } from "@playwright/test"

const MOCK_CONTENT = "# Hello World\n\nThis is a test document."

const MOCK_SETUP = `
const FILE_CONTENT = ${JSON.stringify(MOCK_CONTENT)}
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
    getFileHandle: { value: async function(n, opts) {
      if (opts?.create) return makeFH(n)
      if (FILES[n] !== undefined) return makeFH(n)
      throw new Error("not found")
    }, enumerable: false },
    getDirectoryHandle: { value: async function(_n, opts) {
      if (opts?.create) return dirHandle
      throw new Error("not found")
    }, enumerable: false },
    removeEntry: { value: async () => {}, enumerable: false },
    entries: { value: () => {
      const entries = Object.keys(FILES).map(n => [n, makeFH(n)])
      return { [Symbol.asyncIterator]: async function*() { yield* entries } }
    }, enumerable: false },
    keys: { value: () => ({ [Symbol.asyncIterator]: async function*() { yield* Object.keys(FILES) } }), enumerable: false },
    values: { value: () => ({ [Symbol.asyncIterator]: async function*() { yield* Object.keys(FILES).map(n => makeFH(n)) } }), enumerable: false },
  })
  return dirHandle
}
`

test.describe("FSA folder selection", () => {
  test("shows FolderSetup on first visit", async ({ page }) => {
    await page.addInitScript(MOCK_SETUP)
    await page.goto("http://localhost:3000/")
    await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 10000 })
  })

  test("folder selection transitions to workspace", async ({ page }) => {
    await page.addInitScript(MOCK_SETUP)
    await page.goto("http://localhost:3000/")
    await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: "폴더 선택" }).click()
    await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText("md files")).toBeVisible()
  })

  test("navigating to .md route shows folder prompt", async ({ page }) => {
    await page.addInitScript(MOCK_SETUP)
    await page.goto("http://localhost:3000/test.md")
    await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 10000 })
  })

  test("loads markdown file content after folder selection", async ({ page }) => {
    await page.addInitScript(MOCK_SETUP)
    await page.goto("http://localhost:3000/")
    await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: "폴더 선택" }).click()

    await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText("md files")).toBeVisible({ timeout: 5000 })

    await expect(page.getByRole("button", { name: /index\.md/ })).toBeVisible({ timeout: 5000 })
    await page.getByRole("button", { name: /index\.md/ }).click()
    await expect(page.getByText("Hello World")).toBeVisible({ timeout: 10000 })
  })
})

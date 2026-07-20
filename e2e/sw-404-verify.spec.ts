import { test, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const SW_TEST_PATH = "/__sw_test.js"
const SW_TEST_FILE = path.join(process.cwd(), "public", "__sw_test.js")

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

test.beforeAll(() => {
  fs.writeFileSync(
    SW_TEST_FILE,
    `self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', () => self.clientsClaim());\nself.addEventListener('fetch', () => {});\n`,
  )
})

test.afterAll(() => {
  if (fs.existsSync(SW_TEST_FILE)) fs.unlinkSync(SW_TEST_FILE)
})

test("/(root) renders editor (not 404) with no SW precache errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))

  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")

  // Must NOT be the Next 404 page: the FolderSetup heading proves the route matched.
  await expect(page.getByRole("heading", { name: "워크스페이스 폴더 선택" })).toBeVisible({ timeout: 15000 })

  // Proceed to workspace -> proves full client render (no crash/hydration error).
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await expect(page.getByText("md files")).toBeVisible({ timeout: 8000 })

  // Open a file -> renders TabBar (was nesting <button> in <button> -> hydration error).
  await page.getByRole("button", { name: /index\.md/ }).click()
  await expect(page.getByText("Hello World")).toBeVisible({ timeout: 10000 })

  const bad = errors.filter((e) => e.includes("bad-precaching-response"))
  expect(bad, "bad-precaching-response must not appear: " + JSON.stringify(errors)).toEqual([])

  const domNesting = errors.filter(
    (e) => e.includes("descendant of") || e.toLowerCase().includes("hydrat"),
  )
  expect(domNesting, "invalid DOM nesting / hydration error: " + JSON.stringify(errors)).toEqual([])
  console.log("collected console/page errors:", JSON.stringify(errors))
})

test("DevSWCleanup auto-unregisters a stale service worker in dev", async ({ page }) => {
  // Register a throwaway SW, confirm it becomes active, then reload.
  await page.goto("http://localhost:3000/")
  await page.evaluate((url) => navigator.serviceWorker.register(url), SW_TEST_PATH)
  await page.waitForFunction(
    async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.some((r) => r.active)
    },
    null,
    { timeout: 10000 },
  )

  // Reload -> DevSWCleanup (mounted in root layout, dev only) should unregister it.
  await page.reload()
  await page.waitForTimeout(2000)

  const remaining = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
  expect(remaining, "stale SW should be auto-unregistered in dev").toBe(0)
})

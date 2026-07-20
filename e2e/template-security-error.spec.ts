import { test, expect } from "@playwright/test"

/* eslint-disable @typescript-eslint/no-explicit-any */

test("no unhandled SecurityError on load; template click still works", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (err) => pageErrors.push(err.message))

  await page.addInitScript(() => {
    const makeFH = (name: string) => {
      const fh: any = { kind: "file", name }
      Object.defineProperties(fh, {
        getFile: { value: async () => new File([""], name), enumerable: false },
        createWritable: { value: async () => ({ write: async () => {}, close: async () => {} }), enumerable: false },
        queryPermission: { value: async () => "granted", enumerable: false },
        requestPermission: { value: async () => "granted", enumerable: false },
        isSameEntry: { value: async () => false, enumerable: false },
      })
      return fh
    }

    // Stored handle that, on page load (no user activation), throws SecurityError
    const STORED_HANDLE: any = { name: "md files", kind: "directory" }
    Object.defineProperties(STORED_HANDLE, {
      queryPermission: { value: async () => "prompt", enumerable: false },
      requestPermission: {
        value: async () => {
          throw new DOMException("User activation is required to request permissions.", "SecurityError")
        },
        enumerable: false,
      },
      isSameEntry: { value: async () => false, enumerable: false },
      getFileHandle: { value: async (n: string, opts: any) => { if (opts?.create) return makeFH(n); throw new Error("not found") }, enumerable: false },
      getDirectoryHandle: { value: async (_n: string, opts: any) => { if (opts?.create) return STORED_HANDLE; throw new Error("not found") }, enumerable: false },
      removeEntry: { value: async () => {} },
      entries: { value: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
      keys: { value: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
      values: { value: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
    })

    // Force getStoredHandle() to return the handle WITH functions (IndexedDB
    // would drop them via structured clone; simulate persistence here).
    const origGet = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (this: any, key: any) {
      if (key === "rootHandle") {
        const req: any = { result: STORED_HANDLE, readyState: "done", error: null, onsuccess: null, onerror: null }
        const handlers: any = {}
        req.addEventListener = (type: string, cb: any) => { handlers[type] = cb }
        req.removeEventListener = () => {}
        setTimeout(() => { if (handlers["success"]) handlers["success"]({ target: req }) }, 0)
        return req
      }
      return origGet.call(this, key)
    }

    // Fresh handle for manual folder selection (user activation present -> granted)
    window.showDirectoryPicker = async () => {
      const fresh: any = { name: "md files", kind: "directory" }
      Object.defineProperties(fresh, {
        queryPermission: { value: async () => "granted", enumerable: false },
        requestPermission: { value: async () => "granted", enumerable: false },
        isSameEntry: { value: async () => false, enumerable: false },
        getFileHandle: { value: async (n: string, opts: any) => { if (opts?.create) return makeFH(n); throw new Error("not found") }, enumerable: false },
        getDirectoryHandle: { value: async (_n: string, opts: any) => { if (opts?.create) return fresh; throw new Error("not found") }, enumerable: false },
        removeEntry: { value: async () => {} },
        entries: { value: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
        keys: { value: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
        values: { value: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
      })
      return fresh
    }
  })

  await page.goto("http://localhost:3000/")
  await page.getByRole("heading", { name: "워크스페이스 폴더 선택" }).waitFor({ timeout: 10000 })

  const securityErrors = pageErrors.filter((e) => e.includes("SecurityError") || e.includes("User activation"))
  console.log("PAGE ERRORS:", JSON.stringify(pageErrors, null, 2))
  expect(securityErrors.length, "unhandled SecurityError should not occur").toBe(0)

  // App still works: select folder, open template
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 5000 })
  await page.getByRole("button", { name: "Templates" }).click()
  await page.waitForTimeout(500)
  const tmpl = page.locator("aside button").filter({ hasText: "주간 업무 보고서" }).first()
  await tmpl.click()
  await page.waitForTimeout(1000)
  const hasPreview = await page.evaluate(() => document.querySelector("main")?.textContent?.includes("템플릿 미리보기"))
  expect(hasPreview, "template preview should open").toBe(true)
})

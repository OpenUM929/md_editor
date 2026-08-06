import { test, expect, type Page } from "@playwright/test"

const TEST_DOC = [
  "---",
  'title: "리스트 이어붙임 테스트"',
  "---",
  "",
  "## 1. 시스템 접속",
  "",
  "1. 브라우저에서 접속",
  "2. 로그인 화면에서 ID/PW 입력",
  "3. 관리자 계정으로 접속 시 전체 메뉴 확인 가능",
  "",
  "--test start--",
  "",
  "## 2. 필수 확인 사항",
  "",
  "| 항목 | 확인 방법 |",
  "|------|----------|",
  "| 서비스 기동 상태 | 상태 확인 |",
  "",
  "## 10. 테스트 넘버링",
  "",
  "--heading test--",
].join("\n")

const MOCK_SETUP = `
const FILES = { "list-continue-test.md": ${JSON.stringify(TEST_DOC)} }
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

async function openDoc(page: Page) {
  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/")
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 8000 })
  await page.getByText("list-continue-test.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(2000)
}

function getDocNodes(page: Page) {
  return page.evaluate(() => {
    const pm = document.querySelector(".ProseMirror") as any
    const editor = pm?.editor
    if (!editor) return []
    const doc = editor.state.doc
    const nodes: { type: string; childCount?: number; text: string; attrs?: Record<string, any> }[] = []
    doc.forEach((child: any) => {
      const info: any = { type: child.type.name, text: child.textContent?.slice(0, 100) }
      if (child.type.name === "orderedList" || child.type.name === "bulletList") {
        info.childCount = child.childCount
        if (child.attrs) info.attrs = child.attrs
      }
      nodes.push(info)
    })
    return nodes
  })
}

test("ordered list 아래 paragraph에서 ordered list 클릭 → list에 합류", async ({ page }) => {
  await openDoc(page)

  const before = await getDocNodes(page)
  console.log("BEFORE:", JSON.stringify(before))

  const marker = page.locator(".ProseMirror").getByText("--test start--")
  await expect(marker).toBeVisible({ timeout: 5000 })
  await marker.click()
  await page.waitForTimeout(500)

  await page.locator('button[aria-label="Ordered List"]').click()
  await page.waitForTimeout(500)

  const after = await getDocNodes(page)
  console.log("AFTER:", JSON.stringify(after))

  await page.screenshot({ path: "e2e/screenshots/list-continue-result.png", fullPage: false })

  const orderedListAfter = after.find((n: any) => n.type === "orderedList")
  expect(orderedListAfter).toBeTruthy()
  expect(orderedListAfter!.childCount).toBe(4)

  const markerParagraph = after.find((n: any) => n.text.includes("--test start--") && n.type === "paragraph")
  expect(markerParagraph).toBeUndefined()
})

test("번호 포함 heading 아래 paragraph에서 ordered list 클릭 → heading 번호 이어붙임", async ({ page }) => {
  await openDoc(page)

  const marker = page.locator(".ProseMirror").getByText("--heading test--")
  await expect(marker).toBeVisible({ timeout: 5000 })
  await marker.click()
  await page.waitForTimeout(500)

  await page.locator('button[aria-label="Ordered List"]').click()
  await page.waitForTimeout(500)

  const after = await getDocNodes(page)
  console.log("HEADING TEST:", JSON.stringify(after))

  await page.screenshot({ path: "e2e/screenshots/list-continue-heading.png", fullPage: false })

  const headingList = after.find((n: any) => n.type === "orderedList" && n.text.includes("heading test"))
  expect(headingList).toBeTruthy()
  expect(headingList!.attrs?.start).toBe(11)

  const markerParagraph = after.find((n: any) => n.text.includes("--heading test--") && n.type === "paragraph")
  expect(markerParagraph).toBeUndefined()
})

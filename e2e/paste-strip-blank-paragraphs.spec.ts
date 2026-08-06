import { test, expect, type Page } from "@playwright/test"

const TEST_DOC = [
  "---",
  'title: "붙여넣기 빈 문단 제거 테스트"',
  "---",
  "",
  "## 복제 테스트",
  "",
  "복제 대상",
  "",
  "다음 단락",
].join("\n")

const MOCK_SETUP = `
const FILES = { "paste-blank-test.md": ${JSON.stringify(TEST_DOC)} }
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

const PASSWORD = process.env.AUTH_PASSWORD ?? "admin123"

async function openDoc(page: Page) {
  await page.addInitScript(MOCK_SETUP)
  await page.goto("http://localhost:3000/login")
  await page.getByLabel("비밀번호").fill(PASSWORD)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("http://localhost:3000/")
  await page.getByRole("button", { name: "폴더 선택" }).click()
  await page.getByText("md files").waitFor({ timeout: 8000 })
  await page.getByText("paste-blank-test.md", { exact: true }).first().click({ timeout: 8000 })
  await page.waitForSelector(".ProseMirror", { timeout: 15000 })
  await page.waitForTimeout(2000)
}

// 커서를 "복제 대상" 문단과 "다음 단락" 문단 사이(블록 경계)에 둔다.
async function placeCaretBetweenBlocks(page: Page) {
  await page.evaluate(() => {
    const pm = document.querySelector(".ProseMirror") as unknown as {
      editor: {
        state: {
          doc: { forEach: (cb: (n: { textContent: string }, offset: number) => void) => void }
        }
        commands: { setTextSelection: (pos: number) => boolean }
      } | null
    }
    const editor = pm?.editor
    if (!editor) return
    let pos = -1
    editor.state.doc.forEach((node, offset) => {
      if (pos !== -1) return
      if (node.textContent.includes("다음 단락")) pos = offset
    })
    if (pos !== -1) editor.commands.setTextSelection(pos)
  })
  await page.waitForTimeout(200)
}

async function dispatchPaste(page: Page, html: string, text: string) {
  await page.evaluate(({ html, text }) => {
    const pm = document.querySelector(".ProseMirror") as unknown as {
      focus: () => void
      dispatchEvent: (e: Event) => boolean
    }
    if (!pm) return
    pm.focus()
    const dt = new DataTransfer()
    dt.setData("text/html", html)
    dt.setData("text/plain", text)
    pm.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }))
  }, { html, text })
  await page.waitForTimeout(500)
}

function getDocNodes(page: Page) {
  return page.evaluate(() => {
    const editor = (document.querySelector(".ProseMirror") as unknown as {
      editor: {
        state: {
          doc: { forEach: (cb: (n: { type: { name: string }; textContent: string }) => void) => void }
        }
      } | null
    })?.editor
    if (!editor) return []
    const nodes: { type: string; text: string }[] = []
    editor.state.doc.forEach((child) => {
      nodes.push({ type: child.type.name, text: child.textContent })
    })
    return nodes
  })
}

function emptyParagraphCount(nodes: { type: string; text: string }[]): number {
  return nodes.filter((n) => n.type === "paragraph" && n.text.trim() === "").length
}

test("HTML 붙여넣기: 슬라이스 앞뒤의 빈 문단이 삽입되지 않는다", async ({ page }) => {
  await openDoc(page)
  const before = await getDocNodes(page)
  const emptyBefore = emptyParagraphCount(before)

  await placeCaretBetweenBlocks(page)

  // 실제로 선택에 딸려 올 수 있는 "빈 문단 + 대상 블록 + 빈 문단" 형태의 복사본을 붙여넣는다.
  await dispatchPaste(
    page,
    "<p></p><p>복제된 단락</p><p></p>",
    "\n\n복제된 단락\n\n"
  )

  const after = await getDocNodes(page)
  const idx = after.findIndex((n) => n.text.includes("복제된 단락"))
  expect(idx).toBeGreaterThan(-1)

  // 빈 문단(앞/뒤 경계)이 추가로 생기지 않아야 한다.
  expect(emptyParagraphCount(after)).toBe(emptyBefore)
  // 대상 블록 바로 앞뒤는 빈 문단이 아니어야 한다.
  expect(after[idx - 1]?.text.trim()).not.toBe("")
  expect(after[idx + 1]?.text.trim()).not.toBe("")
})

test("같은 편집기 복사(data-pm-slice): 슬라이스 앞뒤의 빈 문단이 삽입되지 않는다", async ({ page }) => {
  await openDoc(page)
  const before = await getDocNodes(page)
  const emptyBefore = emptyParagraphCount(before)

  await placeCaretBetweenBlocks(page)

  // 같은 편집기 안에서 블록을 드래그 선택해 복제하면, 대상 앞뒤의 빈 문단이
  // data-pm-slice 슬라이스에 함께 실려 온다. 그 형태 그대로 붙여넣기를 재현한다.
  await dispatchPaste(
    page,
    '<div data-pm-slice="0 0"><p></p><p>복제된 단락</p><p></p></div>',
    "\n\n복제된 단락\n\n"
  )

  const after = await getDocNodes(page)
  const idx = after.findIndex((n) => n.text.includes("복제된 단락"))
  expect(idx).toBeGreaterThan(-1)

  expect(emptyParagraphCount(after)).toBe(emptyBefore)
  expect(after[idx - 1]?.text.trim()).not.toBe("")
  expect(after[idx + 1]?.text.trim()).not.toBe("")
})

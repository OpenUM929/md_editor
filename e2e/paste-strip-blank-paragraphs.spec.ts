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

// 사용자 실버그: 단어를 선택 → 복사 → 그대로 붙여넣기(선택 교체)하면 ProseMirror가
// 셀라이스를 빈 문단+내용+빈 문단(4블록)으로 펼쳐 문단을 쪼갰다. 붙여넣기 시점에
// 다중 문자 선택이면 인라인으로 펼쳐져 문단이 그대로 유지되어야 한다.
test("선택한 단어를 붙여넣어 교체해도 문단이 쪼개지지 않는다", async ({ page }) => {
  await openDoc(page)

  // 사용자 실버그 재현: MD 뷰어는 breaks:true 로 원본 개행을 <br> 로 렌더링한다.
  // 즉 "X과\n내용과" 형식의 원본 md는 한 문단 <p>X과<br>내용과</p> 가 된다.
  // 이런 "한 문단 + <br>" 구조에서 '과'를 선택 → 복사 → 붙여넣기하면 문단이 쪼개진다.
  await page.evaluate(async () => {
    const editor = (document.querySelector(".ProseMirror") as unknown as {
      editor: { commands: { setContent: (h: string) => boolean } } | null
    })?.editor
    editor?.commands.setContent("<p>X과<br>내용과</p>")
  })
  await page.waitForTimeout(200)

  // 첫 번째 '과'(X과의 과)를 PM 내부 selection으로 잡는다. 문단 텍스트 = "X과\n내용과".
  // textContent는 \n 포함 → 'X과' 뒤의 과 = 인덱스 1, PM 위치 = 1+1=2.
  await page.evaluate(() => {
    const editor = (document.querySelector(".ProseMirror") as unknown as {
      editor: {
        state: { doc: { textBetween: (a: number, b: number) => string; content: { size: number } } }
        commands: { setTextSelection: (f: number, t: number) => boolean }
      } | null
    })?.editor
    if (!editor) return
    const txt = editor.state.doc.textBetween(0, editor.state.doc.content.size)
    const idx = txt.indexOf("과")
    if (idx >= 0) editor.commands.setTextSelection(1 + idx, 1 + idx + 1)
  })
  await page.waitForTimeout(100)

  // DOM 선택: 첫 번째 텍스트 노드의 '과' 인덱스.
  await page.evaluate(() => {
    const pm = document.querySelector(".ProseMirror") as HTMLElement | null
    if (!pm) return
    const textNode = pm.querySelector("p")?.childNodes[0] ?? null
    if (!textNode) return
    const full = (textNode as Text).textContent ?? ""
    const idx = full.indexOf("과")
    if (idx < 0) return
    const range = document.createRange()
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx + 1)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  })
  await page.waitForTimeout(200)

  // 선택된 단어와 동일한 내용을 붙여넣는다. 실제 사용자가 복사한 HTML(data-pm-slice="1 1 []")은
  // 파싱 시점에 ProseMirror가 "빈 문단 + 내용 + 빈 문단"(4블록)으로 펼친다(콘솔: os:0 oe:0 cc:4).
  // 사용자의 실제 복사 슬라이스 HTML을 그대로 재현한다.
  // 실제 OS 클립보드 경로로 붙여넣기를 재현한다. 모조 dispatchPaste는 PM을
  // os:1 oe:1(이미 인라인)로 만들 뿐 사용자 실버그의 os:0 oe:0 cc:4 확장을 못 재현한다.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:3000" })
  await page.evaluate(async () => {
    const item = new ClipboardItem({
      "text/html": new Blob(['<html><body><!--StartFragment--><p data-pm-slice="1 1 []">과</p><!--EndFragment--></body></html>'], { type: "text/html" }),
      "text/plain": new Blob(["과"], { type: "text/plain" }),
    })
    await navigator.clipboard.write([item])
  })
  await page.waitForTimeout(200)
  await page.keyboard.press("Control+V")
  await page.waitForTimeout(300)

  const after = await getDocNodes(page)
  // 문단 하나로 유지(쪼개짐 없음), '과'로 교체되어야 한다.
  expect(after.filter((n) => n.type === "paragraph" && n.text.trim() === "").length).toBe(0)
  const joined = after.map((n) => n.text).join("")
  expect(joined).toContain("과")
})

// 사용자 실버그: 문단 안에 커서만 두고(선택 없이) 복사한 단어·문장을 붙여넣어도
// 문단이 쪼개지면 안 된다. 커서 삽입(비교체)도 선택 교체와 똑같이 인라인 병합.
test("커서 삽입(선택 없음): 문장을 붙여넣어도 문단이 쪼개지지 않는다", async ({ page }) => {
  await openDoc(page)

  await page.evaluate(async () => {
    const editor = (document.querySelector(".ProseMirror") as unknown as {
      editor: { commands: { setContent: (h: string) => boolean } } | null
    })?.editor
    editor?.commands.setContent("<p>가나다</p>")
  })
  await page.waitForTimeout(200)

  // 커서를 "가"와 "나" 사이(문단 중간)에 두기: 직접 셀렉션 세팅
  await page.evaluate(() => {
    const editor = (document.querySelector(".ProseMirror") as unknown as {
      editor: {
        state: { doc: { content: { size: number }; textBetween: (a: number, b: number) => string } }
        commands: { setTextSelection: (p: number) => boolean }
      } | null
    })?.editor
    if (!editor) return
    const txt = editor.state.doc.textBetween(0, editor.state.doc.content.size)
    const idx = txt.indexOf("나")
    if (idx >= 0) editor.commands.setTextSelection(idx)
  })
  await page.waitForTimeout(100)

  await dispatchPaste(page, "<p>복사한 문장</p>", "복사한 문장")

  const after = await getDocNodes(page)
  // 문단 하나로 유지(쪼개짐 없음) + 빈 문단 없음
  expect(after.length).toBe(1)
  expect(after[0].type).toBe("paragraph")
  expect(after.filter((n) => n.type === "paragraph" && n.text.trim() === "").length).toBe(0)
  expect(after[0].text).toContain("복사한 문장")
})

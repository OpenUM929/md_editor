import { marked } from "marked"
import type { Token, Tokens } from "marked"
import type { ReportTheme } from "./report-theme"
import { THEME_ACCENT } from "./a4-styles"
import type { MarginPresetId } from "./a4-margins"
import { A4_MARGIN_PRESETS } from "./a4-margins"
import { headingNumberingFromMarkdown, HeadingNumberer } from "./heading-numbering"

// HWPX 생성 계획(plan). 마크다운 파싱은 여기(Node, marked)에서만 하고,
// 실제 OWPML 조립은 scripts/hwpx_gen.py(공인 라이브러리 python-hwpx)가 담당한다.
// DOCX(docx-export.ts)와 같은 marked 토큰을 쓰므로 두 포맷의 해석이 일치한다.
// 화면(markdown.ts)과 동일하게 단일 개행도 줄바꿈으로 해석(번들 경계상 marked 싱글턴 공유가
// 보장되지 않으므로 이 파일에서도 명시적으로 설정)
marked.setOptions({ breaks: true })

const PAGE_BREAK_TOKEN = "---pb---"

export type HwpxRun = { text: string; bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean }

export type HwpxBlock =
  | { type: "heading"; level: number; runs: HwpxRun[] }
  | { type: "paragraph"; runs: HwpxRun[] }
  | { type: "bullet"; level: number; items: string[] }
  | { type: "ordered"; level: number; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "blockquote"; runs: HwpxRun[] }
  | { type: "code"; text: string }
  | { type: "pagebreak" }

export type HwpxPlan = {
  out: string
  title: string
  accent: string
  margins: { top: number; bottom: number; left: number; right: number }
  blocks: HwpxBlock[]
}

function getTokens(t: Token): Token[] | undefined {
  return (t as unknown as { tokens?: Token[] }).tokens
}

// 인라인 토큰 → run 배열(굵게/기울임/취소선/코드 반영).
function inlineToRuns(tokens: Token[] | undefined, fmt: Partial<HwpxRun> = {}): HwpxRun[] {
  if (!tokens) return []
  const runs: HwpxRun[] = []
  for (const t of tokens) {
    switch (t.type) {
      case "text": {
        const sub = getTokens(t)
        if (sub && sub.length) runs.push(...inlineToRuns(sub, fmt))
        else runs.push({ text: (t as Tokens.Text).text, ...fmt })
        break
      }
      case "strong":
        runs.push(...inlineToRuns(getTokens(t), { ...fmt, bold: true }))
        break
      case "em":
        runs.push(...inlineToRuns(getTokens(t), { ...fmt, italic: true }))
        break
      case "del":
        runs.push(...inlineToRuns(getTokens(t), { ...fmt, strike: true }))
        break
      case "codespan":
        runs.push({ text: (t as Tokens.Codespan).text, code: true, ...fmt })
        break
      case "link": {
        runs.push(...inlineToRuns(getTokens(t), fmt))
        const href = (t as Tokens.Link).href
        if (href) runs.push({ text: ` (${href})`, italic: true })
        break
      }
      case "br":
        runs.push({ text: "\n" })
        break
      case "image":
        runs.push({ text: `[${(t as Tokens.Image).text || "image"}]`, italic: true })
        break
      default:
        if ("text" in t && typeof (t as { text?: unknown }).text === "string") {
          runs.push({ text: (t as { text: string }).text, ...fmt })
        }
    }
  }
  return runs
}

// 표 셀용 평문(인라인 서식 제거, 텍스트만). GFM 셀처럼 개행 불가 영역이라 공백으로 접는다.
function plainText(tokens: Token[] | undefined): string {
  return inlineToRuns(tokens).map((r) => r.text).join("").replace(/\n/g, " ").trim()
}

// 목록 항목용 평문. 표 셀과 달리 항목 안에서도 원본 줄바꿈(<br>)이 있을 수 있으므로
// 공백으로 접지 않고 "\n"을 그대로 보존한다 — hwpx_gen.py가 이를 실제 lineBreak
// 요소로 변환한다(그대로 두면 항목 안 여러 줄이 한 줄로 뭉개지는 회귀가 있었다).
function listItemText(tokens: Token[] | undefined): string {
  return inlineToRuns(tokens).map((r) => r.text).join("").trim()
}

function pushList(list: Tokens.List, level: number, out: HwpxBlock[]): void {
  const kind: "bullet" | "ordered" = list.ordered ? "ordered" : "bullet"
  let pending: string[] = []
  const flush = () => {
    if (pending.length) {
      out.push({ type: kind, level, items: pending })
      pending = []
    }
  }
  for (const item of list.items) {
    const textTokens: Token[] = []
    const nested: Tokens.List[] = []
    for (const sub of item.tokens || []) {
      if (sub.type === "list") nested.push(sub as Tokens.List)
      else if (sub.type === "text") {
        const inner = getTokens(sub)
        if (inner && inner.length) textTokens.push(...inner)
        else textTokens.push({ type: "text", raw: "", text: (sub as Tokens.Text).text } as Tokens.Text)
      } else textTokens.push(sub)
    }
    const prefix = item.task ? (item.checked ? "☑ " : "☐ ") : ""
    pending.push(prefix + listItemText(textTokens))
    // 중첩 목록은 순서 보존을 위해 현재까지의 항목을 먼저 확정하고 하위로 내려간다.
    if (nested.length) {
      flush()
      for (const n of nested) pushList(n, level + 1, out)
    }
  }
  flush()
}

function blockToPlan(token: Token, out: HwpxBlock[], numberer: HeadingNumberer | null): void {
  switch (token.type) {
    case "heading": {
      const t = token as Tokens.Heading
      const depth = Math.min(t.depth, 6)
      const runs = inlineToRuns(t.tokens)
      if (numberer && depth <= 4) {
        runs.unshift({ text: `${numberer.next(depth)} `, bold: true })
      }
      out.push({ type: "heading", level: depth, runs })
      break
    }
    case "paragraph": {
      const t = token as Tokens.Paragraph
      if (t.text?.trim() === PAGE_BREAK_TOKEN) {
        out.push({ type: "pagebreak" })
        break
      }
      out.push({ type: "paragraph", runs: inlineToRuns(t.tokens) })
      break
    }
    case "list":
      pushList(token as Tokens.List, 0, out)
      break
    case "table": {
      const t = token as Tokens.Table
      out.push({
        type: "table",
        header: t.header.map((c) => plainText(c.tokens)),
        rows: t.rows.map((row) => row.map((c) => plainText(c.tokens))),
      })
      break
    }
    case "blockquote": {
      const t = token as Tokens.Blockquote
      for (const sub of t.tokens || []) {
        if (sub.type === "paragraph") out.push({ type: "blockquote", runs: inlineToRuns(getTokens(sub)) })
      }
      break
    }
    case "code":
      out.push({ type: "code", text: (token as Tokens.Code).text })
      break
    case "hr":
    case "space":
      break
    default:
      if ("text" in token && typeof (token as { text?: unknown }).text === "string") {
        out.push({ type: "paragraph", runs: [{ text: (token as { text: string }).text }] })
      }
  }
}

function extractFrontmatter(markdown: string): { body: string; title?: string } {
  const lines = markdown.split("\n")
  if (lines[0]?.trim() !== "---") return { body: markdown }
  const end = lines.indexOf("---", 1)
  if (end <= 0) return { body: markdown }
  const inner = lines.slice(1, end)
  // 진짜 프런트매터만 인식한다. 문서가 수평선(---)으로 시작해 본문에 또 다른 ---
  // 구분선이 오는 경우, 그 사이 본문을 프런트매터로 오인해 통째로 버리지 않도록
  // "key: value" 형태의 줄로만 이뤄졌을 때만 프런트매터로 취급한다.
  const looksLikeFrontmatter =
    inner.length > 0 && inner.every((l) => l.trim() === "" || /^\s*[\w-]+\s*:/.test(l))
  if (!looksLikeFrontmatter) return { body: markdown }
  let title: string | undefined
  for (const line of inner) {
    const idx = line.indexOf(":")
    if (idx > 0 && line.slice(0, idx).trim() === "title") {
      title = line.slice(idx + 1).trim().replace(/^["'](.*)["']$/, "$1")
    }
  }
  return { body: lines.slice(end + 1).join("\n"), title }
}

export function mdToHwpxPlan(
  markdown: string,
  outPath: string,
  theme: ReportTheme = "report",
  marginPreset: MarginPresetId = "very-narrow",
  title?: string,
): HwpxPlan {
  const { body, title: fmTitle } = extractFrontmatter(markdown)
  const headingNumbering = headingNumberingFromMarkdown(markdown)
  const margins = A4_MARGIN_PRESETS[marginPreset].values
  const processedBody = body.replace(/---pb---/g, `\n${PAGE_BREAK_TOKEN}\n`)
  const tokens = marked.lexer(processedBody)
  const blocks: HwpxBlock[] = []
  const numberer = headingNumbering ? new HeadingNumberer() : null
  for (const token of tokens) blockToPlan(token, blocks, numberer)

  return {
    out: outPath,
    title: title || fmTitle || "Untitled",
    accent: THEME_ACCENT[theme] || "#1B1760",
    margins: { top: margins.top, bottom: margins.bottom, left: margins.left, right: margins.right },
    blocks,
  }
}

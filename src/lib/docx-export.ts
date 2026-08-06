import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  ShadingType,
  LevelFormat,
  LineRuleType,
  convertMillimetersToTwip,
} from "docx"
import { marked } from "marked"
import type { Token, Tokens } from "marked"
import type { ReportTheme } from "./report-theme"
import { THEME_ACCENT } from "./a4-styles"
import type { MarginPresetId } from "./a4-margins"
import { A4_MARGIN_PRESETS } from "./a4-margins"
import { headingNumberingFromMarkdown, HeadingNumberer } from "./heading-numbering"

// 화면(markdown.ts)과 동일하게 단일 개행도 줄바꿈으로 해석(번들 경계상 marked 싱글턴 공유가
// 보장되지 않으므로 이 파일에서도 명시적으로 설정)
marked.setOptions({ breaks: true })

const PAGE_BREAK_TOKEN = "---pb---"

// 표준 §1-2 타이포그래피. docx 크기 단위 = 하프포인트(12pt=24), 테두리 = 1/8pt(4pt=32),
// 간격/들여쓰기 = 트윕(1pt=20). 화면(report-theme.css)과 같은 값으로 맞춘다.
const FONT = "맑은 고딕"
const SZ = { body: 24, h1: 40, h2: 30, h3: 26, h4: 23, h5: 23, h6: 23, table: 21, code: 18 }
const GRAY = "F2F2F2" // 제목박스·표 헤더 배경
const QUOTE_BG = "F5F7FA"
const QUOTE_BAR = "7A8BA0"
const CODE_BG = "F6F7F9"
const TBL_BORDER = "999999"
const LINE_19 = { line: 456, lineRule: LineRuleType.AUTO } // 행간 1.9

const HEADING_OUTLINE = [0, 1, 2, 3, 4, 5]

type Fmt = { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean; size?: number }

function getTokens(t: Token): Token[] | undefined {
  return (t as unknown as { tokens?: Token[] }).tokens
}

function inlineToRuns(tokens: Token[] | undefined, fmt: Fmt = {}): TextRun[] {
  if (!tokens) return []
  const runs: TextRun[] = []
  for (const t of tokens) {
    switch (t.type) {
      case "text": {
        const sub = getTokens(t)
        if (sub && sub.length) {
          runs.push(...inlineToRuns(sub, fmt))
        } else {
          runs.push(
            new TextRun({
              text: (t as Tokens.Text).text,
              bold: fmt.bold,
              italics: fmt.italics,
              strike: fmt.strike,
              size: fmt.size,
              font: fmt.code ? "Consolas" : undefined,
            })
          )
        }
        break
      }
      case "strong":
        runs.push(...inlineToRuns(getTokens(t), { ...fmt, bold: true }))
        break
      case "em":
        runs.push(...inlineToRuns(getTokens(t), { ...fmt, italics: true }))
        break
      case "del":
        runs.push(...inlineToRuns(getTokens(t), { ...fmt, strike: true }))
        break
      case "codespan":
        runs.push(
          new TextRun({
            text: (t as Tokens.Codespan).text,
            font: "Consolas",
            size: fmt.size,
            bold: fmt.bold,
            italics: fmt.italics,
          })
        )
        break
      case "link": {
        // 하이퍼링크는 생략하고 텍스트 뒤에 URL 을 괄호로 덧붙인다(왕복·가독 목적).
        const inner = inlineToRuns(getTokens(t), fmt)
        runs.push(...inner)
        const href = (t as Tokens.Link).href
        if (href) runs.push(new TextRun({ text: ` (${href})`, italics: true, size: fmt.size }))
        break
      }
      case "br":
        runs.push(new TextRun({ text: "", break: 1 }))
        break
      case "image":
        runs.push(new TextRun({ text: `[${(t as Tokens.Image).text || "image"}]`, italics: true, size: fmt.size }))
        break
      default:
        if ("text" in t && typeof (t as { text?: unknown }).text === "string") {
          runs.push(new TextRun({ text: (t as { text: string }).text, ...fmt }))
        }
    }
  }
  return runs
}

function cellAlignment(align: "center" | "left" | "right" | null): typeof AlignmentType[keyof typeof AlignmentType] | undefined {
  if (align === "center") return AlignmentType.CENTER
  if (align === "right") return AlignmentType.RIGHT
  return undefined
}

// 표 §1-2: 헤더 #F2F2F2·본문 10.5pt·얇은 실선. Word 가 확실히 표로 렌더하도록 폭은
// 퍼센트(100%)·자동 레이아웃을 쓴다(고정폭 layout + pct + dxa 혼용은 Word 가 표를
// 복구모드로 떨궈 "글로만" 나오는 회귀를 유발했다 — 2026-07-22).
function renderTable(table: Tokens.Table): Table {
  const border = { style: BorderStyle.SINGLE, size: 5, color: TBL_BORDER } // ~0.6pt

  const headerRow = new TableRow({
    tableHeader: true,
    children: table.header.map(
      (cell) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: GRAY },
          children: [
            new Paragraph({
              alignment: cellAlignment(cell.align) ?? AlignmentType.CENTER,
              spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 20, after: 20 },
              children: inlineToRuns(cell.tokens, { bold: true, size: SZ.table }),
            }),
          ],
        })
    ),
  })

  const bodyRows = table.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: cellAlignment(cell.align),
                  spacing: { line: 260, lineRule: LineRuleType.AUTO, before: 20, after: 20 },
                  children: inlineToRuns(cell.tokens, { size: SZ.table }),
                }),
              ],
            })
        ),
      })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: [headerRow, ...bodyRows],
  })
}

function listToParagraphs(list: Tokens.List, level = 0): Paragraph[] {
  const out: Paragraph[] = []
  for (const item of list.items) {
    const textTokens: Token[] = []
    const nested: Tokens.List[] = []
    for (const sub of item.tokens || []) {
      if (sub.type === "list") {
        nested.push(sub as Tokens.List)
      } else if (sub.type === "text") {
        const inner = getTokens(sub)
        if (inner && inner.length) textTokens.push(...inner)
        else textTokens.push({ type: "text", raw: "", text: (sub as Tokens.Text).text } as Tokens.Text)
      } else {
        textTokens.push(sub)
      }
    }
    const runs = inlineToRuns(textTokens)
    if (item.task) {
      runs.unshift(new TextRun({ text: item.checked ? "☑ " : "☐ " }))
      out.push(new Paragraph({ children: runs, spacing: { before: 20, after: 40, ...LINE_19 }, bullet: { level } }))
    } else if (list.ordered) {
      out.push(new Paragraph({ children: runs, spacing: { before: 20, after: 40, ...LINE_19 }, numbering: { reference: "ordered", level } }))
    } else {
      // 개조식 §1-2: □(1단)/○(2단) 마커 — reportBullet 넘버링 사용.
      out.push(new Paragraph({ children: runs, spacing: { before: 20, after: 40, ...LINE_19 }, numbering: { reference: "reportBullet", level } }))
    }
    for (const n of nested) out.push(...listToParagraphs(n, level + 1))
  }
  return out
}

function headingParagraph(t: Tokens.Heading, accent: string, numberer: HeadingNumberer | null): Paragraph {
  const depth = Math.min(t.depth, 6)
  const runs = inlineToRuns(t.tokens, { bold: true, size: (SZ as Record<string, number>)[`h${depth}`] ?? SZ.h4 })
  if (numberer && depth <= 4) {
    const num = numberer.next(depth)
    runs.unshift(new TextRun({ text: `${num} `, bold: true, size: (SZ as Record<string, number>)[`h${depth}`] ?? SZ.h4 }))
  }
  const base = { outlineLevel: HEADING_OUTLINE[depth - 1] }
  if (depth === 1) {
    // 제목박스: 20pt Bold·가운데·회색 배경 + 테두리(사방).
    const box = { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 6 }
    return new Paragraph({
      ...base,
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, color: "auto", fill: GRAY },
      border: { top: box, bottom: box, left: box, right: box },
      spacing: { before: 120, after: 280, line: 300, lineRule: LineRuleType.AUTO },
      children: runs,
    })
  }
  if (depth === 2) {
    // 섹션: 15pt Bold·좌측 4pt 강조선(네이비).
    return new Paragraph({
      ...base,
      spacing: { before: 360, after: 160, line: 280, lineRule: LineRuleType.AUTO },
      border: { left: { style: BorderStyle.SINGLE, size: 32, color: accent.replace("#", ""), space: 8 } },
      children: runs,
    })
  }
  const beforeAfter =
    depth === 3 ? { before: 280, after: 100 } : depth === 4 ? { before: 200, after: 80 } : { before: 160, after: 60 }
  return new Paragraph({
    ...base,
    spacing: { ...beforeAfter, line: 260, lineRule: LineRuleType.AUTO },
    indent: depth >= 3 ? { left: convertMillimetersToTwip(depth === 3 ? 2 : 4) } : undefined,
    children: runs,
  })
}

function blockToElements(token: Token, accent: string, numberer: HeadingNumberer | null): (Paragraph | Table)[] {
  switch (token.type) {
    case "heading":
      return [headingParagraph(token as Tokens.Heading, accent, numberer)]
    case "paragraph": {
      const t = token as Tokens.Paragraph
      if (t.text?.trim() === PAGE_BREAK_TOKEN) {
        return [new Paragraph({ children: [new PageBreak()] })]
      }
      return [new Paragraph({ spacing: { after: 100, ...LINE_19 }, children: inlineToRuns(t.tokens) })]
    }
    case "list":
      return listToParagraphs(token as Tokens.List)
    case "table":
      return [renderTable(token as Tokens.Table)]
    case "blockquote": {
      // 참고(주)·캡션 §1-2: 좌측 3pt 바 + 연회색 배경.
      const t = token as Tokens.Blockquote
      const subs = t.tokens || []
      return subs
        .filter((s) => s.type === "paragraph")
        .map(
          (s) =>
            new Paragraph({
              indent: { left: convertMillimetersToTwip(3) },
              spacing: { before: 80, after: 100, line: 300, lineRule: LineRuleType.AUTO },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: QUOTE_BG },
              border: { left: { style: BorderStyle.SINGLE, size: 24, color: QUOTE_BAR, space: 8 } },
              children: inlineToRuns(getTokens(s), { italics: true }),
            })
        )
    }
    case "code": {
      const t = token as Tokens.Code
      return t.text.split("\n").map(
        (line) =>
          new Paragraph({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: CODE_BG },
            spacing: { line: 240, lineRule: LineRuleType.AUTO },
            children: [new TextRun({ text: line || " ", font: "Consolas", size: SZ.code })],
          })
      )
    }
    case "hr":
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TBL_BORDER } },
          spacing: { before: 120, after: 120 },
          children: [],
        }),
      ]
    case "space":
      return []
    default:
      if ("text" in token && typeof (token as { text?: unknown }).text === "string") {
        return [new Paragraph({ spacing: LINE_19, children: [new TextRun({ text: (token as { text: string }).text })] })]
      }
      return []
  }
}

function extractFrontmatter(markdown: string): { body: string; title?: string } {
  const lines = markdown.split("\n")
  if (lines[0]?.trim() !== "---") return { body: markdown }
  const end = lines.indexOf("---", 1)
  if (end <= 0) return { body: markdown }
  let title: string | undefined
  for (const line of lines.slice(1, end)) {
    const idx = line.indexOf(":")
    if (idx > 0 && line.slice(0, idx).trim() === "title") {
      title = line.slice(idx + 1).trim().replace(/^["'](.*)["']$/, "$1")
    }
  }
  return { body: lines.slice(end + 1).join("\n"), title }
}

export function buildDocx(
  markdown: string,
  theme: ReportTheme = "report",
  marginPreset: MarginPresetId = "very-narrow",
  title?: string
): Document {
  const { body, title: fmTitle } = extractFrontmatter(markdown)
  const headingNumbering = headingNumberingFromMarkdown(markdown)
  const accent = THEME_ACCENT[theme] || "#1B1760"
  const accentHex = accent.replace("#", "")
  const margins = A4_MARGIN_PRESETS[marginPreset].values

  const processedBody = body.replace(/---pb---/g, `\n${PAGE_BREAK_TOKEN}\n`)
  const tokens = marked.lexer(processedBody)

  const numberer = headingNumbering ? new HeadingNumberer() : null
  const children: (Paragraph | Table)[] = []
  for (const token of tokens) {
    children.push(...blockToElements(token, accent, numberer))
  }

  return new Document({
    creator: "md_editor",
    title: title || fmTitle || "Untitled",
    // 문서 기본 서식 = 본문 §1-2: 맑은 고딕 12pt / 행간 1.9 / 검정.
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SZ.body, color: "000000" },
          paragraph: { spacing: { ...LINE_19, after: 100 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "ordered",
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
        {
          // 개조식 마커 □(1단)/○(2단)/–(3단), 마커색 = 강조색(네이비).
          reference: "reportBullet",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "□", alignment: AlignmentType.LEFT, style: { run: { color: accentHex, font: FONT }, paragraph: { indent: { left: 360, hanging: 260 } } } },
            { level: 1, format: LevelFormat.BULLET, text: "○", alignment: AlignmentType.LEFT, style: { run: { color: accentHex, font: FONT }, paragraph: { indent: { left: 720, hanging: 260 } } } },
            { level: 2, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { run: { color: accentHex, font: FONT }, paragraph: { indent: { left: 1080, hanging: 260 } } } },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(margins.top),
              bottom: convertMillimetersToTwip(margins.bottom),
              left: convertMillimetersToTwip(margins.left),
              right: convertMillimetersToTwip(margins.right),
            },
          },
        },
        children,
      },
    ],
  })
}

export async function mdToDocxBlob(
  markdown: string,
  theme: ReportTheme = "report",
  marginPreset: MarginPresetId = "very-narrow",
  title?: string
): Promise<Blob> {
  return Packer.toBlob(buildDocx(markdown, theme, marginPreset, title))
}

export async function mdToDocxBuffer(
  markdown: string,
  theme: ReportTheme = "report",
  marginPreset: MarginPresetId = "very-narrow",
  title?: string
): Promise<Buffer> {
  return Packer.toBuffer(buildDocx(markdown, theme, marginPreset, title))
}

export function getDefaultDocxFileName(filePath: string): string {
  return filePath.replace(/\.md$/i, "") + ".docx"
}

import { marked } from "marked"
import TurndownService from "turndown"
import matter from "gray-matter"

const PAGE_BREAK_TOKEN = "---pb---"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})

turndown.addRule("taskList", {
  filter: (node) => {
    return node.classList?.contains("task-list-item") ?? false
  },
  replacement: (content, node) => {
    const isChecked = (node as HTMLElement).getAttribute("data-checked") === "true"
    return `- [${isChecked ? "x" : " "}] ${content.trim()}\n`
  },
})

turndown.addRule("strikethrough", {
  filter: ["s", "del"],
  replacement: (content) => `~~${content}~~`,
})

// 페이지 분할 노드(pageBreak)를 마크다운 토큰으로 왕복 직렬화
turndown.addRule("pageBreak", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-page-break"),
  replacement: () => `\n${PAGE_BREAK_TOKEN}\n`,
})

marked.use({
  extensions: [
    {
      name: "pagebreak",
      level: "block",
      start(src: string) {
        const i = src.indexOf(PAGE_BREAK_TOKEN)
        return i < 0 ? undefined : i
      },
      tokenizer(src: string) {
        const match = new RegExp(`^${PAGE_BREAK_TOKEN}\\s*(?:\\n|$)`).exec(src)
        if (match) {
          return {
            type: "pagebreak",
            raw: match[0],
          }
        }
      },
      renderer() {
        return '<div data-page-break></div>\n'
      },
    },
  ],
})

export function htmlToMd(html: string): string {
  const md = turndown.turndown(html)
  // HTML에 심어둔 프론트매터(data-frontmatter)를 본문 앞에 재부착
  const match = /<template data-frontmatter="([^"]*)"><\/template>/.exec(html)
  if (match) {
    const fm = decodeURIComponent(match[1]).trim()
    if (fm) return `${fm}\n${md}`
  }
  return md
}

export async function mdToHtml(markdown: string): Promise<string> {
  const { content, data } = matter(markdown)
  const fm = Object.keys(data).length > 0 ? matter.stringify("", data).trim() : ""
  const result = await marked.parse(content, { async: true })
  // 프론트매터 보존: HTML 본문 앞에 숨은 template 노드로 심어둠
  if (fm) {
    return `<template data-frontmatter="${encodeURIComponent(fm)}"></template>${result}`
  }
  return result
}

import matter from "gray-matter"

export type PageMode = "wide" | "ilche" | "bunri"

export function pageModeFromMarkdown(md: string): PageMode {
  try {
    const { data } = matter(md)
    if (data.pageMode === "single") return "ilche"
  } catch {
    // ignore parse errors
  }
  return "bunri"
}

export function pageModeFromHtml(html: string): PageMode {
  const match = /<template data-frontmatter="([^"]*)"><\/template>/.exec(html)
  if (match) {
    try {
      const fm = decodeURIComponent(match[1]).trim()
      const { data } = matter(fm)
      if (data.pageMode === "single") return "ilche"
    } catch {
      // ignore parse errors
    }
  }
  return "bunri"
}


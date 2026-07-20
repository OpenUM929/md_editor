import type { TemplateMeta, TemplateGroup } from "./types"
import { FILE_EXTENSION } from "./constants"
import { addDocumentFromTemplate } from "./fs-access"

type TemplateGroupEntry = {
  topic: string
  displayName: string
  templates: (TemplateMeta & { body: string })[]
}

type TemplatesJson = {
  groups: TemplateGroupEntry[]
}

let cache: TemplatesJson | null = null

export async function getTemplates(): Promise<TemplateGroup[]> {
  const data = await fetchTemplates()
  return data.groups.map((g) => ({
    topic: g.topic,
    displayName: g.displayName,
    templates: g.templates.map((t): TemplateMeta => ({
      title: t.title,
      topic: t.topic,
      description: t.description,
      order: t.order,
      createdAt: t.createdAt,
      slug: t.slug,
      relativePath: t.relativePath,
    })),
  }))
}

export async function getTemplateContent(relativePath: string): Promise<(TemplateMeta & { body: string }) | null> {
  const data = await fetchTemplates()
  for (const group of data.groups) {
    const tmpl = group.templates.find((t) => t.relativePath === relativePath)
    if (tmpl) return tmpl
  }
  return null
}

export async function createFileFromTemplate(
  _root: string,
  templateRelativePath: string,
  fileName: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const detail = await getTemplateContent(templateRelativePath)
    if (!detail) {
      return { success: false, error: "템플릿을 찾을 수 없습니다" }
    }

    const filePath = `${fileName}${FILE_EXTENSION}`
    await addDocumentFromTemplate(filePath, applyDatePlaceholders(detail.body))

    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

function applyDatePlaceholders(body: string): string {
  const now = new Date()
  const date = new Intl.DateTimeFormat("sv", { timeZone: "Asia/Seoul" }).format(now)
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now)
  return body.replaceAll("YYYY-MM-DD", date).replaceAll("HH:MM", time)
}

async function fetchTemplates(): Promise<TemplatesJson> {
  if (cache) return cache
  const res = await fetch("/templates.json")
  if (!res.ok) {
    throw new Error("템플릿을 불러올 수 없습니다")
  }
  const data: TemplatesJson = await res.json()
  cache = data
  return data
}
